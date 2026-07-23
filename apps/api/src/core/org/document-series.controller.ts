import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentSeriesService } from './document-series.service';
import { CreateDocumentSeriesDto } from './dto/create-document-series.dto';
import { UpdateDocumentSeriesDto } from './dto/update-document-series.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@Controller('org/document-series')
export class DocumentSeriesController {
  constructor(private readonly documentSeriesService: DocumentSeriesService) {}

  @Post()
  @RequirePermissions('core.org.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDocumentSeriesDto) {
    return this.documentSeriesService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('core.org.read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListQueryDto) {
    if (query.page) return this.documentSeriesService.findPaginated(user.tenantId, query);
    return this.documentSeriesService.findAllForTenant(user.tenantId);
  }

  @Patch(':id')
  @RequirePermissions('core.org.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDocumentSeriesDto) {
    return this.documentSeriesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('core.org.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentSeriesService.remove(user.tenantId, id);
  }
}
