import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';

/** Not gated behind @RequireModule — the tax catalog is core, shared by
 * Cotizaciones (CRM) and Facturas (Facturación), which are themselves
 * separately activable modules. Same treatment as Currencies. */
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post()
  @RequirePermissions('core.taxes.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaxDto) {
    return this.taxesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.taxes.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.taxesService.findPaginated(user.tenantId, query);
    return this.taxesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('core.taxes.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxesService.update(user.tenantId, id, dto);
  }
}
