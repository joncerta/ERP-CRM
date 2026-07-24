import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { PublicApiController } from './public-api.controller';
import { ApiKeyGuard } from './api-key.guard';
import { LeadsModule } from '../crm/leads/leads.module';
import { ContactsModule } from '../crm/contacts/contacts.module';
import { InvoicesModule } from '../finance/invoices/invoices.module';
import { ModulesCatalogModule } from '../core/modules-catalog/modules-catalog.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), LeadsModule, ContactsModule, InvoicesModule, ModulesCatalogModule],
  providers: [ApiKeysService, ApiKeyGuard],
  controllers: [ApiKeysController, PublicApiController],
  exports: [ApiKeysService],
})
export class IntegrationsModule {}
