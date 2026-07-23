import { Module } from '@nestjs/common';
import { CampaignsModule } from './campaigns/campaigns.module';
import { LandingFormsModule } from './landing-forms/landing-forms.module';
import { NurtureModule } from './nurture/nurture.module';
import { SegmentsModule } from './segments/segments.module';

@Module({
  imports: [CampaignsModule, LandingFormsModule, NurtureModule, SegmentsModule],
})
export class MarketingModule {}
