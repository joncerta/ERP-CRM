import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CreateCommunicationLogDto } from './dto/create-communication-log.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('communications')
@RequireModule('documents')
export class CommunicationsController {
  constructor(private readonly communicationsService: CommunicationsService) {}

  @Post()
  @RequirePermissions('documents.communications.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCommunicationLogDto) {
    return this.communicationsService.create(user.tenantId, user.userId, dto);
  }

  @Get('by-contact/:contactId')
  @RequirePermissions('documents.communications.read')
  findByContact(@CurrentUser() user: AuthenticatedUser, @Param('contactId') contactId: string) {
    return this.communicationsService.findByContact(user.tenantId, contactId);
  }
}
