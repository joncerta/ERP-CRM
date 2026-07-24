import { Module } from '@nestjs/common';
import { EmployeesModule } from './employees/employees.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { PayrollModule } from './payroll/payroll.module';
import { PerformanceReviewsModule } from './performance-reviews/performance-reviews.module';

@Module({
  imports: [EmployeesModule, LeaveRequestsModule, PayrollModule, PerformanceReviewsModule],
})
export class HrModule {}
