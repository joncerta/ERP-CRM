import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { CommunicationLogEntry } from './entities/communication-log-entry.entity';
import { DocumentsService } from './documents.service';
import { CommunicationsService } from './communications.service';
import { DocumentsController } from './documents.controller';
import { CommunicationsController } from './communications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Document, CommunicationLogEntry])],
  providers: [DocumentsService, CommunicationsService],
  controllers: [DocumentsController, CommunicationsController],
  exports: [DocumentsService, CommunicationsService],
})
export class DocumentsModule {}
