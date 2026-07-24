import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PerformanceReviewsService } from './performance-reviews.service';
import { PerformanceReview, PerformanceReviewStatus } from './entities/performance-review.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'review-1', ...data })),
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<PerformanceReview>>;
  return { repo };
}

function buildService() {
  const deps = buildDeps();
  const service = new PerformanceReviewsService(deps.repo);
  return { service, ...deps };
}

describe('PerformanceReviewsService', () => {
  describe('submit', () => {
    it('averages objective and competency scores into overallScore and locks the review', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({
        id: 'review-1',
        tenantId: 'tenant-a',
        status: PerformanceReviewStatus.DRAFT,
        objectives: [{ description: 'Ventas Q3', score: 4 }, { description: 'Onboarding', score: 5 }],
        competencies: [{ description: 'Comunicación', score: 3 }],
      } as PerformanceReview);

      const submitted = await service.submit('tenant-a', 'review-1');

      expect(submitted.overallScore).toBe(4);
      expect(submitted.status).toBe(PerformanceReviewStatus.SUBMITTED);
      expect(submitted.submittedAt).toBeInstanceOf(Date);
    });

    it('refuses to re-submit an already-submitted review', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'review-1', tenantId: 'tenant-a', status: PerformanceReviewStatus.SUBMITTED } as PerformanceReview);

      await expect(service.submit('tenant-a', 'review-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('refuses to edit a review that was already submitted', async () => {
      const { service, repo } = buildService();
      repo.findOne.mockResolvedValue({ id: 'review-1', tenantId: 'tenant-a', status: PerformanceReviewStatus.SUBMITTED } as PerformanceReview);

      await expect(service.update('tenant-a', 'review-1', { periodLabel: '2026-S2' })).rejects.toThrow(BadRequestException);
    });
  });
});
