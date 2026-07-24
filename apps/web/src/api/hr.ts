import { apiClient } from './client';
import type {
  Employee,
  ContractType,
  DocumentIdType,
  EmploymentStatus,
  LeaveRequest,
  LeaveType,
  VacationBalance,
  PayrollRun,
  PayrollRunLine,
  PerformanceReview,
  ScoredItem,
} from './types';

// --- Empleados ---

export interface CreateEmployeePayload {
  userId: string;
  documentType?: DocumentIdType;
  documentId: string;
  birthDate?: string;
  address?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  contractType?: ContractType;
  baseSalary: number;
  hireDate: string;
  vacationDaysPerYear?: number;
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {
  employmentStatus?: EmploymentStatus;
  terminationDate?: string;
}

export async function listEmployees(): Promise<Employee[]> {
  const { data } = await apiClient.get('/hr/employees');
  return data;
}

export async function createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
  const { data } = await apiClient.post('/hr/employees', payload);
  return data;
}

export async function updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
  const { data } = await apiClient.patch(`/hr/employees/${id}`, payload);
  return data;
}

// --- Vacaciones y licencias ---

export interface CreateLeaveRequestPayload {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}

export async function listLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get('/hr/leave-requests', { params: { employeeId } });
  return data;
}

export async function getVacationBalance(employeeId: string): Promise<VacationBalance> {
  const { data } = await apiClient.get(`/hr/leave-requests/vacation-balance/${employeeId}`);
  return data;
}

export async function createLeaveRequest(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
  const { data } = await apiClient.post('/hr/leave-requests', payload);
  return data;
}

export async function approveLeaveRequest(id: string, note?: string): Promise<LeaveRequest> {
  const { data } = await apiClient.patch(`/hr/leave-requests/${id}/approve`, { note });
  return data;
}

export async function rejectLeaveRequest(id: string, note?: string): Promise<LeaveRequest> {
  const { data } = await apiClient.patch(`/hr/leave-requests/${id}/reject`, { note });
  return data;
}

export async function cancelLeaveRequest(id: string): Promise<LeaveRequest> {
  const { data } = await apiClient.patch(`/hr/leave-requests/${id}/cancel`, {});
  return data;
}

// --- Nómina ---

export interface CreatePayrollRunPayload {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const { data } = await apiClient.get('/hr/payroll/runs');
  return data;
}

export async function createPayrollRun(payload: CreatePayrollRunPayload): Promise<PayrollRun> {
  const { data } = await apiClient.post('/hr/payroll/runs', payload);
  return data;
}

export async function processPayrollRun(id: string, overtimeByEmployee?: Array<{ employeeId: string; hours: number }>): Promise<PayrollRun> {
  const { data } = await apiClient.post(`/hr/payroll/runs/${id}/process`, { overtimeByEmployee });
  return data;
}

export async function listPayrollRunLines(runId: string): Promise<PayrollRunLine[]> {
  const { data } = await apiClient.get(`/hr/payroll/runs/${runId}/lines`);
  return data;
}

// --- Evaluaciones de desempeño ---

export interface CreatePerformanceReviewPayload {
  employeeId: string;
  periodLabel: string;
  objectives: ScoredItem[];
  competencies: ScoredItem[];
  comments?: string;
}

export async function listPerformanceReviews(employeeId: string): Promise<PerformanceReview[]> {
  const { data } = await apiClient.get('/hr/performance-reviews', { params: { employeeId } });
  return data;
}

export async function createPerformanceReview(payload: CreatePerformanceReviewPayload): Promise<PerformanceReview> {
  const { data } = await apiClient.post('/hr/performance-reviews', payload);
  return data;
}

export async function submitPerformanceReview(id: string): Promise<PerformanceReview> {
  const { data } = await apiClient.patch(`/hr/performance-reviews/${id}/submit`, {});
  return data;
}
