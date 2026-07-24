import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { TenantScopedService } from '../common/services/tenant-scoped.service';

interface DocumentFilters {
  companyId?: string;
  contactId?: string;
  opportunityId?: string;
}

@Injectable()
export class DocumentsService extends TenantScopedService<Document> {
  constructor(@InjectRepository(Document) repo: Repository<Document>) {
    super(repo);
  }

  create(tenantId: string, uploadedByUserId: string, dto: CreateDocumentDto): Promise<Document> {
    const document = this.repository.create({
      tenantId,
      name: dto.name,
      category: dto.category,
      mimeType: dto.mimeType,
      fileData: dto.fileData,
      fileSize: base64DataUriSize(dto.fileData),
      companyId: dto.companyId ?? null,
      contactId: dto.contactId ?? null,
      opportunityId: dto.opportunityId ?? null,
      uploadedByUserId,
    });
    return this.repository.save(document);
  }

  async update(tenantId: string, id: string, dto: UpdateDocumentDto): Promise<Document> {
    const document = await this.findOneForTenant(tenantId, id);
    if (dto.name !== undefined) document.name = dto.name;
    if (dto.category !== undefined) document.category = dto.category;
    return this.repository.save(document);
  }

  /** Metadata only — omits fileData so listing a company/contact's
   * documents doesn't ship every file's full base64 payload over the wire. */
  findFiltered(tenantId: string, filters: DocumentFilters): Promise<Document[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.opportunityId) where.opportunityId = filters.opportunityId;
    return this.repository.find({
      where,
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        category: true,
        mimeType: true,
        fileSize: true,
        companyId: true,
        contactId: true,
        opportunityId: true,
        uploadedByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

/** Decoded byte size of a base64 data URI (`data:<mime>;base64,<payload>`),
 * without actually allocating a Buffer for it. */
function base64DataUriSize(dataUri: string): number {
  const payload = dataUri.includes(',') ? dataUri.slice(dataUri.indexOf(',') + 1) : dataUri;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}
