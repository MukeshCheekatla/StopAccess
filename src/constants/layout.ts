import { Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * Nuvio-style Layout Constants
 * Standardized breakpoints and fluid dimensions for FocusGate.
 */
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

// Standard thresholds for layout branching
export const isShort = height < 700;
export const isTablet = width >= 768;
export const isIos = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// UI Constants (Fluent Spacing)
export const HORIZONTAL_PADDING = isTablet ? 32 : 20;
export const CARD_RADIUS = 16;
export const HEADER_HEIGHT = isIos ? 60 : (StatusBar.currentHeight || 24) + 50;

/**
 * Aspect-ratio based height calculation.
 * Ensures visually balanced cards across different aspect ratios.
 */
export const getResponsiveHeight = (percent: number) => {
  return (height * percent) / 100;
};

/**
 * Font sizing scale (Inspired by MD3 / Nuvio)
 * Use fixed dp for predictable physical size.
 */
export const TYPOGRAPHY = {
  h1: 34,
  h2: 24,
  h3: 20,
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 12,
  caption: 11,
};
