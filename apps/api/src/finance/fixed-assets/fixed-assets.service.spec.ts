import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { FixedAssetsService } from './fixed-assets.service';
import { FixedAsset, FixedAssetStatus } from './entities/fixed-asset.entity';
import { FixedAssetMovement } from './entities/fixed-asset-movement.entity';
import { FixedAssetDepreciationEntry } from './entities/fixed-asset-depreciation-entry.entity';
import { DocumentSeriesService } from '../../core/org/document-series.service';
import { AccountingService } from '../accounting/accounting.service';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'asset-1', ...data })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<FixedAsset>>;
  const movementsRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'movement-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<FixedAssetMovement>>;
  const depreciationEntriesRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: 'depr-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<FixedAssetDepreciationEntry>>;
  const documentSeriesService = {
    consumeNext: jest.fn().mockResolvedValue('AF-000001'),
  } as unknown as jest.Mocked<DocumentSeriesService>;
  const accountingService = {
    postDepreciationRun: jest.fn().mockResolvedValue(undefined),
    postAssetDisposal: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AccountingService>;
  return { repo, movementsRepo, depreciationEntriesRepo, documentSeriesService, accountingService };
}

function buildService() {
  const deps = buildDeps();
  const service = new FixedAssetsService(
    deps.repo,
    deps.movementsRepo,
    deps.depreciationEntriesRepo,
    deps.documentSeriesService,
    deps.accountingService,
  );
  return { service, ...deps };
}

describe('FixedAssetsService', () => {
  describe('create', () => {
    it('refuses a salvage value greater than or equal to the purchase cost', async () => {
      const { service } = buildService();

      await expect(
        service.create('tenant-a', {
          name: 'Camioneta',
          purchaseDate: '2026-01-01',
          purchaseCost: 1000,
          usefulLifeMonths: 12,
          salvageValue: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('claims a number from the document series and starts with zero accumulated depreciation', async () => {
      const { service, documentSeriesService } = buildService();

      const asset = await service.create('tenant-a', {
        name: 'Camioneta',
        purchaseDate: '2026-01-01',
        purchaseCost: 12000,
        usefulLifeMonths: 12,
        salvageValue: 0,
      });

      expect(documentSeriesService.consumeNext).toHaveBeenCalledWith('tenant-a', 'fixed_asset');
      expect(asset).toMatchObject({ assetNumber: 'AF-000001', accumulatedDepreciation: 0, status: FixedAssetStatus.ACTIVE });
    });
  });

  describe('runDepreciation', () => {
    function assetFixture(overrides: Partial<FixedAsset> = {}): FixedAsset {
      return {
        id: 'asset-1',
        tenantId: 'tenant-a',
        assetNumber: 'AF-000001',
        purchaseCost: 12000,
        usefulLifeMonths: 12,
        salvageValue: 0,
        accumulatedDepreciation: 0,
        status: FixedAssetStatus.ACTIVE,
        lastDepreciatedPeriod: null,
        ...overrides,
      } as FixedAsset;
    }

    it('depreciates straight-line and posts one consolidated entry', async () => {
      const { service, repo, accountingService } = buildService();
      repo.find.mockResolvedValue([assetFixture()]);

      const result = await service.runDepreciation('tenant-a', 'user-1', '2026-07-15');

      expect(result).toEqual({ assetsDepreciated: 1, totalAmount: 1000 });
      expect(accountingService.postDepreciationRun).toHaveBeenCalledWith('tenant-a', 'user-1', {
        period: '2026-07-01',
        totalAmount: 1000,
        assetCount: 1,
      });
    });

    it('is idempotent for the same period — running it twice does not double-count', async () => {
      const { service, repo, accountingService } = buildService();
      repo.find.mockResolvedValue([assetFixture({ lastDepreciatedPeriod: '2026-07-01', accumulatedDepreciation: 1000 })]);

      const result = await service.runDepreciation('tenant-a', 'user-1', '2026-07-20');

      expect(result).toEqual({ assetsDepreciated: 0, totalAmount: 0 });
      expect(accountingService.postDepreciationRun).not.toHaveBeenCalled();
    });

    it('caps the last period at the remaining depreciable base instead of overshooting', async () => {
      const { service, repo } = buildService();
      repo.find.mockResolvedValue([assetFixture({ accumulatedDepreciation: 11500 })]);

      const result = await service.runDepreciation('tenant-a', 'user-1', '2026-12-01');

      expect(result).toEqual({ assetsDepreciated: 1, totalAmount: 500 });
    });

    it('skips disposed assets', async () => {
      const { service, repo, accountingService } = buildService();
      repo.find.mockResolvedValue([assetFixture({ status: FixedAssetStatus.DISPOSED })]);

      const result = await service.runDepreciation('tenant-a', 'user-1', '2026-07-01');

      expect(result).toEqual({ assetsDepreciated: 0, totalAmount: 0 });
      expect(accountingService.postDepreciationRun).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('refuses to dispose an asset twice', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'asset-1', tenantId: 'tenant-a', status: FixedAssetStatus.DISPOSED } as FixedAsset);

      await expect(service.dispose('tenant-a', 'user-1', 'asset-1', { date: '2026-07-01' })).rejects.toThrow(BadRequestException);
    });

    it('posts the write-off with the correct book value', async () => {
      const { service, repo, accountingService } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'asset-1',
        tenantId: 'tenant-a',
        assetNumber: 'AF-000001',
        purchaseCost: 12000,
        accumulatedDepreciation: 8000,
        status: FixedAssetStatus.ACTIVE,
      } as FixedAsset);

      await service.dispose('tenant-a', 'user-1', 'asset-1', { date: '2026-07-01' });

      expect(accountingService.postAssetDisposal).toHaveBeenCalledWith('tenant-a', 'user-1', {
        assetId: 'asset-1',
        assetNumber: 'AF-000001',
        date: '2026-07-01',
        cost: 12000,
        accumulatedDepreciation: 8000,
        bookValue: 4000,
      });
    });
  });

  describe('transfer', () => {
    it('refuses to transfer a disposed asset', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'asset-1', tenantId: 'tenant-a', status: FixedAssetStatus.DISPOSED } as FixedAsset);

      await expect(service.transfer('tenant-a', 'user-1', 'asset-1', { toBranchId: 'branch-2' })).rejects.toThrow(BadRequestException);
    });
  });
});
