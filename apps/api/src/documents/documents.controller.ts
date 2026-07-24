import { Body, Controller, Delete, Get, Param, Patch, Post, Query, StreamableFile } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireModule } from '../common/decorators/require-module.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../core/auth/auth.types';

@Controller('documents')
@RequireModule('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @RequirePermissions('documents.files.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  @RequirePermissions('documents.files.read')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('companyId') companyId?: string,
    @Query('contactId') contactId?: string,
    @Query('opportunityId') opportunityId?: string,
  ) {
    return this.documentsService.findFiltered(user.tenantId, { companyId, contactId, opportunityId });
  }

  @Get(':id/download')
  @RequirePermissions('documents.files.read')
  async download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<StreamableFile> {
    const document = await this.documentsService.findOneForTenant(user.tenantId, id);
    const base64 = document.fileData.includes(',') ? document.fileData.slice(document.fileData.indexOf(',') + 1) : document.fileData;
    return new StreamableFile(Buffer.from(base64, 'base64'), {
      type: document.mimeType,
      disposition: `attachment; filename="${document.name}"`,
    });
  }

  @Patch(':id')
  @RequirePermissions('documents.files.write')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('documents.files.write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.documentsService.removeForTenant(user.tenantId, id);
  }
}
