import { Repository } from 'typeorm';
import { DocumentsService } from './documents.service';
import { Document, DocumentCategory } from './entities/document.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'doc-1', ...data })),
  } as unknown as jest.Mocked<Repository<Document>>;
  return { repo };
}

function buildService() {
  const deps = buildDeps();
  const service = new DocumentsService(deps.repo);
  return { service, ...deps };
}

describe('DocumentsService', () => {
  describe('create', () => {
    it('computes the decoded byte size of the base64 file data', async () => {
      const { service } = buildService();
      // "hello world" (11 bytes) base64-encoded, with a data URI prefix.
      const fileData = `data:text/plain;base64,${Buffer.from('hello world').toString('base64')}`;

      const doc = await service.create('tenant-a', 'user-1', {
        name: 'greeting.txt',
        category: DocumentCategory.OTHER,
        mimeType: 'text/plain',
        fileData,
      } as never);

      expect(doc).toMatchObject({ fileSize: 11, uploadedByUserId: 'user-1', tenantId: 'tenant-a' });
    });

    it('defaults optional links to null', async () => {
      const { service } = buildService();
      const fileData = `data:text/plain;base64,${Buffer.from('x').toString('base64')}`;

      const doc = await service.create('tenant-a', 'user-1', {
        name: 'x.txt',
        mimeType: 'text/plain',
        fileData,
      } as never);

      expect(doc).toMatchObject({ companyId: null, contactId: null, opportunityId: null });
    });
  });
});
