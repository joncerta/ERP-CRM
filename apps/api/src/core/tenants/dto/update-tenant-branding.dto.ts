import { IsOptional, Matches, ValidateIf } from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class UpdateTenantBrandingDto {
  /** Send null to clear the override and fall back to the default palette. */
  @ValidateIf((o) => o.primaryColor !== null)
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'primaryColor debe ser un color hex (#RRGGBB)' })
  primaryColor?: string | null;

  @ValidateIf((o) => o.secondaryColor !== null)
  @IsOptional()
  @Matches(HEX_COLOR, { message: 'secondaryColor debe ser un color hex (#RRGGBB)' })
  secondaryColor?: string | null;
}
