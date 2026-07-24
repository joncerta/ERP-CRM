import { Repository } from 'typeorm';
import { CommunicationsService } from './communications.service';
import { CommunicationChannel, CommunicationDirection, CommunicationLogEntry } from './entities/communication-log-entry.entity';

function buildDeps() {
  const repo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => ({ id: data.id ?? 'entry-1', ...data })),
    find: jest.fn(),
  } as unknown as jest.Mocked<Repository<CommunicationLogEntry>>;
  return { repo };
}

function buildService() {
  const deps = buildDeps();
  const service = new CommunicationsService(deps.repo);
  return { service, ...deps };
}

describe('CommunicationsService', () => {
  describe('create', () => {
    it('stamps the logged-by user for a manual entry', async () => {
      const { service } = buildService();

      const entry = await service.create('tenant-a', 'user-1', {
        contactId: 'contact-1',
        channel: CommunicationChannel.CALL,
        direction: CommunicationDirection.OUTBOUND,
        summary: 'Llamé para confirmar la reunión',
      });

      expect(entry).toMatchObject({ loggedByUserId: 'user-1', channel: CommunicationChannel.CALL });
    });
  });

  describe('logAutomatic', () => {
    it('logs an outbound entry with no logged-by user', async () => {
      const { service } = buildService();

      const entry = await service.logAutomatic('tenant-a', 'contact-1', CommunicationChannel.EMAIL, 'Cotización COT-000001 enviada por correo');

      expect(entry).toMatchObject({
        loggedByUserId: null,
        direction: CommunicationDirection.OUTBOUND,
        channel: CommunicationChannel.EMAIL,
      });
    });
  });
});
