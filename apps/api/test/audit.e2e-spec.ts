import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Audit log: every tenant-scoped entity change should show up here
 * automatically (via AuditSubscriber), tagged with who did it.
 */
describe('Audit log (e2e)', () => {
  let app: INestApplication<App>;
  const runId = Date.now();
  const platformAdminKey = process.env.PLATFORM_ADMIN_KEY ?? 'change-me-too';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function bootstrapTenant(slugSuffix: string) {
    const slug = `audit-${runId}-${slugSuffix}`;
    const res = await request(app.getHttpServer())
      .post('/api/platform/tenants')
      .set('x-platform-admin-key', platformAdminKey)
      .send({
        name: `Audit E2E ${slugSuffix}`,
        slug,
        adminEmail: `admin@${slug}.test`,
        adminPassword: 'Sup3rSecret!',
        adminFullName: 'E2E Admin',
      })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ tenantSlug: slug, email: `admin@${slug}.test`, password: 'Sup3rSecret!' })
      .expect(201);

    return { tenantId: res.body.id, slug, token: loginRes.body.accessToken as string };
  }

  it('logs a create, an update, and a delete, each tagged with the acting user', async () => {
    const tenant = await bootstrapTenant('lifecycle');
    const bearer = { Authorization: `Bearer ${tenant.token}` };

    const company = await request(app.getHttpServer())
      .post('/api/crm/companies')
      .set(bearer)
      .send({ name: 'Acme Corp' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/crm/companies/${company.body.id}`)
      .set(bearer)
      .send({ name: 'Acme Corp Renamed' })
      .expect(200);

    await request(app.getHttpServer()).delete(`/api/crm/companies/${company.body.id}`).set(bearer).expect(200);

    const logs = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .query({ entityType: 'Company' })
      .set(bearer)
      .expect(200);

    const actions = logs.body.items.map((l: { action: string }) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['create', 'update', 'delete']));
    expect(logs.body.items.every((l: { actorUserId: string | null }) => l.actorUserId)).toBe(true);

    const updateEntry = logs.body.items.find((l: { action: string }) => l.action === 'update');
    expect(updateEntry.changes.name).toEqual({ before: 'Acme Corp', after: 'Acme Corp Renamed' });
  });

  it('never lets one tenant see another tenant\'s audit trail', async () => {
    const tenantA = await bootstrapTenant('isoa');
    const tenantB = await bootstrapTenant('isob');

    await request(app.getHttpServer())
      .post('/api/crm/companies')
      .set({ Authorization: `Bearer ${tenantA.token}` })
      .send({ name: 'Solo de A' })
      .expect(201);

    const logsAsB = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .query({ entityType: 'Company' })
      .set({ Authorization: `Bearer ${tenantB.token}` })
      .expect(200);

    expect(logsAsB.body.items).toEqual([]);
  });

  it('blocks a role without core.audit.read from viewing the log', async () => {
    const tenant = await bootstrapTenant('denied');
    const bearer = { Authorization: `Bearer ${tenant.token}` };

    const roles = await request(app.getHttpServer()).get('/api/roles').set(bearer).expect(200);
    const vendedorRole = roles.body.find((r: { name: string }) => r.name === 'Vendedor');

    const slug = tenant.slug;
    await request(app.getHttpServer())
      .post('/api/users')
      .set(bearer)
      .send({ email: `seller@${slug}.test`, password: 'Sup3rSecret!', fullName: 'Vendedor', roleId: vendedorRole.id })
      .expect(201);

    const sellerLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ tenantSlug: slug, email: `seller@${slug}.test`, password: 'Sup3rSecret!' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set({ Authorization: `Bearer ${sellerLogin.body.accessToken}` })
      .expect(403);
  });
});
