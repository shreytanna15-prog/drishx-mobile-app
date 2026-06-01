/** DrishX semantic palette — use via `useBrandColors()` / `useThemedStyles()`. */

export type BrandColorScheme = {
  background: string;
  card: string;
  cardBorder: string;
  cardElevated: string;
  menuRow: string;
  menuRowAlt: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
  label: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  link: string;
  success: string;
  danger: string;
  dangerMuted: string;
  overlay: string;
};

export const BrandColorsDark: BrandColorScheme = {
  background: '#0B0F14',
  card: '#0F1620',
  cardBorder: 'rgba(240, 161, 50, 0.18)',
  cardElevated: '#101A2A',
  menuRow: '#111F31',
  menuRowAlt: '#0D1726',
  primary: '#F0A132',
  primaryText: '#0B0F14',
  text: '#EAF0FA',
  textMuted: '#AAB2C0',
  label: '#B9C0CC',
  inputBg: '#0B0F14',
  inputBorder: 'rgba(240, 161, 50, 0.28)',
  placeholder: '#6B7280',
  link: '#F0A132',
  success: '#7DD3A8',
  danger: '#FCA5A5',
  dangerMuted: '#FDA4AF',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const BrandColorsLight: BrandColorScheme = {
  background: '#FFFFFF',
  card: '#FFFFFF',
  cardBorder: 'rgba(240, 161, 50, 0.35)',
  cardElevated: '#FFFFFF',
  menuRow: '#F9FAFB',
  menuRowAlt: '#F3F4F6',
  primary: '#F0A132',
  primaryText: '#0B0F14',
  text: '#0B0F14',
  textMuted: '#6B7280',
  label: '#4B5563',
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(240, 161, 50, 0.45)',
  placeholder: '#9CA3AF',
  link: '#C27803',
  success: '#059669',
  danger: '#DC2626',
  dangerMuted: '#B91C1C',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

/** @deprecated Use `useBrandColors()` for theme-aware colors. Kept for gradual migration. */
export const BrandColors = BrandColorsDark;

export function getBrandColorsForScheme(scheme: 'light' | 'dark'): BrandColorScheme {
  return scheme === 'light' ? BrandColorsLight : BrandColorsDark;
}
