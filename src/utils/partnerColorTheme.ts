import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getBrandThemeSwatch,
  lightTheme,
  paintProviderWebChrome,
  restoreBrandBaseToThemes,
  syncDarkThemeFromLight,
} from './theme';
import {HEADER} from '../fromWebCss/accountMenu.styles';

export type PartnerColorThemeId = 'brand' | 'cool' | 'warm';

export const PARTNER_COLOR_THEMES: Array<{
  id: PartnerColorThemeId;
  swatch: string;
}> = [
  {id: 'brand', swatch: '#34C759'},
  {id: 'cool', swatch: '#0D9488'},
  {id: 'warm', swatch: '#C2410C'},
];

const ACCENTS: Record<
  Exclude<PartnerColorThemeId, 'brand'>,
  {primary: string; primaryDark: string; secondary: string}
> = {
  cool: {
    primary: '#0D9488',
    primaryDark: '#0F766E',
    secondary: '#2563EB',
  },
  warm: {
    primary: '#C2410C',
    primaryDark: '#9A3412',
    secondary: '#CA8A04',
  },
};

const STORAGE_KEY = 'akanso-partner-color-theme';

let currentId: PartnerColorThemeId = 'brand';
let nightVisionOn = false;

function paintHeader(primary: string, primaryDark: string) {
  (HEADER as {primary: string}).primary = primary;
  (HEADER as {primaryDark: string}).primaryDark = primaryDark;
  (HEADER as {avatarBg: string}).avatarBg = `${primary}2E`;
  (HEADER as {hover: string}).hover = `${primary}14`;
}

/**
 * Apply partner accent on top of admin brand colors (web theme.ts parity).
 */
export function applyPartnerColorTheme(id: PartnerColorThemeId): void {
  currentId = id;
  restoreBrandBaseToThemes();

  if (id !== 'brand') {
    const accents = ACCENTS[id];
    lightTheme.primary = accents.primary;
    lightTheme.primaryDark = accents.primaryDark;
    lightTheme.secondary = accents.secondary;
  }

  syncDarkThemeFromLight();

  const primary = lightTheme.primary;
  const primaryDark = lightTheme.primaryDark;
  paintHeader(primary, primaryDark);
  paintProviderWebChrome(nightVisionOn);

  const brandEntry = PARTNER_COLOR_THEMES.find(t => t.id === 'brand');
  if (brandEntry) {
    brandEntry.swatch = getBrandThemeSwatch();
  }
}

export function getPartnerColorThemeId(): PartnerColorThemeId {
  return currentId;
}

/** Re-apply current partner theme after branding/palette updates. */
export function reapplyCurrentPartnerColorTheme(): void {
  applyPartnerColorTheme(currentId);
}

export function setPartnerNightVisionFlag(on: boolean): void {
  nightVisionOn = on;
  paintProviderWebChrome(on);
}

export async function loadPartnerColorTheme(): Promise<PartnerColorThemeId> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'cool' || raw === 'warm' || raw === 'brand') {
      applyPartnerColorTheme(raw);
      return raw;
    }
  } catch {
    /* ignore */
  }
  applyPartnerColorTheme('brand');
  return 'brand';
}

export async function persistPartnerColorTheme(
  id: PartnerColorThemeId,
): Promise<void> {
  applyPartnerColorTheme(id);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
