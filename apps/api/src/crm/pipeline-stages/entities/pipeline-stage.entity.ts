import { Column, Entity } from 'typeorm';
import { TenantScopedEntity } from '../../../common/entities/tenant-scoped.entity';

export const DEFAULT_PIPELINE_STAGES: Array<{ name: string; order: number; probability: number; isWon: boolean; isLost: boolean }> = [
  { name: 'Nuevo', order: 1, probability: 10, isWon: false, isLost: false },
  { name: 'Contactado', order: 2, probability: 25, isWon: false, isLost: false },
  { name: 'Calificado', order: 3, probability: 40, isWon: false, isLost: false },
  { name: 'Propuesta', order: 4, probability: 60, isWon: false, isLost: false },
  { name: 'Negociación', order: 5, probability: 80, isWon: false, isLost: false },
  { name: 'Ganado', order: 6, probability: 100, isWon: true, isLost: false },
  { name: 'Perdido', order: 7, probability: 0, isWon: false, isLost: true },
];

@Entity('crm_pipeline_stages')
export class PipelineStage extends TenantScopedEntity {
  @Column()
  name: string;

  @Column()
  order: number;

  @Column({ default: 0 })
  probability: number;

  @Column({ name: 'is_won', default: false })
  isWon: boolean;

  @Column({ name: 'is_lost', default: false })
  isLost: boolean;
}
