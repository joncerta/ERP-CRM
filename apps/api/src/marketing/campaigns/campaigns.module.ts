import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignRecipient } from './entities/campaign-recipient.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { ContactsModule } from '../../crm/contacts/contacts.module';
import { EmailModule } from '../../common/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, CampaignRecipient]), ContactsModule, EmailModule],
  providers: [CampaignsService],
  controllers: [CampaignsController],
  exports: [CampaignsService],
})
export class CampaignsModule {}
