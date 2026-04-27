export const FontFamily = {
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const FontSize = {
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 22,
  h1: 24,
  display: 30,
  hero: 44,
} as const;

export const Spacing = {
  screenH: 18,
  screenV: 16,
  cardPadding: 14,
  cardPaddingLg: 16,
  gap: 12,
  gapSm: 8,
  gapLg: 14,
} as const;

export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  card: 16,
  cardLg: 18,
  rowCompact: 14,
  pill: 20,
  sheet: 22,
} as const;
