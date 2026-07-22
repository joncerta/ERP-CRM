export interface BrandingColors {
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

/**
 * Overrides the default palette tokens with the tenant's brand colors via
 * inline styles on :root — these win over the stylesheet's :root rule by
 * specificity, and removeProperty() cleanly reverts to the default when a
 * color isn't set (or when switching to a tenant/slug that has none).
 */
export function applyBranding(colors: BrandingColors): void {
  const root = document.documentElement

  if (colors.primaryColor) {
    root.style.setProperty('--color-primary', colors.primaryColor)
    root.style.setProperty('--color-primary-hover', `color-mix(in srgb, ${colors.primaryColor} 85%, black)`)
    root.style.setProperty('--color-primary-soft', `color-mix(in srgb, ${colors.primaryColor} 15%, white)`)
  } else {
    root.style.removeProperty('--color-primary')
    root.style.removeProperty('--color-primary-hover')
    root.style.removeProperty('--color-primary-soft')
  }

  if (colors.secondaryColor) {
    root.style.setProperty('--color-heading', colors.secondaryColor)
  } else {
    root.style.removeProperty('--color-heading')
  }
}
