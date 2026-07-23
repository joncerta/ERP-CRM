import { Repository } from 'typeorm';
import { DocumentSeriesService } from './document-series.service';
import { DocumentSeries } from './entities/document-series.entity';

function buildRepoMock(seriesRepoOverrides: Partial<jest.Mocked<Repository<DocumentSeries>>> = {}) {
  const seriesRepo = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
    ...seriesRepoOverrides,
  } as unknown as jest.Mocked<Repository<DocumentSeries>>;

  const manager = { getRepository: jest.fn().mockReturnValue(seriesRepo) };
  const repo = {
    manager: { transaction: jest.fn((fn: (m: unknown) => unknown) => fn(manager)) },
  } as unknown as jest.Mocked<Repository<DocumentSeries>>;

  return { repo, seriesRepo };
}

describe('DocumentSeriesService', () => {
  describe('consumeNext', () => {
    it('auto-provisions the tenant-wide default series on first use', async () => {
      const { repo, seriesRepo } = buildRepoMock();
      seriesRepo.findOne.mockResolvedValue(null);
      const service = new DocumentSeriesService(repo);

      const number = await service.consumeNext('tenant-a', 'quote');

      expect(number).toBe('COT-000001');
      expect(seriesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'tenant-a', documentType: 'quote', branchId: null, nextNumber: 2 }),
      );
    });

    it('increments an existing series and formats with its own prefix/padding', async () => {
      const { repo, seriesRepo } = buildRepoMock();
      seriesRepo.findOne.mockResolvedValue({
        tenantId: 'tenant-a',
        documentType: 'quote',
        branchId: null,
        prefix: 'FAC',
        nextNumber: 42,
        padding: 4,
      } as DocumentSeries);
      const service = new DocumentSeriesService(repo);

      const number = await service.consumeNext('tenant-a', 'quote');

      expect(number).toBe('FAC-0042');
      expect(seriesRepo.save).toHaveBeenCalledWith(expect.objectContaining({ nextNumber: 43 }));
    });

    it('prefers a branch-specific series over the tenant-wide default', async () => {
      const { repo, seriesRepo } = buildRepoMock();
      seriesRepo.findOne.mockResolvedValueOnce({
        tenantId: 'tenant-a',
        documentType: 'quote',
        branchId: 'branch-1',
        prefix: 'COT-N',
        nextNumber: 1,
        padding: 6,
      } as DocumentSeries);
      const service = new DocumentSeriesService(repo);

      const number = await service.consumeNext('tenant-a', 'quote', 'branch-1');

      expect(number).toBe('COT-N-000001');
      expect(seriesRepo.findOne).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-a', documentType: 'quote', branchId: 'branch-1' },
      });
    });

    it('falls back to the tenant-wide default when the branch has no series of its own', async () => {
      const { repo, seriesRepo } = buildRepoMock();
      seriesRepo.findOne
        .mockResolvedValueOnce(null) // branch-specific lookup misses
        .mockResolvedValueOnce({
          tenantId: 'tenant-a',
          documentType: 'quote',
          branchId: null,
          prefix: 'COT',
          nextNumber: 5,
          padding: 6,
        } as DocumentSeries);
      const service = new DocumentSeriesService(repo);

      const number = await service.consumeNext('tenant-a', 'quote', 'branch-1');

      expect(number).toBe('COT-000005');
    });
  });
});
