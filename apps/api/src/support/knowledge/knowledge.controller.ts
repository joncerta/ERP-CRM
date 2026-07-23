import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('support/knowledge-articles')
@RequireModule('customer_service')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  @RequirePermissions('support.knowledge.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateArticleDto) {
    return this.knowledgeService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('support.knowledge.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.knowledgeService.findPaginated(user.tenantId, query);
    return this.knowledgeService.findAllForTenant(user.tenantId);
  }

  @Get('suggest')
  @RequirePermissions('support.knowledge.read')
  suggest(@CurrentUser() user: AuthenticatedUser, @Query('q') q: string) {
    return this.knowledgeService.suggestArticles(user.tenantId, q ?? '');
  }

  @Get(':id')
  @RequirePermissions('support.knowledge.read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.knowledgeService.findOneForTenant(user.tenantId, id);
  }

  @Patch(':id')
  @RequirePermissions('support.knowledge.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.knowledgeService.update(user.tenantId, id, dto);
  }

  @Patch(':id/view')
  @RequirePermissions('support.knowledge.read')
  recordView(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.knowledgeService.recordView(user.tenantId, id);
  }
}
