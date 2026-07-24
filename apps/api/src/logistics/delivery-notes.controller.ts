import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DeliveryNotesService } from './delivery-notes.service';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { UpdateDeliveryNoteDto } from './dto/update-delivery-note.dto';
import { DeliverDeliveryNoteDto } from './dto/deliver-delivery-note.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('logistics/delivery-notes')
@RequireModule('logistics')
export class DeliveryNotesController {
  constructor(private readonly deliveryNotesService: DeliveryNotesService) {}

  @Post()
  @RequirePermissions('logistics.delivery_notes.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDeliveryNoteDto) {
    return this.deliveryNotesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('logistics.delivery_notes.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.deliveryNotesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('logistics.delivery_notes.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDeliveryNoteDto) {
    return this.deliveryNotesService.update(user.tenantId, id, dto);
  }

  @Patch(':id/dispatch')
  @RequirePermissions('logistics.delivery_notes.write')
  dispatch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveryNotesService.dispatch(user.tenantId, user.userId, id);
  }

  @Patch(':id/deliver')
  @RequirePermissions('logistics.delivery_notes.write')
  markDelivered(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DeliverDeliveryNoteDto) {
    return this.deliveryNotesService.markDelivered(user.tenantId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('logistics.delivery_notes.write')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.deliveryNotesService.cancel(user.tenantId, id);
  }
}
