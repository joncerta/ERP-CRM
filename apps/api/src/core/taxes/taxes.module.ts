import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tax } from './entities/tax.entity';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tax])],
  providers: [TaxesService],
  controllers: [TaxesController],
  exports: [TaxesService],
})
export class TaxesModule {}
