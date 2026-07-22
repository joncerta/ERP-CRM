import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Inventory module: products, warehouses, stock movements and transfers.
 * Kept in its own file (rather than folded into crm.e2e-spec.ts) since it's
 * an independent, separately-gated module with no CRM dependency.
 */
describe('Inventory (e2e)', () => {
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

  async function bootstrapTenantWithInventory(slugSuffix: string) {
    const slug = `inv-${runId}-${slugSuffix}`;
    const res = await request(app.getHttpServer())
      .post('/api/platform/tenants')
      .set('x-platform-admin-key', platformAdminKey)
      .send({
        name: `Inventory E2E ${slugSuffix}`,
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
    const token = loginRes.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/modules/inventory')
      .set('Authorization', `Bearer ${token}`)
      .send({ isEnabled: true })
      .expect(201);

    return { tenantId: res.body.id, slug, token };
  }

  async function createProductAndWarehouse(token: string) {
    const bearer = { Authorization: `Bearer ${token}` };
    const product = await request(app.getHttpServer())
      .post('/api/inventory/products')
      .set(bearer)
      .send({ sku: 'SKU-1', name: 'Producto de prueba' })
      .expect(201);
    const warehouse = await request(app.getHttpServer())
      .post('/api/inventory/warehouses')
      .set(bearer)
      .send({ name: 'Bodega Principal' })
      .expect(201);
    return { productId: product.body.id, warehouseId: warehouse.body.id };
  }

  describe('module gating', () => {
    it('blocks inventory endpoints until the tenant enables the module', async () => {
      const slug = `inv-${runId}-gating`;
      await request(app.getHttpServer())
        .post('/api/platform/tenants')
        .set('x-platform-admin-key', platformAdminKey)
        .send({ name: 'Gating Tenant', slug, adminEmail: `admin@${slug}.test`, adminPassword: 'Sup3rSecret!', adminFullName: 'Admin' })
        .expect(201);
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ tenantSlug: slug, email: `admin@${slug}.test`, password: 'Sup3rSecret!' })
        .expect(201);

      await request(app.getHttpServer())
        .get('/api/inventory/products')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);
    });
  });

  describe('products and warehouses CRUD', () => {
    it('creates, edits, and deletes a product; rejects a duplicate SKU', async () => {
      const tenant = await bootstrapTenantWithInventory('products');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const product = await request(app.getHttpServer())
        .post('/api/inventory/products')
        .set(bearer)
        .send({ sku: 'ABC-1', name: 'Widget', salePrice: 25 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/inventory/products')
        .set(bearer)
        .send({ sku: 'ABC-1', name: 'Otro widget' })
        .expect(409);

      await request(app.getHttpServer())
        .patch(`/api/inventory/products/${product.body.id}`)
        .set(bearer)
        .send({ name: 'Widget renombrado' })
        .expect(200)
        .expect((res) => expect(res.body.name).toBe('Widget renombrado'));

      await request(app.getHttpServer()).delete(`/api/inventory/products/${product.body.id}`).set(bearer).expect(200);
    });

    it('creates and deletes a warehouse', async () => {
      const tenant = await bootstrapTenantWithInventory('warehouses');
      const bearer = { Authorization: `Bearer ${tenant.token}` };

      const warehouse = await request(app.getHttpServer())
        .post('/api/inventory/warehouses')
        .set(bearer)
        .send({ name: 'Bodega Norte' })
        .expect(201);

      await request(app.getHttpServer()).delete(`/api/inventory/warehouses/${warehouse.body.id}`).set(bearer).expect(200);
    });
  });

  describe('stock movements', () => {
    it('a purchase increases the balance, a sale decreases it', async () => {
      const tenant = await bootstrapTenantWithInventory('movements');
      const bearer = { Authorization: `Bearer ${tenant.token}` };
      const { productId, warehouseId } = await createProductAndWarehouse(tenant.token);

      await request(app.getHttpServer())
        .post('/api/inventory/stock/movements')
        .set(bearer)
        .send({ productId, warehouseId, type: 'purchase', quantity: 20, direction: 'in' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/inventory/stock/movements')
        .set(bearer)
        .send({ productId, warehouseId, type: 'sale', quantity: 5, direction: 'out' })
        .expect(201);

      const balances = await request(app.getHttpServer()).get('/api/inventory/stock/balances').set(bearer).expect(200);
      expect(balances.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ productId, warehouseId, quantity: '15.00' })]),
      );

      const movements = await request(app.getHttpServer()).get('/api/inventory/stock/movements').set(bearer).expect(200);
      expect(movements.body).toHaveLength(2);
    });

    it('rejects a sale that would take stock negative', async () => {
      const tenant = await bootstrapTenantWithInventory('oversell');
      const bearer = { Authorization: `Bearer ${tenant.token}` };
      const { productId, warehouseId } = await createProductAndWarehouse(tenant.token);

      await request(app.getHttpServer())
        .post('/api/inventory/stock/movements')
        .set(bearer)
        .send({ productId, warehouseId, type: 'sale', quantity: 1, direction: 'out' })
        .expect(400);
    });
  });

  describe('transfers', () => {
    it('moves stock between two warehouses', async () => {
      const tenant = await bootstrapTenantWithInventory('transfer');
      const bearer = { Authorization: `Bearer ${tenant.token}` };
      const { productId, warehouseId: warehouseA } = await createProductAndWarehouse(tenant.token);
      const warehouseB = await request(app.getHttpServer())
        .post('/api/inventory/warehouses')
        .set(bearer)
        .send({ name: 'Bodega B' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/inventory/stock/movements')
        .set(bearer)
        .send({ productId, warehouseId: warehouseA, type: 'purchase', quantity: 10, direction: 'in' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/inventory/stock/transfers')
        .set(bearer)
        .send({ productId, fromWarehouseId: warehouseA, toWarehouseId: warehouseB.body.id, quantity: 4 })
        .expect(201);

      const balances = await request(app.getHttpServer()).get('/api/inventory/stock/balances').set(bearer).expect(200);
      expect(balances.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ warehouseId: warehouseA, quantity: '6.00' }),
          expect.objectContaining({ warehouseId: warehouseB.body.id, quantity: '4.00' }),
        ]),
      );
    });
  });

  describe('tenant isolation', () => {
    it('never lets one tenant see or affect another tenant\'s stock', async () => {
      const tenantA = await bootstrapTenantWithInventory('isoa');
      const tenantB = await bootstrapTenantWithInventory('isob');
      const { productId, warehouseId } = await createProductAndWarehouse(tenantA.token);

      await request(app.getHttpServer())
        .post('/api/inventory/stock/movements')
        .set('Authorization', `Bearer ${tenantA.token}`)
        .send({ productId, warehouseId, type: 'purchase', quantity: 10, direction: 'in' })
        .expect(201);

      const balancesAsB = await request(app.getHttpServer())
        .get('/api/inventory/stock/balances')
        .set('Authorization', `Bearer ${tenantB.token}`)
        .expect(200);
      expect(balancesAsB.body).toEqual([]);

      const productsAsB = await request(app.getHttpServer())
        .get('/api/inventory/products')
        .set('Authorization', `Bearer ${tenantB.token}`)
        .expect(200);
      expect(productsAsB.body).toEqual([]);
    });
  });
});
