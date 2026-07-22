import { Module } from '@nestjs/common';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { I18nModule, AcceptLanguageResolver, HeaderResolver } from 'nestjs-i18n';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmDataSourceOptions } from './config/typeorm.config';
import { CoreModule } from './core/core.module';
import { CrmModule } from './crm/crm.module';
import { InventoryModule } from './inventory/inventory.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { ModuleEnabledGuard } from './common/guards/module-enabled.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(typeOrmDataSourceOptions),
    I18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: { path: join(__dirname, 'i18n'), watch: true },
      resolvers: [new HeaderResolver(['x-lang']), AcceptLanguageResolver],
    }),
    CoreModule,
    CrmModule,
    InventoryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ModuleEnabledGuard },
  ],
})
export class AppModule {}
