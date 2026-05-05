// Design Brief §0 — exact palette
export const COLORS = {
  // Accent / Primary — Indigo 600
  accent: {
    primary: { light: '#4F46E5', dark: '#6366F1' },
    success: { light: '#16A34A', dark: '#22C55E' },
    warning: { light: '#F59E0B', dark: '#FBBF24' },
    danger: { light: '#DC2626', dark: '#EF4444' },
    info: { light: '#0EA5E9', dark: '#38BDF8' },
  },

  // Background
  bg: {
    primary: { light: '#FFFFFF', dark: '#0B0F17' },
    elevated: { light: '#F8FAFC', dark: '#111827' },
  },

  // Text
  text: {
    primary: { light: '#0F172A', dark: '#F1F5F9' },
    secondary: { light: '#64748B', dark: '#94A3B8' },
  },

  // Dividers
  divider: { light: '#E5E7EB', dark: '#1F2937' },

  // Raw palette kept for Tailwind config alignment
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
  },

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const SPACING = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  12: 48,
} as const;

export const FONT_SIZE = {
  // Design Brief scale: H1 28, H2 22, H3 18, Body 15, Caption 13, Tiny 11
  h1: 28,
  h2: 22,
  h3: 18,
  body: 15,
  caption: 13,
  tiny: 11,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;
