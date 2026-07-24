import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { DraftDto } from './dto/draft.dto';
import { SummarizeDto } from './dto/summarize.dto';
import { LeadScoreDto } from './dto/lead-score.dto';
import { AssistantDto } from './dto/assistant.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('ai')
@RequireModule('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('draft')
  @RequirePermissions('ai.drafts.use')
  draft(@CurrentUser() user: AuthenticatedUser, @Body() dto: DraftDto) {
    return this.aiService.draft(user.tenantId, dto);
  }

  @Post('summarize')
  @RequirePermissions('ai.summaries.use')
  summarize(@CurrentUser() user: AuthenticatedUser, @Body() dto: SummarizeDto) {
    return this.aiService.summarize(user.tenantId, dto);
  }

  @Post('lead-score')
  @RequirePermissions('ai.lead_scoring.use')
  scoreLead(@CurrentUser() user: AuthenticatedUser, @Body() dto: LeadScoreDto) {
    return this.aiService.scoreLead(user.tenantId, dto);
  }

  @Post('assistant')
  @RequirePermissions('ai.assistant.use')
  assistant(@CurrentUser() user: AuthenticatedUser, @Body() dto: AssistantDto) {
    return this.aiService.assistant(user.tenantId, dto);
  }
}
