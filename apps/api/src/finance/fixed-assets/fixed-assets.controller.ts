import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FixedAssetsService } from './fixed-assets.service';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { TransferFixedAssetDto } from './dto/transfer-fixed-asset.dto';
import { RecordMaintenanceDto } from './dto/record-maintenance.dto';
import { DisposeFixedAssetDto } from './dto/dispose-fixed-asset.dto';
import { RunDepreciationDto } from './dto/run-depreciation.dto';
import { ListFixedAssetsQueryDto } from './dto/list-fixed-assets-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('finance/fixed-assets')
@RequireModule('fixed_assets')
export class FixedAssetsController {
  constructor(private readonly fixedAssetsService: FixedAssetsService) {}

  @Post()
  @RequirePermissions('fixed_assets.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFixedAssetDto) {
    return this.fixedAssetsService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('fixed_assets.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListFixedAssetsQueryDto) {
    if (query.page) return this.fixedAssetsService.findPaginated(user.tenantId, query);
    return this.fixedAssetsService.findAllForTenant(user.tenantId);
  }

  @Post('run-depreciation')
  @RequirePermissions('fixed_assets.write')
  runDepreciation(@CurrentUser() user: AuthenticatedUser, @Body() dto: RunDepreciationDto) {
    return this.fixedAssetsService.runDepreciation(user.tenantId, user.userId, dto.period);
  }

  @Get(':id')
  @RequirePermissions('fixed_assets.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fixedAssetsService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('fixed_assets.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateFixedAssetDto) {
    return this.fixedAssetsService.update(user.tenantId, id, dto);
  }

  @Post(':id/transfer')
  @RequirePermissions('fixed_assets.write')
  transfer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: TransferFixedAssetDto) {
    return this.fixedAssetsService.transfer(user.tenantId, user.userId, id, dto);
  }

  @Post(':id/maintenance')
  @RequirePermissions('fixed_assets.write')
  recordMaintenance(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: RecordMaintenanceDto) {
    return this.fixedAssetsService.recordMaintenance(user.tenantId, user.userId, id, dto);
  }

  @Post(':id/dispose')
  @RequirePermissions('fixed_assets.write')
  dispose(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DisposeFixedAssetDto) {
    return this.fixedAssetsService.dispose(user.tenantId, user.userId, id, dto);
  }

  @Get(':id/movements')
  @RequirePermissions('fixed_assets.read')
  findMovements(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fixedAssetsService.findMovements(user.tenantId, id);
  }

  @Get(':id/depreciation-entries')
  @RequirePermissions('fixed_assets.read')
  findDepreciationEntries(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.fixedAssetsService.findDepreciationEntries(user.tenantId, id);
  }
}
