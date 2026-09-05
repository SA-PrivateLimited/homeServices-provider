import {PROVIDER_WEB} from 'sapvt-ltd-app-packages';

export interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  shadow: string;
  tabBar: string;
  placeholder: string;
}

/** Remote themeColors / colorPalette shape (subset used by mobile Theme). */
export interface ColorPalette {
  primary: string;
  primaryDark: string;
  secondary?: string;
  secondaryDark?: string;
  background?: string;
  surface?: string;
  text?: string;
  textSecondary?: string;
  border?: string;
  error?: string;
  success?: string;
  warning?: string;
  [key: string]: string | undefined;
}

const defaultLight: Theme = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1A202C',
  textSecondary: '#718096',
  primary: '#34C759',
  primaryDark: '#28A745',
  secondary: '#007AFF',
  border: '#E2E8F0',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  shadow: '#000000',
  tabBar: 'rgba(255,255,255,0.92)',
  placeholder: '#A0AEC0',
};

/**
 * Night-vision surfaces — match Partner Web `NIGHT_VISION_SURFACES`.
 * Accents (primary/success/…) stay on the branded light theme values.
 */
export const NIGHT_VISION_SURFACES: Pick<
  Theme,
  | 'background'
  | 'card'
  | 'text'
  | 'textSecondary'
  | 'border'
  | 'tabBar'
  | 'placeholder'
  | 'shadow'
> = {
  background: '#0B1220',
  card: '#151E2E',
  text: '#E8EDF5',
  textSecondary: '#94A3B8',
  border: '#273449',
  tabBar: '#151E2E',
  placeholder: '#64748B',
  shadow: '#000000',
};

const defaultDark: Theme = {
  ...defaultLight,
  ...NIGHT_VISION_SURFACES,
};

/** Mutable — applyColorPalette updates in place before first paint. */
export const lightTheme: Theme = {...defaultLight};
export const darkTheme: Theme = {...defaultDark};

/** Last admin branding palette (Brand theme). Null until branding applies. */
let adminBrandPalette: ColorPalette | null = null;

let nightVisionActive = false;

function writeBrandBaseFromPalette(colorPalette: ColorPalette): void {
  lightTheme.primary = colorPalette.primary;
  lightTheme.primaryDark = colorPalette.primaryDark || colorPalette.primary;
  if (colorPalette.secondary) lightTheme.secondary = colorPalette.secondary;
  if (colorPalette.background) lightTheme.background = colorPalette.background;
  if (colorPalette.surface) {
    lightTheme.card = colorPalette.surface;
    lightTheme.tabBar = colorPalette.surface;
  }
  if (colorPalette.text) lightTheme.text = colorPalette.text;
  if (colorPalette.textSecondary) {
    lightTheme.textSecondary = colorPalette.textSecondary;
  }
  if (colorPalette.border) lightTheme.border = colorPalette.border;
  if (colorPalette.error) lightTheme.error = colorPalette.error;
  if (colorPalette.success) lightTheme.success = colorPalette.success;
  if (colorPalette.warning) lightTheme.warning = colorPalette.warning;
}

/** Keep darkTheme = light accents + night surfaces (web resolveTheme parity). */
export function syncDarkThemeFromLight(): void {
  Object.assign(darkTheme, {
    ...lightTheme,
    ...NIGHT_VISION_SURFACES,
  });
}

/** Restore Brand base (admin palette or defaults) before applying cool/warm. */
export function restoreBrandBaseToThemes(): void {
  if (adminBrandPalette?.primary) {
    writeBrandBaseFromPalette(adminBrandPalette);
  } else {
    Object.assign(lightTheme, defaultLight);
  }
  syncDarkThemeFromLight();
}

/** Preview color for the Brand swatch (admin client primary). */
export function getBrandThemeSwatch(): string {
  return adminBrandPalette?.primary || defaultLight.primary;
}

/**
 * Apply remote themeColors as colorPalette.
 * Saves admin brand, then callers re-apply partner cool/warm if needed.
 */
export function applyColorPalette(colorPalette: ColorPalette): void {
  if (!colorPalette?.primary) return;
  adminBrandPalette = {...colorPalette};
  writeBrandBaseFromPalette(colorPalette);
  syncDarkThemeFromLight();
  paintProviderWebChrome(nightVisionActive);
}

export function resetThemesToDefaults(): void {
  adminBrandPalette = null;
  Object.assign(lightTheme, defaultLight);
  Object.assign(darkTheme, defaultDark);
  paintProviderWebChrome(nightVisionActive);
}

/**
 * Web parity: night vision only swaps surfaces; accents stay branded.
 */
export function resolveTheme(isNightVision: boolean): Theme {
  if (!isNightVision) {
    return {...lightTheme};
  }
  return {...lightTheme, ...NIGHT_VISION_SURFACES};
}

/**
 * Paint mutable PROVIDER_WEB tokens so StyleSheets / tab bar follow night vision.
 */
export function paintProviderWebChrome(isNightVision: boolean): void {
  nightVisionActive = isNightVision;
  const t = resolveTheme(isNightVision);
  (PROVIDER_WEB as {background: string}).background = t.background;
  (PROVIDER_WEB as {card: string}).card = t.card;
  (PROVIDER_WEB as {text: string}).text = t.text;
  (PROVIDER_WEB as {textSecondary: string}).textSecondary = t.textSecondary;
  (PROVIDER_WEB as {border: string}).border = t.border;
  (PROVIDER_WEB as {tabBar: string}).tabBar = t.tabBar;
  (PROVIDER_WEB as {placeholder: string}).placeholder = t.placeholder;
  (PROVIDER_WEB as {primary: string}).primary = t.primary;
  (PROVIDER_WEB as {primaryDark: string}).primaryDark = t.primaryDark;
  (PROVIDER_WEB as {secondary: string}).secondary = t.secondary;
  (PROVIDER_WEB as {error: string}).error = t.error;
  (PROVIDER_WEB as {success: string}).success = t.success;
  (PROVIDER_WEB as {warning: string}).warning = t.warning;
  (PROVIDER_WEB as {tabInactive: string}).tabInactive = isNightVision
    ? '#94A3B8'
    : '#8E8E93';
  (PROVIDER_WEB as {border50: string}).border50 = isNightVision
    ? 'rgba(39, 52, 73, 0.55)'
    : 'rgba(226, 232, 240, 0.5)';
  (PROVIDER_WEB as {highlightInset: string}).highlightInset = isNightVision
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.65)';
  (PROVIDER_WEB as {tabShadow: string}).tabShadow = isNightVision
    ? 'rgba(0, 0, 0, 0.28)'
    : 'rgba(30, 60, 90, 0.04)';
}

/** Call when Night vision toggles or after hydrate. */
export function applyNightVisionMode(isNightVision: boolean): void {
  syncDarkThemeFromLight();
  paintProviderWebChrome(isNightVision);
}

export const commonStyles = {
  shadowSmall: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  shadowMedium: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
};
