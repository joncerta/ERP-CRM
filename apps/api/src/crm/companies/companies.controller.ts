import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('crm/companies')
@RequireModule('crm')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @RequirePermissions('crm.contacts.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('crm.contacts.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.findAllForTenant(user.tenantId);
  }

  @Get(':id')
  @RequirePermissions('crm.contacts.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.companiesService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('crm.contacts.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('crm.contacts.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.companiesService.removeForTenant(user.tenantId, id);
  }
}
