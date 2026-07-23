import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { NotificationEscalationService } from './notification-escalation.service';
import { SessionsModule } from '../sessions/sessions.module';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), SessionsModule, NotificationsModule],
  providers: [UsersService, NotificationEscalationService],
  controllers: [UsersController],
  exports: [UsersService, NotificationEscalationService],
})
export class UsersModule {}
