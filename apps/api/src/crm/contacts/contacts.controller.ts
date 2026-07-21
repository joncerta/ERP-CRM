import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('crm/contacts')
@RequireModule('crm')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermissions('crm.contacts.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('crm.contacts.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('companyId') companyId?: string) {
    if (companyId) return this.contactsService.findByCompany(user.tenantId, companyId);
    return this.contactsService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('crm.contacts.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('crm.contacts.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.contacts.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.contactsService.removeForTenant(user.tenantId, id);
  }
}
