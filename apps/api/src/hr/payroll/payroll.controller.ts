import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollRunDto } from './dto/create-payroll-run.dto';
import { ProcessPayrollRunDto } from './dto/process-payroll-run.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';

@Controller('hr/payroll/runs')
@RequireModule('hr')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  @RequirePermissions('hr.payroll.write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePayrollRunDto) {
    return this.payrollService.create(user.tenantId, dto);
  }

  @Get()
  @RequirePermissions('hr.payroll.read')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.payrollService.findAllForTenant(user.tenantId);
  }

  @Get(':id/lines')
  @RequirePermissions('hr.payroll.read')
  findLines(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.payrollService.findLines(user.tenantId, id);
  }

  @Post(':id/process')
  @RequirePermissions('hr.payroll.write')
  process(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ProcessPayrollRunDto) {
    return this.payrollService.process(user.tenantId, id, dto);
  }
}
