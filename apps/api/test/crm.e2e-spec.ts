import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Role } from '../src/core/roles/entities/role.entity';
import { Session } from '../src/core/sessions/entities/session.entity';

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

  describe('session management', () => {
    it('logging in on a second device immediately kicks out the first — single-session', async () => {
      const tenant = await bootstrapTenant('singlesess');

      // "device 1" logs in, works fine
      const login1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ tenantSlug: tenant.slug, email: `admin@${tenant.slug}.test`, password: 'Sup3rSecret!' })
        .expect(201);
      await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${login1.body.accessToken}`)
        .expect(200);

      // "device 2" logs in with the same credentials
      const login2 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ tenantSlug: tenant.slug, email: `admin@${tenant.slug}.test`, password: 'Sup3rSecret!' })
        .expect(201);

      // device 1's token is now dead, device 2's works
      await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${login1.body.accessToken}`)
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${login2.body.accessToken}`)
        .expect(200);
    });

    it('logout revokes the session server-side, not just client-side', async () => {
      const tenant = await bootstrapTenant('logout');

      await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${tenant.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tenant.token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get('/api/crm/leads')
        .set('Authorization', `Bearer ${tenant.token}`)
        .expect(401);
    });

    it('lets a tenant configure its own idle timeout, and enforces it', async () => {
      const tenant = await bootstrapTenant('idletimeout');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const before = await request(app.getHttpServer()).get('/api/tenant-settings').set(bearer).expect(200);
      expect(before.body.sessionIdleTimeoutMinutes).toBeNull();

      await request(app.getHttpServer())
        .patch('/api/tenant-settings')
        .set(bearer)
        .send({ sessionIdleTimeoutMinutes: 5 })
        .expect(200)
        .expect((res) => expect(res.body.sessionIdleTimeoutMinutes).toBe(5));

      // still within the window right after configuring it
      await request(app.getHttpServer()).get('/api/crm/leads').set(bearer).expect(200);

      // simulate 10 idle minutes passing by backdating the session directly
      await dataSource
        .getRepository(Session)
        .update({ tenantId: tenant.tenantId }, { lastSeenAt: new Date(Date.now() - 10 * 60_000) });

      await request(app.getHttpServer()).get('/api/crm/leads').set(bearer).expect(401);
    });

    it('rejects an out-of-range idle timeout instead of silently clamping it', async () => {
      const tenant = await bootstrapTenant('idlerange');
      await request(app.getHttpServer())
        .patch('/api/tenant-settings')
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ sessionIdleTimeoutMinutes: 1 }) // below the 5-minute floor
        .expect(400);
    });
  });

  async function elevateToPlatformAdmin(tenant: { tenantId: string; slug: string }) {
    await dataSource
      .getRepository(Role)
      .createQueryBuilder()
      .update()
      .set({ permissions: () => `permissions || '["platform.tenants.manage"]'::jsonb` })
      .where('tenant_id = :tenantId AND name = :name', { tenantId: tenant.tenantId, name: 'Administrador' })
      .execute();

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ tenantSlug: tenant.slug, email: `admin@${tenant.slug}.test`, password: 'Sup3rSecret!' })
      .expect(201);
    return loginRes.body.accessToken as string;
  }

  describe('tenant branding', () => {
    it('the public branding lookup returns nulls for a tenant with no branding configured', async () => {
      const tenant = await bootstrapTenant('brandingdefault');
      const res = await request(app.getHttpServer()).get(`/api/platform/tenants/by-slug/${tenant.slug}/branding`).expect(200);
      expect(res.body).toEqual({ primaryColor: null, secondaryColor: null });
    });

    it('returns nulls instead of 404 for a slug that does not exist, so login-screen typing never errors', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/platform/tenants/by-slug/e2e-${runId}-doesnotexist/branding`)
        .expect(200);
      expect(res.body).toEqual({ primaryColor: null, secondaryColor: null });
    });

    it('lets a platform admin set a tenant\'s brand colors, visible right away on the public lookup', async () => {
      const platformTenant = await bootstrapTenant('brandingop');
      const customerTenant = await bootstrapTenant('brandingcustomer');
      const elevatedToken = await elevateToPlatformAdmin(platformTenant);

      await request(app.getHttpServer())
        .patch(`/api/platform/tenants/${customerTenant.tenantId}/branding`)
        .set('Authorization', `Bearer ${elevatedToken}`)
        .send({ primaryColor: '#123abc', secondaryColor: '#654321' })
        .expect(200)
        .expect((res) => {
          expect(res.body.brandingPrimaryColor).toBe('#123abc');
          expect(res.body.brandingSecondaryColor).toBe('#654321');
        });

      const res = await request(app.getHttpServer())
        .get(`/api/platform/tenants/by-slug/${customerTenant.slug}/branding`)
        .expect(200);
      expect(res.body).toEqual({ primaryColor: '#123abc', secondaryColor: '#654321' });
    });

    it('rejects a color that is not a hex code', async () => {
      const platformTenant = await bootstrapTenant('brandinginvalid');
      const elevatedToken = await elevateToPlatformAdmin(platformTenant);

      await request(app.getHttpServer())
        .patch(`/api/platform/tenants/${platformTenant.tenantId}/branding`)
        .set('Authorization', `Bearer ${elevatedToken}`)
        .send({ primaryColor: 'not-a-color' })
        .expect(400);
    });

    it('blocks an ordinary tenant admin from setting branding for any tenant, including its own', async () => {
      const tenant = await bootstrapTenant('brandingdenied');
      await request(app.getHttpServer())
        .patch(`/api/platform/tenants/${tenant.tenantId}/branding`)
        .set('Authorization', `Bearer ${tenant.token}`)
        .send({ primaryColor: '#123abc', secondaryColor: null })
        .expect(403);
    });
  });

  describe('notifications', () => {
    async function quoteThroughToSent(tenant: { token: string }) {
      const bearer = { Authorization: `Bearer ${tenant.token}` };
      const company = await request(app.getHttpServer())
        .post('/api/crm/companies')
        .set(bearer)
        .send({ name: 'Cliente Notificaciones' })
        .expect(201);
      const quote = await request(app.getHttpServer())
        .post('/api/crm/quotes')
        .set(bearer)
        .send({ companyId: company.body.id, items: [{ description: 'Servicio', quantity: 1, unitPrice: 100 }] })
        .expect(201);
      await request(app.getHttpServer()).patch(`/api/crm/quotes/${quote.body.id}/send`).set(bearer).expect(200);
      return quote.body as { id: string; accessToken: string; quoteNumber: string };
    }

    it('notifies the quote owner (persisted, fetchable via REST) when the customer accepts', async () => {
      const tenant = await bootstrapTenant('notifyaccept');
      const bearer = { Authorization: `Bearer ${tenant.token}` };
      const quote = await quoteThroughToSent(tenant);

      await request(app.getHttpServer())
        .post(`/api/public/quotes/${quote.accessToken}/respond`)
        .send({ accepted: true })
        .expect(201);

      const notifications = await request(app.getHttpServer()).get('/api/notifications').set(bearer).expect(200);
      expect(notifications.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'quote.accepted', isRead: false, title: expect.any(String) }),
        ]),
      );
    });

    it('notifies on rejection too, and marking it read persists', async () => {
      const tenant = await bootstrapTenant('notifyreject');
      const bearer = { Authorization: `Bearer ${tenant.token}` };
      const quote = await quoteThroughToSent(tenant);

      await request(app.getHttpServer())
        .post(`/api/public/quotes/${quote.accessToken}/respond`)
        .send({ accepted: false })
        .expect(201);

      const notifications = await request(app.getHttpServer()).get('/api/notifications').set(bearer).expect(200);
      const notification = notifications.body.find((n: { type: string }) => n.type === 'quote.rejected');
      expect(notification).toBeTruthy();

      await request(app.getHttpServer()).patch(`/api/notifications/${notification.id}/read`).set(bearer).expect(200);

      const after = await request(app.getHttpServer()).get('/api/notifications').set(bearer).expect(200);
      expect(after.body.find((n: { id: string }) => n.id === notification.id).isRead).toBe(true);
    });

    it('never lets one tenant read another tenant\'s notifications', async () => {
      const tenantA = await bootstrapTenant('notifyisoa');
      const tenantB = await bootstrapTenant('notifyisob');
      const quoteA = await quoteThroughToSent(tenantA);
      await request(app.getHttpServer()).post(`/api/public/quotes/${quoteA.accessToken}/respond`).send({ accepted: true }).expect(201);

      const asB = await request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${tenantB.token}`)
        .expect(200);
      expect(asB.body).toEqual([]);
    });
  });

  describe('editing and deleting CRM records', () => {
    it('edits and deletes a company', async () => {
      const tenant = await bootstrapTenant('editcompany');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const company = await request(app.getHttpServer()).post('/api/crm/companies').set(bearer).send({ name: 'Original' }).expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`/api/crm/companies/${company.body.id}`)
        .set(bearer)
        .send({ name: 'Renombrada' })
        .expect(200);
      expect(updated.body.name).toBe('Renombrada');

      await request(app.getHttpServer()).delete(`/api/crm/companies/${company.body.id}`).set(bearer).expect(200);
      await request(app.getHttpServer()).get(`/api/crm/companies/${company.body.id}`).set(bearer).expect(404);
    });

    it('edits and deletes a contact', async () => {
      const tenant = await bootstrapTenant('editcontact');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const contact = await request(app.getHttpServer())
        .post('/api/crm/contacts')
        .set(bearer)
        .send({ firstName: 'Ana' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/crm/contacts/${contact.body.id}`)
        .set(bearer)
        .send({ firstName: 'Ana María' })
        .expect(200)
        .expect((res) => expect(res.body.firstName).toBe('Ana María'));

      await request(app.getHttpServer()).delete(`/api/crm/contacts/${contact.body.id}`).set(bearer).expect(200);
      await request(app.getHttpServer()).get(`/api/crm/contacts/${contact.body.id}`).set(bearer).expect(404);
    });

    it('edits and deletes a lead', async () => {
      const tenant = await bootstrapTenant('editlead');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const lead = await request(app.getHttpServer()).post('/api/crm/leads').set(bearer).send({ name: 'Interés inicial' }).expect(201);

      await request(app.getHttpServer())
        .patch(`/api/crm/leads/${lead.body.id}`)
        .set(bearer)
        .send({ name: 'Interés confirmado' })
        .expect(200)
        .expect((res) => expect(res.body.name).toBe('Interés confirmado'));

      await request(app.getHttpServer()).delete(`/api/crm/leads/${lead.body.id}`).set(bearer).expect(200);
      await request(app.getHttpServer()).get(`/api/crm/leads/${lead.body.id}`).set(bearer).expect(404);
    });

    it('edits an opportunity and can mark it lost', async () => {
      const tenant = await bootstrapTenant('editopp');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const lead = await request(app.getHttpServer()).post('/api/crm/leads').set(bearer).send({ name: 'Para oportunidad' }).expect(201);
      const opportunity = await request(app.getHttpServer())
        .post(`/api/crm/opportunities/from-lead/${lead.body.id}`)
        .set(bearer)
        .send({})
        .expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`/api/crm/opportunities/${opportunity.body.id}`)
        .set(bearer)
        .send({ value: 999 })
        .expect(200);
      expect(Number(updated.body.value)).toBe(999);

      const lost = await request(app.getHttpServer())
        .patch(`/api/crm/opportunities/${opportunity.body.id}/close-lost`)
        .set(bearer)
        .send({ reason: 'Se fue con la competencia' })
        .expect(200);
      expect(lost.body.status).toBe('lost');
      expect(lost.body.lostReason).toBe('Se fue con la competencia');
    });

    it('edits a quote while in draft, but rejects editing once sent', async () => {
      const tenant = await bootstrapTenant('editquote');
      const bearer = { Authorization: `Bearer ${tenant.token}` };
      const company = await request(app.getHttpServer()).post('/api/crm/companies').set(bearer).send({ name: 'Cliente Edit' }).expect(201);
      const quote = await request(app.getHttpServer())
        .post('/api/crm/quotes')
        .set(bearer)
        .send({ companyId: company.body.id, items: [{ description: 'Item', quantity: 1, unitPrice: 100 }] })
        .expect(201);

      const edited = await request(app.getHttpServer())
        .patch(`/api/crm/quotes/${quote.body.id}`)
        .set(bearer)
        .send({ items: [{ description: 'Item editado', quantity: 2, unitPrice: 100 }] })
        .expect(200);
      expect(Number(edited.body.total)).toBe(200);

      await request(app.getHttpServer()).patch(`/api/crm/quotes/${quote.body.id}/send`).set(bearer).expect(200);

      await request(app.getHttpServer())
        .patch(`/api/crm/quotes/${quote.body.id}`)
        .set(bearer)
        .send({ items: [{ description: 'No debería aplicar', quantity: 1, unitPrice: 1 }] })
        .expect(400);
    });
  });

  describe('team users', () => {
    it('invites a teammate, lists them, and the new user can log in', async () => {
      const tenant = await bootstrapTenant('inviteteam');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const roles = await request(app.getHttpServer()).get('/api/roles').set(bearer).expect(200);
      const adminRole = roles.body.find((r: { name: string }) => r.name === 'Administrador');
      expect(adminRole).toBeTruthy();

      const created = await request(app.getHttpServer())
        .post('/api/users')
        .set(bearer)
        .send({ email: `teammate@${tenant.slug}.test`, password: 'TeamMate123!', fullName: 'Compañera', roleId: adminRole.id })
        .expect(201);
      expect(created.body.isActive).toBe(true);

      const list = await request(app.getHttpServer()).get('/api/users').set(bearer).expect(200);
      expect(list.body.map((u: { email: string }) => u.email)).toEqual(
        expect.arrayContaining([`teammate@${tenant.slug}.test`]),
      );

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ tenantSlug: tenant.slug, email: `teammate@${tenant.slug}.test`, password: 'TeamMate123!' })
        .expect(201);
    });

    it('blocks a user from deactivating itself, but can deactivate someone else and it blocks their login', async () => {
      const tenant = await bootstrapTenant('deactivateteam');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const users = await request(app.getHttpServer()).get('/api/users').set(bearer).expect(200);
      const selfId = users.body.find((u: { email: string }) => u.email === `admin@${tenant.slug}.test`).id;

      await request(app.getHttpServer()).patch(`/api/users/${selfId}/active`).set(bearer).send({ isActive: false }).expect(400);

      const roles = await request(app.getHttpServer()).get('/api/roles').set(bearer).expect(200);
      const adminRole = roles.body.find((r: { name: string }) => r.name === 'Administrador');
      const teammate = await request(app.getHttpServer())
        .post('/api/users')
        .set(bearer)
        .send({ email: `other@${tenant.slug}.test`, password: 'OtherPass123!', fullName: 'Otro', roleId: adminRole.id })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/users/${teammate.body.id}/active`)
        .set(bearer)
        .send({ isActive: false })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ tenantSlug: tenant.slug, email: `other@${tenant.slug}.test`, password: 'OtherPass123!' })
        .expect(401);
    });
  });
});
