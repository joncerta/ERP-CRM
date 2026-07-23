import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { Role } from '../../core/roles/entities/role.entity';
import { User } from '../../core/users/entities/user.entity';
import { Company } from '../../crm/companies/entities/company.entity';
import { Contact } from '../../crm/contacts/entities/contact.entity';
import { Lead } from '../../crm/leads/entities/lead.entity';
import { Opportunity } from '../../crm/opportunities/entities/opportunity.entity';
import { Quote } from '../../crm/quotes/entities/quote.entity';
import { Supplier } from '../../finance/purchases/entities/supplier.entity';
import { Ticket } from '../../support/tickets/entities/ticket.entity';

import { TenantsService } from '../../core/tenants/tenants.service';
import { UsersService } from '../../core/users/users.service';
import { CompaniesService } from '../../crm/companies/companies.service';
import { ContactsService } from '../../crm/contacts/contacts.service';
import { LeadsService } from '../../crm/leads/leads.service';
import { LeadStatus, LeadPriority } from '../../crm/leads/entities/lead.entity';
import { PipelineStagesService } from '../../crm/pipeline-stages/pipeline-stages.service';
import { OpportunitiesService } from '../../crm/opportunities/opportunities.service';
import { ActivitiesService } from '../../crm/activities/activities.service';
import { ActivityType } from '../../crm/activities/entities/activity.entity';
import { QuotesService } from '../../crm/quotes/quotes.service';

import { WarehousesService } from '../../inventory/warehouses/warehouses.service';
import { ProductCategoriesService } from '../../inventory/catalog/product-categories.service';
import { ProductUnitsService } from '../../inventory/catalog/product-units.service';
import { ProductsService } from '../../inventory/products/products.service';
import { StockService } from '../../inventory/stock/stock.service';
import { StockMovementType } from '../../inventory/stock/entities/stock-movement.entity';

import { InvoicesService } from '../../finance/invoices/invoices.service';
import { SuppliersService } from '../../finance/purchases/suppliers.service';
import { PurchaseOrdersService } from '../../finance/purchases/purchase-orders.service';
import { AccountingService } from '../../finance/accounting/accounting.service';
import { CashAccountType } from '../../finance/accounting/entities/cash-account.entity';
import { FixedAssetsService } from '../../finance/fixed-assets/fixed-assets.service';

import { TicketsService } from '../../support/tickets/tickets.service';
import { TicketPriority, TicketStatus } from '../../support/tickets/entities/ticket.entity';
import { KnowledgeService } from '../../support/knowledge/knowledge.service';

import { CampaignsService } from '../../marketing/campaigns/campaigns.service';
import { CampaignChannel } from '../../marketing/campaigns/entities/campaign.entity';
import { LandingFormsService } from '../../marketing/landing-forms/landing-forms.service';
import { NurtureService } from '../../marketing/nurture/nurture.service';

/**
 * Populates the demo tenant (`cliente` by default) with a coherent set of
 * mock business data across every module, so a fresh clone actually looks
 * like a used ERP instead of a wall of empty screens. Idempotent: bails out
 * without touching anything if the tenant already has companies.
 *
 * This is deliberately separate from `run-seed.ts` (which only creates
 * tenants/modules/currencies — infrastructure, not business data) and
 * bootstraps the full Nest application context instead of touching
 * repositories directly, so every record goes through the same service
 * methods the API uses (numbering, totals, stock balances, etc. stay
 * consistent with reality instead of being hand-computed here).
 */
async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  const dataSource = app.get(DataSource);

  const tenantSlug = process.env.SEED_CLIENT_TENANT_SLUG ?? 'cliente';
  const tenantsService = app.get(TenantsService);
  const tenant = await tenantsService.findBySlug(tenantSlug);
  if (!tenant) {
    console.error(`Tenant "${tenantSlug}" no existe. Corre "npm run seed" primero.`);
    await app.close();
    process.exit(1);
  }
  const tenantId = tenant!.id;

  const companyRepo = dataSource.getRepository(Company);
  const existing = await companyRepo.count({ where: { tenantId } });
  if (existing > 0) {
    console.log(`El tenant "${tenantSlug}" ya tiene datos (${existing} empresas) — no se duplica. Nada que hacer.`);
    await app.close();
    return;
  }

  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);
  const adminRole = await roleRepo.findOne({ where: { tenantId, name: 'Administrador' } });
  const vendedorRole = await roleRepo.findOne({ where: { tenantId, name: 'Vendedor' } });
  const admin = await userRepo.findOne({ where: { tenantId, roleId: adminRole?.id } });
  if (!admin || !vendedorRole) {
    console.error('No se encontró el usuario admin o el rol Vendedor del tenant — corre "npm run seed" primero.');
    await app.close();
    process.exit(1);
  }
  const adminId = admin.id;

  console.log(`Sembrando datos mock para "${tenantSlug}" (${tenant!.name})...`);

  // --- Usuarios de ventas adicionales (para variar dueños en todo el resto) ---
  const usersService = app.get(UsersService);
  const laura = await usersService.create(tenantId, {
    email: 'laura.gomez@cliente.com',
    password: 'Vendedor123!',
    fullName: 'Laura Gómez',
    roleId: vendedorRole.id,
  });
  const carlos = await usersService.create(tenantId, {
    email: 'carlos.ramirez@cliente.com',
    password: 'Vendedor123!',
    fullName: 'Carlos Ramírez',
    roleId: vendedorRole.id,
  });
  const owners = [adminId, laura.id, carlos.id];
  const ownerOf = (i: number) => owners[i % owners.length];

  // --- CRM: empresas y contactos ---
  const companiesService = app.get(CompaniesService);
  const contactsService = app.get(ContactsService);

  const companyDefs = [
    { name: 'Andina Textiles S.A.S.', industry: 'Manufactura', city: 'Medellín', country: 'Colombia', employeeCount: 220, email: 'contacto@andinatextiles.com', phone: '+57 4 4441122' },
    { name: 'Ferretería El Roble', industry: 'Retail', city: 'Bogotá', country: 'Colombia', employeeCount: 35, email: 'ventas@elroble.com', phone: '+57 1 5551234' },
    { name: 'Constructora Horizonte', industry: 'Construcción', city: 'Cali', country: 'Colombia', employeeCount: 480, email: 'compras@horizonte.co', phone: '+57 2 6667788' },
    { name: 'TechNova Soluciones', industry: 'Tecnología', city: 'Bogotá', country: 'Colombia', employeeCount: 60, email: 'hola@technova.io', phone: '+57 1 7778899' },
    { name: 'Distribuidora del Caribe', industry: 'Logística', city: 'Barranquilla', country: 'Colombia', employeeCount: 150, email: 'info@discaribe.com', phone: '+57 5 3332211' },
    { name: 'Clínica San Rafael', industry: 'Salud', city: 'Medellín', country: 'Colombia', employeeCount: 310, email: 'administracion@sanrafael.org', phone: '+57 4 2223344' },
  ];
  const companies: Company[] = [];
  for (const def of companyDefs) {
    companies.push(await companiesService.create(tenantId, def));
  }

  const contactDefs: Array<[number, string, string, string]> = [
    [0, 'María', 'Restrepo', 'Gerente de Compras'],
    [0, 'Andrés', 'Zapata', 'Director Financiero'],
    [1, 'Diana', 'Torres', 'Propietaria'],
    [1, 'Felipe', 'Ortiz', 'Encargado de Bodega'],
    [2, 'Sandra', 'Bautista', 'Directora de Obra'],
    [2, 'Julián', 'Peña', 'Jefe de Compras'],
    [3, 'Camila', 'Rojas', 'CTO'],
    [3, 'Esteban', 'Vargas', 'Gerente Comercial'],
    [4, 'Paola', 'Mendoza', 'Coordinadora Logística'],
    [4, 'Ricardo', 'Salas', 'Gerente General'],
    [5, 'Lucía', 'Herrera', 'Directora Administrativa'],
    [5, 'Mauricio', 'Cárdenas', 'Jefe de Compras'],
  ];
  const contacts: Contact[] = [];
  for (const [companyIdx, firstName, lastName, position] of contactDefs) {
    const company = companies[companyIdx];
    contacts.push(
      await contactsService.create(tenantId, {
        companyId: company.id,
        firstName,
        lastName,
        position,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.split(' ')[0].toLowerCase()}.com`,
        phone: '+57 300 555 0000',
      }),
    );
  }

  // --- CRM: leads ---
  const leadsService = app.get(LeadsService);
  const leadDefs = [
    { name: 'Muebles del Norte', source: 'web', campaign: null, interest: 'Cotización de uniformes industriales', estimatedBudget: 8500, status: LeadStatus.NEW, priority: LeadPriority.MEDIUM },
    { name: 'Almacenes Vivero', source: 'referido', campaign: null, interest: 'Suministro de herramientas', estimatedBudget: 15000, status: LeadStatus.CONTACTED, priority: LeadPriority.HIGH },
    { name: 'Grupo Edifica', source: 'feria', campaign: 'Feria Construcción 2026', interest: 'Materiales para proyecto residencial', estimatedBudget: 42000, status: LeadStatus.QUALIFIED, priority: LeadPriority.HIGH },
    { name: 'Panadería La Espiga', source: 'redes sociales', campaign: null, interest: 'Equipos de refrigeración', estimatedBudget: 6200, status: LeadStatus.NEW, priority: LeadPriority.LOW },
    { name: 'Textiles Modernos', source: 'referido', campaign: null, interest: 'Insumos textiles', estimatedBudget: 12800, status: LeadStatus.DISQUALIFIED, priority: LeadPriority.MEDIUM },
    { name: 'Colegio Nueva Era', source: 'web', campaign: null, interest: 'Mobiliario escolar', estimatedBudget: 9800, status: LeadStatus.CONTACTED, priority: LeadPriority.MEDIUM },
  ];
  const leads: Lead[] = [];
  for (let i = 0; i < leadDefs.length; i++) {
    const def = leadDefs[i];
    leads.push(
      await leadsService.create(tenantId, {
        name: def.name,
        source: def.source,
        campaign: def.campaign ?? undefined,
        interest: def.interest,
        estimatedBudget: def.estimatedBudget,
        status: def.status,
        priority: def.priority,
        ownerUserId: ownerOf(i),
      }),
    );
  }

  // --- CRM: pipeline y oportunidades ---
  const pipelineStagesService = app.get(PipelineStagesService);
  const stages = await pipelineStagesService.findAllOrdered(tenantId);
  const opportunitiesService = app.get(OpportunitiesService);

  const oppDefs = [
    { name: 'Uniformes industriales — Andina Textiles', companyIdx: 0, contactIdx: 0, stage: 0, value: 8500 },
    { name: 'Suministro herramientas — El Roble', companyIdx: 1, contactIdx: 2, stage: 1, value: 15000 },
    { name: 'Materiales proyecto residencial — Horizonte', companyIdx: 2, contactIdx: 4, stage: 2, value: 42000 },
    { name: 'Licencias software — TechNova', companyIdx: 3, contactIdx: 6, stage: 3, value: 21000 },
    { name: 'Renovación flota — Distribuidora del Caribe', companyIdx: 4, contactIdx: 8, stage: 1, value: 33000 },
    { name: 'Equipamiento clínico — San Rafael', companyIdx: 5, contactIdx: 10, stage: 0, value: 27500 },
  ];
  const opportunities: Opportunity[] = [];
  for (let i = 0; i < oppDefs.length; i++) {
    const def = oppDefs[i];
    const opp = await opportunitiesService.create(tenantId, {
      name: def.name,
      companyId: companies[def.companyIdx].id,
      contactId: contacts[def.contactIdx].id,
      stageId: stages[Math.min(def.stage, stages.length - 1)].id,
      value: def.value,
      ownerUserId: ownerOf(i),
      expectedCloseDate: new Date(Date.now() + (10 + i * 5) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    opportunities.push(opp);
  }
  // Cierra una como ganada y otra como perdida, para que el funnel no esté vacío.
  const wonStage = stages.find((s) => s.isWon);
  if (wonStage) await opportunitiesService.moveStage(tenantId, opportunities[4].id, wonStage.id);
  await opportunitiesService.closeLost(tenantId, opportunities[5].id, 'Presupuesto insuficiente del cliente');

  // --- CRM: actividades ---
  const activitiesService = app.get(ActivitiesService);
  const activityDefs = [
    { type: ActivityType.CALL, subject: 'Llamada de seguimiento', contactIdx: 0, opportunityIdx: 0, done: true, outcome: 'Interesado, pidió cotización formal' },
    { type: ActivityType.MEETING, subject: 'Reunión de presentación', contactIdx: 4, opportunityIdx: 2, done: true, outcome: 'Reunión positiva, avanzan a negociación' },
    { type: ActivityType.VISIT, subject: 'Visita a bodega del cliente', contactIdx: 2, opportunityIdx: 1, done: true, outcome: 'Confirmaron volúmenes requeridos' },
    { type: ActivityType.EMAIL, subject: 'Envío de ficha técnica', contactIdx: 6, opportunityIdx: 3, done: true, outcome: 'Ficha enviada, esperando retroalimentación' },
    { type: ActivityType.TASK, subject: 'Preparar propuesta comercial', contactIdx: 8, opportunityIdx: 4, done: false, scheduledInDays: 3 },
    { type: ActivityType.NOTE, subject: 'Nota interna sobre condiciones de pago', contactIdx: 10, opportunityIdx: null, done: true, outcome: null },
  ];
  for (let i = 0; i < activityDefs.length; i++) {
    const def = activityDefs[i];
    await activitiesService.create(tenantId, ownerOf(i), {
      type: def.type,
      subject: def.subject,
      contactId: contacts[def.contactIdx].id,
      opportunityId: def.opportunityIdx !== null ? opportunities[def.opportunityIdx].id : undefined,
      ownerUserId: ownerOf(i),
      scheduledAt: def.scheduledInDays ? new Date(Date.now() + def.scheduledInDays * 24 * 60 * 60 * 1000).toISOString() : undefined,
      outcome: def.outcome ?? undefined,
    });
  }

  // --- CRM: cotizaciones ---
  const quotesService = app.get(QuotesService);
  const quoteDefs = [
    { companyIdx: 0, contactIdx: 0, opportunityIdx: 0, items: [{ description: 'Uniforme industrial talla M', quantity: 100, unitPrice: 45 }, { description: 'Bordado de logo', quantity: 100, unitPrice: 5 }], sendStatus: 'draft' as const },
    { companyIdx: 1, contactIdx: 2, opportunityIdx: 1, items: [{ description: 'Kit de herramientas manuales', quantity: 20, unitPrice: 350 }, { description: 'Taladro industrial', quantity: 10, unitPrice: 420 }], sendStatus: 'sent' as const },
    { companyIdx: 2, contactIdx: 4, opportunityIdx: 2, items: [{ description: 'Cemento (bolsa 50kg)', quantity: 600, unitPrice: 12 }, { description: 'Varilla de refuerzo 3/8"', quantity: 400, unitPrice: 8 }], sendStatus: 'accepted' as const },
    { companyIdx: 5, contactIdx: 10, opportunityIdx: 5, items: [{ description: 'Camilla hospitalaria', quantity: 8, unitPrice: 950 }, { description: 'Monitor de signos vitales', quantity: 4, unitPrice: 1800 }], sendStatus: 'rejected' as const },
  ];
  const quotes: Quote[] = [];
  for (let i = 0; i < quoteDefs.length; i++) {
    const def = quoteDefs[i];
    const quote = await quotesService.create(tenantId, ownerOf(i), {
      companyId: companies[def.companyIdx].id,
      contactId: contacts[def.contactIdx].id,
      opportunityId: opportunities[def.opportunityIdx].id,
      taxRate: 19,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      items: def.items,
    });
    quotes.push(quote);
    if (def.sendStatus !== 'draft') {
      const sent = await quotesService.send(tenantId, quote.id);
      if (def.sendStatus === 'accepted') await quotesService.respond(sent.accessToken, true);
      if (def.sendStatus === 'rejected') await quotesService.respond(sent.accessToken, false);
    }
  }

  // --- Inventario: bodegas, categorías, unidades y productos ---
  const warehousesService = app.get(WarehousesService);
  const mainWarehouse = await warehousesService.create(tenantId, { name: 'Bodega Principal', address: 'Cra 45 #12-30, Bogotá' });
  const northWarehouse = await warehousesService.create(tenantId, { name: 'Bodega Norte', address: 'Cl 80 #55-10, Bogotá' });

  const categoriesService = app.get(ProductCategoriesService);
  const cElectronica = await categoriesService.create(tenantId, { name: 'Electrónica' });
  const cOficina = await categoriesService.create(tenantId, { name: 'Oficina' });
  const cConsumibles = await categoriesService.create(tenantId, { name: 'Consumibles' });

  const unitsService = app.get(ProductUnitsService);
  const uUnidad = await unitsService.create(tenantId, { name: 'Unidad' });
  const uCaja = await unitsService.create(tenantId, { name: 'Caja x12' });
  const uKit = await unitsService.create(tenantId, { name: 'Kit' });

  const productsService = app.get(ProductsService);
  const productDefs = [
    { sku: 'ELEC-001', name: 'Monitor LED 24"', categoryId: cElectronica.id, unitId: uUnidad.id, warehouseId: mainWarehouse.id, costPrice: 320, salePrice: 480, minStock: 5, initialStock: 25 },
    { sku: 'ELEC-002', name: 'Teclado inalámbrico', categoryId: cElectronica.id, unitId: uUnidad.id, warehouseId: mainWarehouse.id, costPrice: 45, salePrice: 75, minStock: 10, initialStock: 60 },
    { sku: 'ELEC-003', name: 'Disco SSD 1TB', categoryId: cElectronica.id, unitId: uUnidad.id, warehouseId: northWarehouse.id, costPrice: 90, salePrice: 140, minStock: 8, initialStock: 40 },
    { sku: 'OFIC-001', name: 'Silla ergonómica', categoryId: cOficina.id, unitId: uUnidad.id, warehouseId: mainWarehouse.id, costPrice: 180, salePrice: 290, minStock: 4, initialStock: 15 },
    { sku: 'OFIC-002', name: 'Escritorio ejecutivo', categoryId: cOficina.id, unitId: uUnidad.id, warehouseId: mainWarehouse.id, costPrice: 250, salePrice: 400, minStock: 3, initialStock: 10 },
    { sku: 'CONS-001', name: 'Resma papel carta', categoryId: cConsumibles.id, unitId: uCaja.id, warehouseId: northWarehouse.id, costPrice: 22, salePrice: 35, minStock: 20, initialStock: 100 },
    { sku: 'CONS-002', name: 'Kit de aseo industrial', categoryId: cConsumibles.id, unitId: uKit.id, warehouseId: northWarehouse.id, costPrice: 38, salePrice: 60, minStock: 12, initialStock: 45 },
    { sku: 'ELEC-004', name: 'Impresora multifuncional', categoryId: cElectronica.id, unitId: uUnidad.id, warehouseId: mainWarehouse.id, costPrice: 210, salePrice: 340, minStock: 3, initialStock: 12 },
  ];
  const stockService = app.get(StockService);
  const productsBySku: Record<string, Awaited<ReturnType<typeof productsService.create>>> = {};
  for (const def of productDefs) {
    const product = await productsService.create(tenantId, {
      sku: def.sku,
      name: def.name,
      categoryId: def.categoryId,
      unitId: def.unitId,
      warehouseId: def.warehouseId,
      costPrice: def.costPrice,
      salePrice: def.salePrice,
      minStock: def.minStock,
    });
    productsBySku[def.sku] = product;
    await stockService.recordMovement(tenantId, adminId, {
      productId: product.id,
      warehouseId: def.warehouseId,
      type: StockMovementType.PURCHASE,
      quantity: def.initialStock,
      direction: 'in',
      note: 'Carga de inventario inicial (seed demo)',
    });
  }

  // --- Compras: proveedores y órdenes de compra ---
  const suppliersService = app.get(SuppliersService);
  const supplierDefs = [
    { name: 'Importadora Digital S.A.S.', email: 'ventas@importadoradigital.com', phone: '+57 1 4448800' },
    { name: 'Muebles y Diseño Ltda.', email: 'pedidos@mueblesydiseno.com', phone: '+57 4 5559900' },
    { name: 'Papelería Central', email: 'contacto@papeleriacentral.com', phone: '+57 1 3332200' },
  ];
  const suppliers: Supplier[] = [];
  for (const def of supplierDefs) {
    suppliers.push(await suppliersService.create(tenantId, def));
  }

  const purchaseOrdersService = app.get(PurchaseOrdersService);
  const po1 = await purchaseOrdersService.create(tenantId, adminId, {
    supplierId: suppliers[0].id,
    expectedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    items: [
      { productId: productsBySku['ELEC-001'].id, description: 'Monitor LED 24"', quantity: 20, unitCost: 320 },
      { productId: productsBySku['ELEC-003'].id, description: 'Disco SSD 1TB', quantity: 30, unitCost: 90 },
    ],
  });
  await purchaseOrdersService.send(tenantId, po1.id);

  const po2 = await purchaseOrdersService.create(tenantId, adminId, {
    supplierId: suppliers[1].id,
    expectedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    items: [{ productId: productsBySku['OFIC-002'].id, description: 'Escritorio ejecutivo', quantity: 8, unitCost: 250 }],
  });
  const po2Sent = await purchaseOrdersService.send(tenantId, po2.id);
  await purchaseOrdersService.receive(tenantId, po2.id, adminId, {
    lines: [{ itemId: po2Sent.items[0].id, quantity: 8, warehouseId: mainWarehouse.id }],
  });

  await purchaseOrdersService.create(tenantId, adminId, {
    supplierId: suppliers[2].id,
    items: [{ productId: productsBySku['CONS-001'].id, description: 'Resma papel carta', quantity: 50, unitCost: 22 }],
  });

  // --- Contabilidad: cuenta bancaria y un asiento manual ---
  const accountingService = app.get(AccountingService);
  const accounts = await accountingService.findAllForTenant(tenantId);
  const bankAccount = accounts.find((a) => a.code === '1110');
  const adminExpenseAccount = accounts.find((a) => a.code === '5135');
  const capitalAccount = accounts.find((a) => a.code === '3105');
  if (bankAccount && capitalAccount) {
    const cashAccount = await accountingService.createCashAccount(tenantId, {
      name: 'Bancolombia Cta. Corriente',
      type: CashAccountType.BANK,
      accountId: bankAccount.id,
    });
    await accountingService.deposit(tenantId, adminId, cashAccount.id, {
      contraAccountId: capitalAccount.id,
      amount: 15000,
      note: 'Capital inicial de apertura',
    });
  }
  if (bankAccount && adminExpenseAccount) {
    await accountingService.createManualEntry(tenantId, adminId, {
      date: new Date().toISOString().slice(0, 10),
      description: 'Pago de arriendo de oficina',
      lines: [
        { accountId: adminExpenseAccount.id, debit: 1200, credit: 0 },
        { accountId: bankAccount.id, debit: 0, credit: 1200 },
      ],
    });
  }

  // --- Facturación ---
  const invoicesService = app.get(InvoicesService);
  const inv1 = await invoicesService.create(tenantId, adminId, {
    companyId: companies[1].id,
    contactId: contacts[2].id,
    taxRate: 19,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    items: [{ description: 'Kit de herramientas manuales', quantity: 20, unitPrice: 350 }],
  });
  await invoicesService.issue(tenantId, adminId, inv1.id);
  await invoicesService.addPayment(tenantId, inv1.id, adminId, { amount: 3000, paidAt: new Date().toISOString().slice(0, 10), method: 'transferencia' });

  const acceptedQuote = quotes[2];
  const inv2 = await invoicesService.createFromQuote(tenantId, adminId, acceptedQuote.id, new Date().toISOString().slice(0, 10));
  await invoicesService.issue(tenantId, adminId, inv2.id);

  await invoicesService.create(tenantId, adminId, {
    companyId: companies[3].id,
    contactId: contacts[6].id,
    taxRate: 19,
    issueDate: new Date().toISOString().slice(0, 10),
    items: [{ description: 'Licencia anual de software', quantity: 1, unitPrice: 21000 }],
  }); // queda en borrador

  // --- Activos fijos ---
  const fixedAssetsService = app.get(FixedAssetsService);
  await fixedAssetsService.create(tenantId, {
    name: 'Vehículo de reparto Chevrolet NHR',
    purchaseDate: '2024-03-15',
    purchaseCost: 38000,
    usefulLifeMonths: 60,
    salvageValue: 5000,
    responsibleUserId: carlos.id,
  });
  await fixedAssetsService.create(tenantId, {
    name: 'Laptop Dell Latitude (Gerencia)',
    purchaseDate: '2025-01-10',
    purchaseCost: 1800,
    usefulLifeMonths: 36,
    responsibleUserId: adminId,
  });
  await fixedAssetsService.create(tenantId, {
    name: 'Mobiliario sala de juntas',
    purchaseDate: '2023-08-01',
    purchaseCost: 4200,
    usefulLifeMonths: 84,
    responsibleUserId: laura.id,
  });

  // --- Servicio al cliente ---
  const knowledgeService = app.get(KnowledgeService);
  await knowledgeService.create(tenantId, adminId, {
    title: '¿Cómo hago seguimiento a mi pedido?',
    content: 'Ingresa a la sección de Facturación con el enlace que te enviamos por correo para ver el estado de tu pedido en tiempo real.',
    category: 'Pedidos',
    isPublished: true,
  });
  await knowledgeService.create(tenantId, adminId, {
    title: 'Política de cambios y devoluciones',
    content: 'Aceptamos cambios dentro de los 15 días posteriores a la entrega, siempre que el producto conserve su empaque original.',
    category: 'Políticas',
    isPublished: true,
  });

  const ticketsService = app.get(TicketsService);
  const ticketDefs = [
    { subject: 'Retraso en la entrega del pedido', description: 'El pedido debía llegar ayer y no ha sido despachado.', priority: TicketPriority.HIGH, companyIdx: 1, contactIdx: 2 },
    { subject: 'Factura con valor incorrecto', description: 'La factura enviada no coincide con la cotización aprobada.', priority: TicketPriority.MEDIUM, companyIdx: 2, contactIdx: 4 },
    { subject: 'Consulta sobre garantía de producto', description: '¿Cuánto dura la garantía del monitor LED?', priority: TicketPriority.LOW, companyIdx: 3, contactIdx: 6 },
    { subject: 'Solicitud de nueva cotización', description: 'Necesitamos ampliar el pedido con 10 unidades adicionales.', priority: TicketPriority.MEDIUM, companyIdx: 4, contactIdx: 8 },
  ];
  const tickets: Ticket[] = [];
  for (const def of ticketDefs) {
    tickets.push(
      await ticketsService.create(tenantId, {
        subject: def.subject,
        description: def.description,
        priority: def.priority,
        companyId: companies[def.companyIdx].id,
        contactId: contacts[def.contactIdx].id,
      }),
    );
  }
  await ticketsService.assign(tenantId, tickets[0].id, laura.id);
  await ticketsService.updateStatus(tenantId, tickets[0].id, TicketStatus.IN_PROGRESS);
  await ticketsService.assign(tenantId, tickets[1].id, adminId);
  await ticketsService.escalate(tenantId, tickets[1].id);
  await ticketsService.assign(tenantId, tickets[2].id, carlos.id);
  await ticketsService.updateStatus(tenantId, tickets[2].id, TicketStatus.RESOLVED);
  await ticketsService.updateStatus(tenantId, tickets[2].id, TicketStatus.CLOSED);

  // --- Marketing ---
  const campaignsService = app.get(CampaignsService);
  await campaignsService.create(tenantId, adminId, {
    name: 'Lanzamiento línea de electrónica',
    channel: CampaignChannel.EMAIL,
    subject: 'Nuevos productos de electrónica ya disponibles',
    content: '<p>Conoce nuestra nueva línea de monitores, teclados y discos SSD con precios preferenciales.</p>',
  });
  const sentCampaign = await campaignsService.create(tenantId, adminId, {
    name: 'Promoción fin de trimestre',
    channel: CampaignChannel.EMAIL,
    subject: 'Descuentos especiales fin de trimestre',
    content: '<p>Aprovecha nuestros descuentos exclusivos antes de que termine el trimestre.</p>',
  });
  await campaignsService.send(tenantId, adminId, sentCampaign.id, { contactIds: [contacts[0].id, contacts[2].id, contacts[6].id] });

  const landingFormsService = app.get(LandingFormsService);
  const form = await landingFormsService.create(tenantId, { name: 'Formulario Feria Construcción 2026', campaignName: 'Feria Construcción 2026' });
  await landingFormsService.submit(tenantId, form, { name: 'José Manrique', email: 'jose.manrique@example.com', companyName: 'Manrique Ingeniería', message: 'Interesados en materiales de construcción para proyecto en Cali' });

  const nurtureService = app.get(NurtureService);
  const sequence = await nurtureService.create(tenantId, {
    name: 'Bienvenida a nuevos leads',
    steps: [
      { delayDays: 0, subject: '¡Bienvenido!', content: 'Gracias por tu interés, en breve te contactaremos.' },
      { delayDays: 3, subject: '¿Cómo podemos ayudarte?', content: 'Cuéntanos más sobre lo que necesitas y te enviamos una propuesta.' },
      { delayDays: 7, subject: 'Última oportunidad', content: 'Nuestra oferta especial vence pronto — no te la pierdas.' },
    ],
  });
  await nurtureService.enroll(tenantId, sequence.id, [contacts[0].id, contacts[8].id]);

  console.log('Datos mock sembrados con éxito:');
  console.log(`  ${companies.length} empresas, ${contacts.length} contactos, ${leads.length} leads, ${opportunities.length} oportunidades`);
  console.log(`  ${quotes.length} cotizaciones, ${productDefs.length} productos, 2 bodegas, 3 proveedores, 3 órdenes de compra`);
  console.log('  3 facturas, 3 activos fijos, 2 artículos de conocimiento, 4 tickets');
  console.log('  2 campañas de marketing, 1 formulario de captura, 1 secuencia de nutrición');
  console.log('Usuarios de ventas creados: laura.gomez@cliente.com / carlos.ramirez@cliente.com (clave: Vendedor123!)');

  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
