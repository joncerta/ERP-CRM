import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceReview, PerformanceReviewStatus, ScoredItem } from './entities/performance-review.entity';
import { CreatePerformanceReviewDto } from './dto/create-performance-review.dto';
import { UpdatePerformanceReviewDto } from './dto/update-performance-review.dto';
import { TenantScopedService } from '../../common/services/tenant-scoped.service';

function averageScore(objectives: ScoredItem[], competencies: ScoredItem[]): number {
  const scores = [...objectives, ...competencies].map((i) => i.score);
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100) / 100;
}

@Injectable()
export class PerformanceReviewsService extends TenantScopedService<PerformanceReview> {
  constructor(@InjectRepository(PerformanceReview) repo: Repository<PerformanceReview>) {
    super(repo);
  }

  create(tenantId: string, reviewerUserId: string, dto: CreatePerformanceReviewDto): Promise<PerformanceReview> {
    const review = this.repository.create({
      tenantId,
      employeeId: dto.employeeId,
      reviewerUserId,
      periodLabel: dto.periodLabel,
      objectives: dto.objectives,
      competencies: dto.competencies,
      comments: dto.comments ?? null,
      status: PerformanceReviewStatus.DRAFT,
    });
    return this.repository.save(review);
  }

  async update(tenantId: string, id: string, dto: UpdatePerformanceReviewDto): Promise<PerformanceReview> {
    const review = await this.findOneForTenant(tenantId, id);
    if (review.status !== PerformanceReviewStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden editar evaluaciones en borrador');
    }
    Object.assign(review, dto);
    return this.repository.save(review);
  }

  async submit(tenantId: string, id: string): Promise<PerformanceReview> {
    const review = await this.findOneForTenant(tenantId, id);
    if (review.status !== PerformanceReviewStatus.DRAFT) {
      throw new BadRequestException('Esta evaluación ya fue enviada');
    }
    review.overallScore = averageScore(review.objectives, review.competencies);
    review.status = PerformanceReviewStatus.SUBMITTED;
    review.submittedAt = new Date();
    return this.repository.save(review);
  }

  findForEmployee(tenantId: string, employeeId: string): Promise<PerformanceReview[]> {
    return this.repository.find({ where: { tenantId, employeeId }, order: { createdAt: 'DESC' } });
  }
}
