import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const typeOrmDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'erp_crm',
  password: process.env.DB_PASSWORD ?? 'erp_crm',
  database: process.env.DB_NAME ?? 'erp_crm',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

export const typeOrmConfig = registerAs('typeorm', () => typeOrmDataSourceOptions);

// Used by the TypeORM CLI (migration:generate / migration:run).
export default new DataSource(typeOrmDataSourceOptions);
