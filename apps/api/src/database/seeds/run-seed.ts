import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import dataSource from '../../config/typeorm.config';
import { Currency } from '../../core/currencies/entities/currency.entity';
import { ModuleDefinition } from '../../core/modules-catalog/entities/module-definition.entity';
import { Tenant } from '../../core/tenants/entities/tenant.entity';
import { Role } from '../../core/roles/entities/role.entity';
import { User } from '../../core/users/entities/user.entity';
import { TenantModule } from '../../core/modules-catalog/entities/tenant-module.entity';
import { DEFAULT_ROLE_TEMPLATES } from '../../core/roles/roles.service';
import { Account } from '../../finance/accounting/entities/account.entity';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../../finance/accounting/accounting.service';
import { Tax } from '../../core/taxes/entities/tax.entity';

const DEFAULT_TAXES = [
  { name: 'IVA 19%', rate: 19, isDefault: true },
  { name: 'IVA 5%', rate: 5, isDefault: false },
  { name: 'Exento', rate: 0, isDefault: false },
];

const CURRENCIES = [
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', decimalPlaces: 2 },
  { code: 'COP', name: 'Peso colombiano', symbol: '$', decimalPlaces: 0 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$', decimalPlaces: 2 },
];

const MODULES = [
  { code: 'crm', name: 'CRM Comercial', description: 'Contactos, leads, oportunidades y cotizaciones', isCore: false },
  { code: 'inventory', name: 'Inventario', description: 'Productos, bodegas, movimientos y traslados de stock', isCore: false },
  { code: 'sales_invoicing', name: 'Facturación', description: 'Facturas, notas crédito/débito, pagos y facturación recurrente', isCore: false },
  { code: 'purchasing', name: 'Compras y proveedores', description: 'Proveedores, órdenes de compra, recepción de mercancía y facturas de proveedor', isCore: false },
  { code: 'accounting', name: 'Contabilidad y tesorería', description: 'Plan de cuentas, asientos contables, caja y bancos, y reportes financieros básicos', isCore: false },
  { code: 'fixed_assets', name: 'Activos fijos', description: 'Registro de activos, depreciación, mantenimiento, traslado y baja', isCore: false },
  { code: 'customer_service', name: 'Servicio al cliente', description: 'Tickets y PQRS con SLA, base de conocimiento y sugerencias automáticas de artículos', isCore: false },
  { code: 'marketing', name: 'Marketing', description: 'Campañas de email/SMS/WhatsApp, formularios de captura de leads, segmentación y secuencias de nutrición', isCore: false },
  { code: 'automation', name: 'Automatizaciones y reportes', description: 'Reglas on/off, webhooks salientes y reportes por vendedor/cliente/campaña con forecast', isCore: false },
  { code: 'documents', name: 'Documentos y comunicaciones', description: 'Archivos adjuntos por empresa/contacto/oportunidad y bitácora unificada de comunicaciones por contacto', isCore: false },
  { code: 'hr', name: 'Recursos humanos y nómina', description: 'Expedientes de empleados, vacaciones y licencias con aprobación del líder, liquidación de nómina simplificada y evaluaciones de desempeño', isCore: false },
  { code: 'projects', name: 'Proyectos', description: 'Etapas, presupuesto y cronograma por proyecto, recursos asignados con registro de horas y costos, y avance/rentabilidad', isCore: false },
  { code: 'production', name: 'Producción', description: 'Lista de materiales (BOM), órdenes de producción con consumos y rendimientos, y costeo — solo para clientes que fabrican', isCore: false },
];

const SALT_ROUNDS = 12;

interface SeedTenantOptions {
  slug: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
  /** Extra permissions appended only to this tenant's Administrador role — never granted by '*'. */
  extraAdminPermissions?: string[];
  enableCrm?: boolean;
  enableInventory?: boolean;
  enableInvoicing?: boolean;
  enablePurchasing?: boolean;
  enableAccounting?: boolean;
  enableFixedAssets?: boolean;
  seedTaxes?: boolean;
  enableCustomerService?: boolean;
  enableMarketing?: boolean;
  enableAutomation?: boolean;
  enableDocuments?: boolean;
  enableHr?: boolean;
  enableProjects?: boolean;
  enableProduction?: boolean;
}

async function seedTenant(ds: DataSource, opts: SeedTenantOptions) {
  const tenantRepo = ds.getRepository(Tenant);
  const roleRepo = ds.getRepository(Role);
  const userRepo = ds.getRepository(User);
  const tenantModuleRepo = ds.getRepository(TenantModule);

  const existing = await tenantRepo.findOne({ where: { slug: opts.slug } });
  if (existing) {
    console.log(`Tenant "${opts.slug}" ya existe, no se vuelve a crear.`);
    return;
  }

  const tenant = await tenantRepo.save(
    tenantRepo.create({ slug: opts.slug, name: opts.name, defaultLocale: 'es', defaultCurrencyCode: 'USD' }),
  );

  const roles = await roleRepo.save(
    DEFAULT_ROLE_TEMPLATES.map((template) => {
      const isAdminRole = template.name === 'Administrador';
      const permissions =
        isAdminRole && opts.extraAdminPermissions?.length
          ? [...template.permissions, ...opts.extraAdminPermissions]
          : template.permissions;
      return roleRepo.create({ tenantId: tenant.id, name: template.name, permissions, isSystem: true });
    }),
  );
  const adminRole = roles.find((r) => r.name === 'Administrador')!;

  const passwordHash = await bcrypt.hash(opts.adminPassword, SALT_ROUNDS);
  await userRepo.save(
    userRepo.create({
      tenantId: tenant.id,
      email: opts.adminEmail,
      passwordHash,
      fullName: opts.adminFullName,
      roleId: adminRole.id,
      preferredLocale: 'es',
    }),
  );

  if (opts.enableCrm) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'crm', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableInventory) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'inventory', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableInvoicing) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'sales_invoicing', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enablePurchasing) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'purchasing', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableAccounting) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'accounting', isEnabled: true, enabledAt: new Date() }),
    );
    const accountRepo = ds.getRepository(Account);
    await accountRepo.save(DEFAULT_CHART_OF_ACCOUNTS.map((a) => accountRepo.create({ tenantId: tenant.id, ...a })));
  }
  if (opts.enableFixedAssets) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'fixed_assets', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.seedTaxes) {
    const taxRepo = ds.getRepository(Tax);
    await taxRepo.save(DEFAULT_TAXES.map((tx) => taxRepo.create({ tenantId: tenant.id, ...tx })));
  }
  if (opts.enableCustomerService) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'customer_service', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableMarketing) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'marketing', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableAutomation) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'automation', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableDocuments) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'documents', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableHr) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'hr', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableProjects) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'projects', isEnabled: true, enabledAt: new Date() }),
    );
  }
  if (opts.enableProduction) {
    await tenantModuleRepo.save(
      tenantModuleRepo.create({ tenantId: tenant.id, moduleCode: 'production', isEnabled: true, enabledAt: new Date() }),
    );
  }

  console.log(`Tenant "${opts.slug}" creado:`);
  console.log(`  email:    ${opts.adminEmail}`);
  console.log(`  password: ${opts.adminPassword}`);
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

  // Platform operator — can see and manage every tenant on the platform
  // (POST /platform/tenants/*) via the extra platform.tenants.manage
  // permission. Doesn't get its own CRM data by default; it's an operator
  // account, not a customer.
  await seedTenant(ds, {
    slug: process.env.SEED_TENANT_SLUG ?? 'admin',
    name: process.env.SEED_TENANT_NAME ?? 'Administración',
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@admin.com',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!',
    adminFullName: process.env.SEED_ADMIN_NAME ?? 'Administrador',
    extraAdminPermissions: ['platform.tenants.manage'],
    enableCrm: false,
  });

  // A demo customer tenant — an ordinary tenant like any other, with the
  // CRM module active, so there's something to log into and manage from
  // the platform admin's tenant list.
  await seedTenant(ds, {
    slug: process.env.SEED_CLIENT_TENANT_SLUG ?? 'cliente',
    name: process.env.SEED_CLIENT_TENANT_NAME ?? 'Cliente Demo',
    adminEmail: process.env.SEED_CLIENT_ADMIN_EMAIL ?? 'admin@cliente.com',
    adminPassword: process.env.SEED_CLIENT_ADMIN_PASSWORD ?? 'Cliente123!',
    adminFullName: process.env.SEED_CLIENT_ADMIN_NAME ?? 'Admin Cliente',
    enableCrm: true,
    enableInventory: true,
    enableInvoicing: true,
    enablePurchasing: true,
    enableAccounting: true,
    enableFixedAssets: true,
    seedTaxes: true,
    enableCustomerService: true,
    enableMarketing: true,
    enableAutomation: true,
    enableDocuments: true,
    enableHr: true,
    enableProjects: true,
    enableProduction: true,
  });

  console.log(`Seed completo: ${CURRENCIES.length} monedas, ${MODULES.length} módulos.`);
  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
