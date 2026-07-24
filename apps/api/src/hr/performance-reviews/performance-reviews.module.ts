import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceReview } from './entities/performance-review.entity';
import { PerformanceReviewsService } from './performance-reviews.service';
import { PerformanceReviewsController } from './performance-reviews.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PerformanceReview])],
  providers: [PerformanceReviewsService],
  controllers: [PerformanceReviewsController],
  exports: [PerformanceReviewsService],
})
export class PerformanceReviewsModule {}
