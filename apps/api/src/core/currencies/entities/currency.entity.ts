import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('currencies')
export class Currency extends BaseEntity {
  @PrimaryColumn({ length: 3 })
  code: string; // ISO 4217, e.g. USD, COP, EUR

  @Column()
  name: string;

  @Column()
  symbol: string;

  @Column({ name: 'decimal_places', default: 2 })
  decimalPlaces: number;
}
