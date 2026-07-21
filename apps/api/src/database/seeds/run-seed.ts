import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import dataSource from '../../config/typeorm.config';
import { Currency } from '../../core/currencies/entities/currency.entity';
import { ModuleDefinition } from '../../core/modules-catalog/entities/module-definition.entity';
import { Tenant } from '../../core/tenants/entities/tenant.entity';
import { Role } from '../../core/roles/entities/role.entity';
import { User } from '../../core/users/entities/user.entity';
import { TenantModule } from '../../core/modules-catalog/entities/tenant-module.entity';
import { DEFAULT_ROLE_TEMPLATES } from '../../core/roles/roles.service';

const CURRENCIES = [
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', decimalPlaces: 2 },
  { code: 'COP', name: 'Peso colombiano', symbol: '$', decimalPlaces: 0 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$', decimalPlaces: 2 },
];

const MODULES = [
  { code: 'crm', name: 'CRM Comercial', description: 'Contactos, leads, oportunidades y cotizaciones', isCore: false },
];

// Default admin tenant, overridable via env so it never has to be hardcoded
// for a real deployment — just export different values before running the seed.
const SEED_TENANT_SLUG = process.env.SEED_TENANT_SLUG ?? 'admin';
const SEED_TENANT_NAME = process.env.SEED_TENANT_NAME ?? 'Administración';
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@admin.com';
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
const SEED_ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? 'Administrador';
const SALT_ROUNDS = 12;

async function seedAdminTenant(ds: Awaited<ReturnType<typeof dataSource.initialize>>) {
  const tenantRepo = ds.getRepository(Tenant);
  const roleRepo = ds.getRepository(Role);
  const userRepo = ds.getRepository(User);
  const tenantModuleRepo = ds.getRepository(TenantModule);

  const existing = await tenantRepo.findOne({ where: { slug: SEED_TENANT_SLUG } });
  if (existing) {
    console.log(`Tenant admin "${SEED_TENANT_SLUG}" ya existe, no se vuelve a crear.`);
    return;
  }

  const tenant = await tenantRepo.save(
    tenantRepo.create({ slug: SEED_TENANT_SLUG, name: SEED_TENANT_NAME, defaultLocale: 'es', defaultCurrencyCode: 'USD' }),
  );

  const roles = await roleRepo.save(
    DEFAULT_ROLE_TEMPLATES.map((template) =>
      roleRepo.create({ tenantId: tenant.id, name: template.name, permissions: template.permissions, isSystem: true }),
    ),
  );
  const adminRole = roles.find((r) => r.name === 'Administrador')!;

  const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, SALT_ROUNDS);
  await userRepo.save(
    userRepo.create({
      tenantId: tenant.id,
      email: SEED_ADMIN_EMAIL,
      passwordHash,
      fullName: SEED_ADMIN_NAME,
      roleId: adminRole.id,
      preferredLocale: 'es',
    }),
  );

  await tenantModuleRepo.save(
    tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'crm', isEnabled: true, enabledAt: new Date() }),
  );

  console.log('Tenant admin creado:');
  console.log(`  slug:     ${SEED_TENANT_SLUG}`);
  console.log(`  email:    ${SEED_ADMIN_EMAIL}`);
  console.log(`  password: ${SEED_ADMIN_PASSWORD}`);
}

async function run() {
  const ds = await dataSource.initialize();

  const currencyRepo = ds.getRepository(Currency);
  for (const currency of CURRENCIES) {
    await currencyRepo.upsert(currency, ['code']);
  }

  const moduleRepo = ds.getRepository(ModuleDefinition);
  for (const module of MODULES) {
    await moduleRepo.upsert(module, ['code']);
  }

  await seedAdminTenant(ds);

  console.log(`Seed completo: ${CURRENCIES.length} monedas, ${MODULES.length} módulos.`);
  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
