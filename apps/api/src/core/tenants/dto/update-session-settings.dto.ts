import { IsInt, Max, Min, ValidateIf } from 'class-validator';

export class UpdateSessionSettingsDto {
  /** Minutes of inactivity before a session is force-expired. Send null to disable idle expiry. */
  @ValidateIf((o) => o.sessionIdleTimeoutMinutes !== null)
  @IsInt()
  @Min(5)
  @Max(10_080) // 1 week
  sessionIdleTimeoutMinutes: number | null;
}
