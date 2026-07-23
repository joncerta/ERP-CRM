import { Module } from '@nestjs/common';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { ModulesCatalogModule } from './modules-catalog/modules-catalog.module';
import { SessionsModule } from './sessions/sessions.module';
import { OrgModule } from './org/org.module';
import { TaxesModule } from './taxes/taxes.module';

@Module({
  imports: [
    TenantsModule,
    UsersModule,
    AuthModule,
    RolesModule,
    CurrenciesModule,
    ModulesCatalogModule,
    SessionsModule,
    OrgModule,
    TaxesModule,
  ],
  exports: [
    TenantsModule,
    UsersModule,
    RolesModule,
    CurrenciesModule,
    ModulesCatalogModule,
    SessionsModule,
    OrgModule,
    TaxesModule,
  ],
})
export class CoreModule {}
