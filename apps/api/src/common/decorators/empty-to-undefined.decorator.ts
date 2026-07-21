import { Transform } from 'class-transformer';

/**
 * Put on optional DTO fields validated with a format decorator (@IsEmail,
 * @IsUUID, etc). class-validator's @IsOptional() only skips validation for
 * undefined/null — an empty string from a blank form field still gets
 * validated and rejected. This normalizes '' to undefined first.
 */
export function EmptyToUndefined() {
  return Transform(({ value }) => (value === '' ? undefined : value));
}
