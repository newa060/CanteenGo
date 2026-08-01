export const Colors = {
  primary: '#FF6600',
  primaryLight: '#FFB596',
  primaryDim: '#FF8533',
  primaryGlow: 'rgba(255, 102, 0, 0.15)',

  background: '#131313',
  backgroundDim: '#0E0E0E',

  surface: '#1A1A1A',
  surfaceAlt: '#201F1F',
  elevated: '#2A2A2A',
  elevatedHigh: '#353534',

  onSurface: '#E5E2E1',
  onSurfaceMuted: '#E3BFB1',
  onSurfaceDim: '#888888',
  onSurfaceDisabled: '#555555',

  outline: '#AA8A7D',
  outlineSubtle: '#5A4136',
  borderDefault: '#333333',

  success: '#10B981',
  successDim: '#065F46',
  successBg: 'rgba(16, 185, 129, 0.12)',

  danger: '#EF4444',
  dangerDim: '#7F1D1D',
  dangerBg: 'rgba(239, 68, 68, 0.12)',

  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.12)',

  secondary: '#C8C6C5',
  secondaryContainer: '#474746',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Glassmorphism
  glassBg: 'rgba(26, 26, 26, 0.85)',
  glassOverlay: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
} as const;

export type ColorKey = keyof typeof Colors;
