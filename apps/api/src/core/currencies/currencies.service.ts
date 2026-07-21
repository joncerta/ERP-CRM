import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';

@Injectable()
export class CurrenciesService {
  constructor(@InjectRepository(Currency) private readonly repo: Repository<Currency>) {}

  findAll(): Promise<Currency[]> {
    return this.repo.find({ order: { code: 'ASC' } });
  }
}
