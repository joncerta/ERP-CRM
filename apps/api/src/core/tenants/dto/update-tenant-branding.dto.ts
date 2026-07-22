import { IsOptional, Matches, MaxLength, ValidateIf } from 'class-validator';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const LOGO_DATA_URI = /^data:image\/(png|jpeg|jpg|svg\+xml|webp);base64,[A-Za-z0-9+/]+=*$/;
// ~375KB of raw image data once base64-decoded — enough for a crisp logo
// without letting someone stuff an oversized file into the tenants row.
const MAX_LOGO_DATA_URI_LENGTH = 500_000;

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

  /** Send null to clear the logo and fall back to the default letter mark. */
  @ValidateIf((o) => o.logoData !== null)
  @IsOptional()
  @MaxLength(MAX_LOGO_DATA_URI_LENGTH, { message: 'El logo es demasiado grande (máximo ~350KB)' })
  @Matches(LOGO_DATA_URI, { message: 'logoData debe ser una imagen PNG, JPEG, SVG o WebP en base64' })
  logoData?: string | null;
}
