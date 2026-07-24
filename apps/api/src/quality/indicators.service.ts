import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QualityInspection, InspectionResult } from './entities/quality-inspection.entity';
import { NonConformity, NonConformityStatus, Severity } from './entities/non-conformity.entity';
import { ActionStatus } from './entities/corrective-action.entity';
import { Audit, AuditStatus } from './entities/audit.entity';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Every number here is computed on the fly from the current rows — no
 * separate indicators table to keep in sync, same "manageable scope"
 * approach as Projects' profitability. Fine at SME scale; would need real
 * aggregate queries if a tenant ever had a huge history. */
@Injectable()
export class IndicatorsService {
  constructor(
    @InjectRepository(QualityInspection) private readonly inspectionsRepo: Repository<QualityInspection>,
    @InjectRepository(NonConformity) private readonly nonConformitiesRepo: Repository<NonConformity>,
    @InjectRepository(Audit) private readonly auditsRepo: Repository<Audit>,
  ) {}

  async getIndicators(tenantId: string) {
    const [inspections, nonConformities, audits] = await Promise.all([
      this.inspectionsRepo.find({ where: { tenantId } }),
      this.nonConformitiesRepo.find({ where: { tenantId } }),
      this.auditsRepo.find({ where: { tenantId } }),
    ]);

    const passed = inspections.filter((i) => i.result === InspectionResult.PASS).length;
    const failed = inspections.filter((i) => i.result === InspectionResult.FAIL).length;
    const conditional = inspections.filter((i) => i.result === InspectionResult.CONDITIONAL).length;

    const today = new Date().toISOString().slice(0, 10);
    const actions = nonConformities.flatMap((nc) => nc.actions ?? []);

    return {
      inspections: {
        total: inspections.length,
        passed,
        failed,
        conditional,
        passRate: inspections.length > 0 ? round2((passed / inspections.length) * 100) : null,
      },
      nonConformities: {
        total: nonConformities.length,
        open: nonConformities.filter((nc) => nc.status === NonConformityStatus.OPEN).length,
        inProgress: nonConformities.filter((nc) => nc.status === NonConformityStatus.IN_PROGRESS).length,
        closed: nonConformities.filter((nc) => nc.status === NonConformityStatus.CLOSED).length,
        bySeverity: {
          minor: nonConformities.filter((nc) => nc.severity === Severity.MINOR).length,
          major: nonConformities.filter((nc) => nc.severity === Severity.MAJOR).length,
          critical: nonConformities.filter((nc) => nc.severity === Severity.CRITICAL).length,
        },
      },
      correctiveActions: {
        total: actions.length,
        pending: actions.filter((a) => a.status === ActionStatus.PENDING).length,
        inProgress: actions.filter((a) => a.status === ActionStatus.IN_PROGRESS).length,
        completed: actions.filter((a) => a.status === ActionStatus.COMPLETED).length,
        overdue: actions.filter((a) => a.status !== ActionStatus.COMPLETED && a.dueDate !== null && a.dueDate < today).length,
      },
      audits: {
        total: audits.length,
        planned: audits.filter((a) => a.status === AuditStatus.PLANNED).length,
        completed: audits.filter((a) => a.status === AuditStatus.COMPLETED).length,
        cancelled: audits.filter((a) => a.status === AuditStatus.CANCELLED).length,
      },
    };
  }
}
