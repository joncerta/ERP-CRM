import { Module } from '@nestjs/common';
import { TicketsModule } from './tickets/tickets.module';
import { KnowledgeModule } from './knowledge/knowledge.module';

@Module({
  imports: [TicketsModule, KnowledgeModule],
})
export class SupportModule {}
