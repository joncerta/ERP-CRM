import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Role } from '../src/core/roles/entities/role.entity';

/**
 * End-to-end coverage of the flows this project's security actually rests
 * on: tenant isolation, module gating, and the full lead → opportunity →
 * quote → follow-up path — the same things that were manually curl-tested
 * throughout development, now pinned as a regression suite.
 *
 * Runs against a real Postgres (the same one `npm run migration:run` /
 * `npm run seed` use). Every tenant it creates gets a slug unique to this
 * run, so it never collides with the dev-seeded "admin"/"cliente" tenants
 * and is safe to re-run without wiping the database.
 */
describe('CRM (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
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

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  async function bootstrapTenant(slugSuffix: string) {
    const slug = `e2e-${runId}-${slugSuffix}`;
    const res = await request(app.getHttpServer())
      .post('/api/platform/tenants')
      .set('x-platform-admin-key', platformAdminKey)
      .send({
        name: `E2E ${slugSuffix}`,
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

  describe('tenant bootstrap and auth', () => {
    it('rejects tenant creation without the platform admin key', async () => {
      await request(app.getHttpServer())
        .post('/api/platform/tenants')
        .send({ name: 'x', slug: `e2e-${runId}-noauth`, adminEmail: 'a@a.test', adminPassword: 'x', adminFullName: 'x' })
        .expect(401);
    });

    it('bootstraps a tenant with a working admin login and CRM enabled', async () => {
      const tenant = await bootstrapTenant('bootstrap');
      expect(tenant.token).toBeTruthy();

      const modules = await request(app.getHttpServer())
        .get('/api/modules/enabled')
        .set('Authorization', `Bearer ${tenant.token}`)
        .expect(200);
      expect(modules.body).toEqual(expect.arrayContaining([expect.objectContaining({ moduleCode: 'crm', isEnabled: true })]));
    });

    it('rejects login with the wrong password', async () => {
      const slug = `e2e-${runId}-badpw`;
      await request(app.getHttpServer())
        .post('/api/platform/tenants')
        .set('x-platform-admin-key', platformAdminKey)
        .send({ name: 'Bad Password Tenant', slug, adminEmail: `admin@${slug}.test`, adminPassword: 'Sup3rSecret!', adminFullName: 'E2E Admin' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ tenantSlug: slug, email: `admin@${slug}.test`, password: 'wrong-password' })
        .expect(401);
    });
  });

  describe('platform admin isolation', () => {
    it('blocks an ordinary tenant admin from the platform tenant list even with * permissions', async () => {
      const tenant = await bootstrapTenant('nonplatform');
      await request(app.getHttpServer())
        .get('/api/platform/tenants')
        .set('Authorization', `Bearer ${tenant.token}`)
        .expect(403);
    });

    it('lets a user with platform.tenants.manage see and manage every tenant', async () => {
      const platformTenant = await bootstrapTenant('platformop');
      const customerTenant = await bootstrapTenant('customer1');

      // Granting platform.tenants.manage isn't reachable through any API —
      // only the seed script does it — so we arrange it directly, the same
      // way the seed does, then log in again so the JWT picks it up.
      await dataSource
        .getRepository(Role)
        .createQueryBuilder()
        .update()
        .set({ permissions: () => `permissions || '["platform.tenants.manage"]'::jsonb` })
        .where('tenant_id = :tenantId AND name = :name', { tenantId: platformTenant.tenantId, name: 'Administrador' })
        .execute();

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ tenantSlug: platformTenant.slug, email: `admin@${platformTenant.slug}.test`, password: 'Sup3rSecret!' })
        .expect(201);
      const elevatedToken = loginRes.body.accessToken as string;

      const list = await request(app.getHttpServer())
        .get('/api/platform/tenants')
        .set('Authorization', `Bearer ${elevatedToken}`)
        .expect(200);
      expect(list.body.map((t: { id: string }) => t.id)).toEqual(expect.arrayContaining([customerTenant.tenantId]));

      const toggled = await request(app.getHttpServer())
        .patch(`/api/platform/tenants/${customerTenant.tenantId}/modules/crm`)
        .set('Authorization', `Bearer ${elevatedToken}`)
        .send({ isEnabled: false })
        .expect(200);
      expect(toggled.body.isEnabled).toBe(false);

      // put it back so the rest of the suite (and anyone re-running it) isn't affected
      await request(app.getHttpServer())
        .patch(`/api/platform/tenants/${customerTenant.tenantId}/modules/crm`)
        .set('Authorization', `Bearer ${elevatedToken}`)
        .send({ isEnabled: true })
        .expect(200);
    });
  });

  describe('module gating', () => {
    it('blocks CRM endpoints once the tenant disables its own module, and unblocks on re-enable', async () => {
      const tenant = await bootstrapTenant('gating');

      await request(app.getHttpServer())
        .post('/api/modules/crm')
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ isEnabled: false })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${tenant.token}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/modules/crm')
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ isEnabled: true })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${tenant.token}`)
        .expect(200);
    });
  });

  describe('full commercial flow', () => {
    it('takes a lead through opportunity, quote, public acceptance, and a follow-up reminder', async () => {
      const tenant = await bootstrapTenant('flow');
      const auth = () => request(app.getHttpServer()).get('').set('Authorization', `Bearer ${tenant.token}`);
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const company = await request(app.getHttpServer())
        .post('/api/crm/companies')
        .set(bearer)
        .send({ name: 'Distribuidora El Sol' })
        .expect(201);

      const lead = await request(app.getHttpServer())
        .post('/api/crm/leads')
        .set(bearer)
        .send({ name: 'Interés en licencias', companyId: company.body.id, estimatedBudget: 5_000_000 })
        .expect(201);
      expect(lead.body.status).toBe('new');

      const opportunity = await request(app.getHttpServer())
        .post(`/api/crm/opportunities/from-lead/${lead.body.id}`)
        .set(bearer)
        .send({})
        .expect(201);
      expect(opportunity.body.companyId).toBe(company.body.id);

      const leadAfter = await request(app.getHttpServer()).get(`/api/crm/leads/${lead.body.id}`).set(bearer).expect(200);
      expect(leadAfter.body.status).toBe('converted');

      const quote = await request(app.getHttpServer())
        .post('/api/crm/quotes')
        .set(bearer)
        .send({
          companyId: company.body.id,
          opportunityId: opportunity.body.id,
          taxRate: 19,
          items: [
            { description: 'Licencia ERP-CRM anual', quantity: 1, unitPrice: 5_000_000 },
            { description: 'Implementación', quantity: 10, unitPrice: 150_000 },
          ],
        })
        .expect(201);
      expect(quote.body.subtotal).toBe('6500000.00');
      expect(quote.body.tax).toBe('1235000.00');
      expect(quote.body.total).toBe('7735000.00');
      expect(quote.body.status).toBe('draft');

      await request(app.getHttpServer())
        .patch(`/api/crm/quotes/${quote.body.id}/send`)
        .set(bearer)
        .expect(200)
        .expect((res) => expect(res.body.status).toBe('sent'));

      const followUp = await request(app.getHttpServer())
        .post(`/api/crm/quotes/${quote.body.id}/follow-ups`)
        .set(bearer)
        .send({ dueAt: new Date(Date.now() + 60_000).toISOString(), note: 'Llamar para confirmar' })
        .expect(201);

      const pending = await request(app.getHttpServer()).get('/api/crm/quotes/follow-ups/pending').set(bearer).expect(200);
      expect(pending.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: followUp.body.id, quoteNumber: quote.body.quoteNumber })]),
      );

      // The customer opens the public link — no auth header at all.
      const publicView = await request(app.getHttpServer()).get(`/api/public/quotes/${quote.body.accessToken}`).expect(200);
      expect(publicView.body.status).toBe('viewed');
      expect(publicView.body.viewCount).toBe(1);

      const accepted = await request(app.getHttpServer())
        .post(`/api/public/quotes/${quote.body.accessToken}/respond`)
        .send({ accepted: true })
        .expect(201);
      expect(accepted.body.status).toBe('accepted');

      await request(app.getHttpServer())
        .patch(`/api/crm/quotes/follow-ups/${followUp.body.id}/done`)
        .set(bearer)
        .expect(200)
        .expect((res) => expect(res.body.status).toBe('done'));

      const pendingAfter = await request(app.getHttpServer()).get('/api/crm/quotes/follow-ups/pending').set(bearer).expect(200);
      expect(pendingAfter.body.map((f: { id: string }) => f.id)).not.toContain(followUp.body.id);

      void auth; // kept for readability of intent above; not used directly
    });
  });

  describe('tenant data isolation', () => {
    it('never lets one tenant see or fetch another tenant\'s companies', async () => {
      const tenantA = await bootstrapTenant('isoa');
      const tenantB = await bootstrapTenant('isob');

      const company = await request(app.getHttpServer())
        .post('/api/crm/companies')
        .set('Authorization', `Bearer ${tenantA.token}`)
        .send({ name: 'Solo de A' })
        .expect(201);

      const listAsB = await request(app.getHttpServer())
        .get('/api/crm/companies')
        .set('Authorization', `Bearer ${tenantB.token}`)
        .expect(200);
      expect(listAsB.body).toEqual([]);

      await request(app.getHttpServer())
        .get(`/api/crm/companies/${company.body.id}`)
        .set('Authorization', `Bearer ${tenantB.token}`)
        .expect(404);
    });
  });
});
