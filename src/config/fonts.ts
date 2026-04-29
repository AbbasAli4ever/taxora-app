// Font map for expo-font loading
// Place font files in src/assets/fonts/ and register here
export const FONTS = {
  'Inter-Regular':    require('../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium':     require('../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold':   require('../assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold':       require('../assets/fonts/Inter-Bold.ttf'),
} as const;

export type FontKey = keyof typeof FONTS;
