import { Dimensions, PixelRatio } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Constants & Guidelines
// ---------------------------------------------------------------------------
// Standard iPhone 14 / Pixel 7 aspect ratio (approx 390x844)
export const GUIDELINE_W = 390;
export const GUIDELINE_H = 844;

/**
 * Standard horizontal scaling.
 */
export const scale = (size: number) => (W / GUIDELINE_W) * size;

/**
 * Standard vertical scaling.
 */
export const verticalScale = (size: number) => (H / GUIDELINE_H) * size;

/**
 * Responsive Size Helper (Liquid Scaling)
 * Chooses the smaller of horizontal and vertical scale to guarantee fit.
 */
export const rs = (size: number) => Math.min(scale(size), verticalScale(size));

/**
 * Moderate scaling for typography.
 */
export const moderateScale = (size: number, factor = 0.5) =>
  size + (scale(size) - size) * factor;

/**
 * Ultra-Aggressive vertical scaling factor.
 */
export const vLimit = (size: number, limit = 0.8) => {
  const scaled = verticalScale(size);
  return H < 700 ? Math.min(scaled, size * limit) : scaled;
};

// Aliases for compatibility and brevity
export const vs = verticalScale;
export const s = scale;
export const ms = moderateScale;
export const vScaleLimit = vLimit;

export const isShort = H < 700;
export const isCramped = H < 640;
export const width = W;
export const height = H;
export const fontScale = PixelRatio.getFontScale();
