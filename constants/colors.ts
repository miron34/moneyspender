export const Colors = {
  bg: '#07091a',
  surface: '#0d1124',
  surfaceHigh: '#131929',
  surfaceTop: '#1a2235',
  border: 'rgba(255,255,255,0.07)',
  borderMid: 'rgba(255,255,255,0.11)',
  accent: '#3b5bdb',
  accentLight: '#5b78ff',
  text: '#f0f2ff',
  textDim: 'rgba(240,242,255,0.65)',
  textMuted: 'rgba(240,242,255,0.35)',
  negative: '#ff5757',
  positive: '#4caf50',
} as const;

export const withAlpha = (hex: string, alpha: number): string => {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return hex + a.toString(16).padStart(2, '0');
};
