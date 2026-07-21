import 'reflect-metadata';
import dataSource from '../../config/typeorm.config';
import { Currency } from '../../core/currencies/entities/currency.entity';
import { ModuleDefinition } from '../../core/modules-catalog/entities/module-definition.entity';

const CURRENCIES = [
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', decimalPlaces: 2 },
  { code: 'COP', name: 'Peso colombiano', symbol: '$', decimalPlaces: 0 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$', decimalPlaces: 2 },
];

const MODULES = [
  { code: 'crm', name: 'CRM Comercial', description: 'Contactos, leads, oportunidades y cotizaciones', isCore: false },
];

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

  console.log(`Seed completo: ${CURRENCIES.length} monedas, ${MODULES.length} módulos.`);
  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
