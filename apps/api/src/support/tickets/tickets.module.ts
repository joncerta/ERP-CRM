import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketComment } from './entities/ticket-comment.entity';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { TicketsPublicController } from './tickets-public.controller';
import { OrgModule } from '../../core/org/org.module';
import { UsersModule } from '../../core/users/users.module';
import { TenantsModule } from '../../core/tenants/tenants.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketComment]), OrgModule, UsersModule, TenantsModule],
  providers: [TicketsService],
  controllers: [TicketsController, TicketsPublicController],
  exports: [TicketsService],
})
export class TicketsModule {}
