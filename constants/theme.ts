// constants/theme.ts

// Theme color type definitions
export interface ThemeColors {
  primary: {
    DEFAULT: string;
    dark: string;
    light: string;
  };
  background: {
    main: string;
    light: string;
    dark: string;
  };
  text: {
    primary: string;
    secondary: string;
    inverse: string;
  };
  status: {
    success: string;
    error: string;
    warning: string;
  };
}

// Spacing type definitions
export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
}

// Typography type definitions
export interface ThemeTypography {
  sizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontFamily: {
    regular: string;
    medium: string;
    bold: string;
  };
}

// Theme constants
export const COLORS: ThemeColors = {
  primary: {
    DEFAULT: '#ffd33d',
    dark: '#ffc107',
    light: '#ffe066',
  },
  background: {
    main: '#25292e',
    light: '#3a3f44',
    dark: '#1a1d20',
  },
  text: {
    primary: '#ffffff',
    secondary: '#cccccc',
    inverse: '#000000',
  },
  status: {
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
  },
};

export const SPACING: ThemeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const TYPOGRAPHY: ThemeTypography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  },
  fontFamily: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    bold: 'PlusJakartaSans-Bold',
  },
};

// Export default theme object
export default {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
};