export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  roleId: string;
  permissions: string[];
}

export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  email: string;
  roleId: string;
  permissions: string[];
}
