import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FixedAsset, FixedAssetStatus } from './entities/fixed-asset.entity';
import { FixedAssetMovement, FixedAssetMovementType } from './entities/fixed-asset-movement.entity';
import { FixedAssetDepreciationEntry } from './entities/fixed-asset-depreciation-entry.entity';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import { TransferFixedAssetDto } from './dto/transfer-fixed-asset.dto';
import { RecordMaintenanceDto } from './dto/record-maintenance.dto';
import { DisposeFixedAssetDto } from './dto/dispose-fixed-asset.dto';
import { ListFixedAssetsQueryDto } from './dto/list-fixed-assets-query.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';
import { Paginated } from '../../common/pagination/pagination.types';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { AccountingService } from '../accounting/accounting.service';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Normalizes any date within a month to that month's first day — the
 * granularity depreciation runs and lastDepreciatedPeriod compare at. */
function toPeriod(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

@Injectable()
export class FixedAssetsService extends TenantScopedService<FixedAsset> {
  constructor(
    @InjectRepository(FixedAsset) repo: Repository<FixedAsset>,
    @InjectRepository(FixedAssetMovement) private readonly movementsRepo: Repository<FixedAssetMovement>,
    @InjectRepository(FixedAssetDepreciationEntry) private readonly depreciationEntriesRepo: Repository<FixedAssetDepreciationEntry>,
    private readonly documentSeriesService: DocumentSeriesService,
    private readonly accountingService: AccountingService,
  ) {
    super(repo);
  }

  private nextAssetNumber(tenantId: string): Promise<string> {
    return this.documentSeriesService.consumeNext(tenantId, 'fixed_asset');
  }

  findPaginated(tenantId: string, query: ListFixedAssetsQueryDto): Promise<Paginated<FixedAsset>> {
    return this.findPaginatedForTenant(tenantId, query, {
      alias: 'asset',
      searchColumns: ['assetNumber', 'name'],
      sortableColumns: ['assetNumber', 'name', 'purchaseDate', 'purchaseCost', 'status'],
      defaultSortBy: 'assetNumber',
      applyFilters: (qb) => {
        if (query.status) qb.andWhere('asset.status = :status', { status: query.status });
        if (query.responsibleUserId) qb.andWhere('asset.responsibleUserId = :responsibleUserId', { responsibleUserId: query.responsibleUserId });
        if (query.locationBranchId) qb.andWhere('asset.locationBranchId = :locationBranchId', { locationBranchId: query.locationBranchId });
      },
    });
  }

  async create(tenantId: string, dto: CreateFixedAssetDto): Promise<FixedAsset> {
    if ((dto.salvageValue ?? 0) >= dto.purchaseCost) {
      throw new BadRequestException('El valor residual debe ser menor al costo de compra');
    }
    const asset = this.repository.create({
      tenantId,
      assetNumber: await this.nextAssetNumber(tenantId),
      name: dto.name,
      description: dto.description ?? null,
      purchaseDate: dto.purchaseDate,
      purchaseCost: dto.purchaseCost,
      usefulLifeMonths: dto.usefulLifeMonths,
      salvageValue: dto.salvageValue ?? 0,
      accumulatedDepreciation: 0,
      status: FixedAssetStatus.ACTIVE,
      locationBranchId: dto.locationBranchId ?? null,
      responsibleUserId: dto.responsibleUserId ?? null,
      lastDepreciatedPeriod: null,
    });
    return this.repository.save(asset);
  }

  async update(tenantId: string, id: string, dto: UpdateFixedAssetDto): Promise<FixedAsset> {
    const asset = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) asset.name = dto.name;
    if (dto.description !== undefined) asset.description = dto.description;
    if (dto.locationBranchId !== undefined) asset.locationBranchId = dto.locationBranchId;
    if (dto.responsibleUserId !== undefined) asset.responsibleUserId = dto.responsibleUserId;
    return this.repository.save(asset);
  }

  async transfer(tenantId: string, userId: string, id: string, dto: TransferFixedAssetDto): Promise<FixedAsset> {
    const asset = await this.findOneForTenant(tenantId, id);
    if (asset.status === FixedAssetStatus.DISPOSED) {
      throw new BadRequestException('No se puede trasladar un activo dado de baja');
    }
    const fromBranchId = asset.locationBranchId;
    asset.locationBranchId = dto.toBranchId;
    const saved = await this.repository.save(asset);

    await this.movementsRepo.save(
      this.movementsRepo.create({
        tenantId,
        fixedAssetId: id,
        type: FixedAssetMovementType.TRANSFER,
        date: new Date().toISOString().slice(0, 10),
        note: dto.note ?? null,
        cost: null,
        fromBranchId,
        toBranchId: dto.toBranchId,
        createdByUserId: userId,
      }),
    );
    return saved;
  }

  async recordMaintenance(tenantId: string, userId: string, id: string, dto: RecordMaintenanceDto): Promise<FixedAssetMovement> {
    const asset = await this.findOneForTenant(tenantId, id);
    if (asset.status === FixedAssetStatus.DISPOSED) {
      throw new BadRequestException('No se puede registrar mantenimiento de un activo dado de baja');
    }
    return this.movementsRepo.save(
      this.movementsRepo.create({
        tenantId,
        fixedAssetId: id,
        type: FixedAssetMovementType.MAINTENANCE,
        date: dto.date,
        note: dto.note ?? null,
        cost: dto.cost ?? null,
        fromBranchId: null,
        toBranchId: null,
        createdByUserId: userId,
      }),
    );
  }

  async dispose(tenantId: string, userId: string, id: string, dto: DisposeFixedAssetDto): Promise<FixedAsset> {
    const asset = await this.findOneForTenant(tenantId, id);
    if (asset.status === FixedAssetStatus.DISPOSED) {
      throw new BadRequestException('Este activo ya fue dado de baja');
    }
    const bookValue = round2(Number(asset.purchaseCost) - Number(asset.accumulatedDepreciation));
    asset.status = FixedAssetStatus.DISPOSED;
    const saved = await this.repository.save(asset);

    await this.movementsRepo.save(
      this.movementsRepo.create({
        tenantId,
        fixedAssetId: id,
        type: FixedAssetMovementType.DISPOSAL,
        date: dto.date,
        note: dto.note ?? null,
        cost: null,
        fromBranchId: null,
        toBranchId: null,
        createdByUserId: userId,
      }),
    );

    await this.accountingService.postAssetDisposal(tenantId, userId, {
      assetId: saved.id,
      assetNumber: saved.assetNumber,
      date: dto.date,
      cost: Number(saved.purchaseCost),
      accumulatedDepreciation: Number(saved.accumulatedDepreciation),
      bookValue,
    });

    return saved;
  }

  findMovements(tenantId: string, fixedAssetId: string): Promise<FixedAssetMovement[]> {
    return this.movementsRepo.find({ where: { tenantId, fixedAssetId }, order: { date: 'DESC' } });
  }

  findDepreciationEntries(tenantId: string, fixedAssetId: string): Promise<FixedAssetDepreciationEntry[]> {
    return this.depreciationEntriesRepo.find({ where: { tenantId, fixedAssetId }, order: { period: 'DESC' } });
  }

  /** Manual action a person triggers once per period (there's no scheduler
   * to fire it automatically) — depreciates every active/under-maintenance
   * asset not yet processed for this period, skipping anything already
   * fully depreciated or already run for this exact period (idempotent:
   * calling it twice for the same period is a no-op the second time). */
  async runDepreciation(tenantId: string, userId: string, periodInput: string): Promise<{ assetsDepreciated: number; totalAmount: number }> {
    const period = toPeriod(periodInput);
    const assets = await this.repository.find({
      where: { tenantId },
    });

    let totalAmount = 0;
    let assetsDepreciated = 0;

    for (const asset of assets) {
      if (asset.status === FixedAssetStatus.DISPOSED) continue;
      if (asset.lastDepreciatedPeriod && asset.lastDepreciatedPeriod >= period) continue;

      const depreciableBase = round2(Number(asset.purchaseCost) - Number(asset.salvageValue));
      const monthlyAmount = round2(depreciableBase / asset.usefulLifeMonths);
      const remaining = round2(depreciableBase - Number(asset.accumulatedDepreciation));
      const amount = Math.min(monthlyAmount, remaining);
      if (amount <= 0) continue;

      asset.accumulatedDepreciation = round2(Number(asset.accumulatedDepreciation) + amount);
      asset.lastDepreciatedPeriod = period;
      await this.repository.save(asset);

      await this.depreciationEntriesRepo.save(
        this.depreciationEntriesRepo.create({
          tenantId,
          fixedAssetId: asset.id,
          period,
          amount,
          accumulatedAfter: asset.accumulatedDepreciation,
        }),
      );

      totalAmount = round2(totalAmount + amount);
      assetsDepreciated += 1;
    }

    if (totalAmount > 0) {
      await this.accountingService.postDepreciationRun(tenantId, userId, { period, totalAmount, assetCount: assetsDepreciated });
    }

    return { assetsDepreciated, totalAmount };
  }
}
