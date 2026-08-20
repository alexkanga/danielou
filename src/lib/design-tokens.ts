/**
 * Daniélou Abidjan Design Tokens
 * 
 * Centralized design tokens for consistent styling across the application.
 * Import these constants in components to avoid magic values.
 * All values are synced with the CSS custom properties defined in globals.css.
 */

// ─────────────────────────────────────────────
// Brand Colors
// ─────────────────────────────────────────────

export const brandColors = {
  primary: '#0060A0',
  secondary: '#6098C8',
  accent: '#F8A830',
  accentDark: '#D05020',
} as const;

export type BrandColor = keyof typeof brandColors;

// ─────────────────────────────────────────────
// Neutral Colors
// ─────────────────────────────────────────────

export const neutralColors = {
  surfaceBg: '#F5F7FA',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
} as const;

export type NeutralColor = keyof typeof neutralColors;

// ─────────────────────────────────────────────
// Semantic Colors
// ─────────────────────────────────────────────

export const semanticColors = {
  success: {
    main: '#16A34A',
    light: '#F0FDF4',
  },
  warning: {
    main: '#D97706',
    light: '#FFFBEB',
  },
  danger: {
    main: '#DC2626',
    light: '#FEF2F2',
  },
  info: {
    main: '#0060A0',
    light: '#EFF6FF',
  },
} as const;

export type SemanticColorName = keyof typeof semanticColors;

// ─────────────────────────────────────────────
// Sidebar Colors
// ─────────────────────────────────────────────

export const sidebarColors = {
  bg: '#0060A0',
  text: '#FFFFFF',
  hover: 'rgba(255, 255, 255, 0.1)',
  active: 'rgba(255, 255, 255, 0.2)',
} as const;

// ─────────────────────────────────────────────
// Typography — Font Sizes (in rem)
// ─────────────────────────────────────────────

export const fontSizes = {
  xs: '0.75rem',     // 12px
  sm: '0.875rem',    // 14px
  base: '1rem',      // 16px
  lg: '1.125rem',    // 18px
  xl: '1.25rem',     // 20px
  '2xl': '1.5rem',   // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem',  // 36px
  '5xl': '3rem',     // 48px
} as const;

export type FontSize = keyof typeof fontSizes;

// ─────────────────────────────────────────────
// Typography — Font Weights
// ─────────────────────────────────────────────

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export type FontWeight = keyof typeof fontWeights;

// ─────────────────────────────────────────────
// Spacing Scale (in rem)
// ─────────────────────────────────────────────

export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem',     // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
} as const;

export type Spacing = keyof typeof spacing;

// ─────────────────────────────────────────────
// Border Radius
// ─────────────────────────────────────────────

export const borderRadius = {
  sm: '0.375rem', // 6px
  md: '0.5rem',   // 8px
  lg: '0.75rem',  // 12px
  xl: '1rem',     // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

export type BorderRadius = keyof typeof borderRadius;

// ─────────────────────────────────────────────
// Convenience: All tokens in one object
// ─────────────────────────────────────────────

export const tokens = {
  brand: brandColors,
  neutral: neutralColors,
  semantic: semanticColors,
  sidebar: sidebarColors,
  fontSizes,
  fontWeights,
  spacing,
  borderRadius,
} as const;

export type DesignTokens = typeof tokens;