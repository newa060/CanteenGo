export const FontFamily = {
  hanken: 'HankenGrotesk-Regular',
  hankenMedium: 'HankenGrotesk-Medium',
  hankenSemiBold: 'HankenGrotesk-SemiBold',
  hankenBold: 'HankenGrotesk-Bold',
  hankenExtraBold: 'HankenGrotesk-ExtraBold',
  mono: 'JetBrainsMono-Regular',
  monoMedium: 'JetBrainsMono-Medium',
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const LineHeight = {
  xs: 14,
  sm: 16,
  md: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
  '5xl': 48,
} as const;

export const Typography = {
  headlineXl: {
    fontFamily: FontFamily.hankenExtraBold,
    fontSize: FontSize['5xl'],
    lineHeight: LineHeight['5xl'],
    letterSpacing: -0.8,
  },
  headlineLg: {
    fontFamily: FontFamily.hankenBold,
    fontSize: FontSize['4xl'],
    lineHeight: LineHeight['4xl'],
    letterSpacing: -0.32,
  },
  headlineLgMobile: {
    fontFamily: FontFamily.hankenBold,
    fontSize: FontSize['3xl'],
    lineHeight: LineHeight['3xl'],
  },
  headlineMd: {
    fontFamily: FontFamily.hankenBold,
    fontSize: FontSize['2xl'],
    lineHeight: LineHeight['2xl'],
  },
  headlineSm: {
    fontFamily: FontFamily.hankenSemiBold,
    fontSize: FontSize.xl,
    lineHeight: LineHeight.xl,
  },
  bodyLg: {
    fontFamily: FontFamily.hanken,
    fontSize: FontSize.lg,
    lineHeight: LineHeight.lg,
  },
  bodyMd: {
    fontFamily: FontFamily.hanken,
    fontSize: FontSize.base,
    lineHeight: LineHeight.base,
  },
  bodySm: {
    fontFamily: FontFamily.hanken,
    fontSize: FontSize.md,
    lineHeight: LineHeight.md,
  },
  labelMd: {
    fontFamily: FontFamily.monoMedium,
    fontSize: FontSize.md,
    lineHeight: LineHeight.sm,
    letterSpacing: 0.7,
  },
  labelSm: {
    fontFamily: FontFamily.monoMedium,
    fontSize: FontSize.sm,
    lineHeight: LineHeight.xs,
    letterSpacing: 0.6,
  },
} as const;
