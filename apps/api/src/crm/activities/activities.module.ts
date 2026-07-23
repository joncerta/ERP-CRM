import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './entities/activity.entity';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { UsersModule } from '../../core/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Activity]), UsersModule],
  providers: [ActivitiesService],
  controllers: [ActivitiesController],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
