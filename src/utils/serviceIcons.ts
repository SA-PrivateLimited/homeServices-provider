/**
 * Service category icons from the API use Material Icons hyphen names
 * (e.g. `electrical-services`). Material Symbols ligatures use underscores
 * (`electrical_services`). Invalid names render as giant `?` glyphs.
 *
 * Only use names that exist in react-native-vector-icons MaterialIcons.
 */

let glyphMap: Record<string, number> | null = null;
try {
  glyphMap = require('react-native-vector-icons/glyphmaps/MaterialIcons.json');
} catch {
  glyphMap = null;
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  plumber: 'plumbing',
  electrician: 'bolt',
  carpenter: 'carpenter',
  painter: 'format_paint',
  'ac repair': 'ac_unit',
  ac_repair: 'ac_unit',
  ac: 'ac_unit',
  'cleaning service': 'cleaning_services',
  cleaning: 'cleaning_services',
  cleaner: 'cleaning_services',
  driver: 'local_taxi',
  pest: 'bug_report',
  'pest control': 'bug_report',
  appliance: 'kitchen',
  appliance_repair: 'kitchen',
  mason: 'construction',
  welder: 'construction',
  gardener: 'yard',
  roofer: 'roofing',
  flooring: 'layers',
  tiles_marble: 'grid_on',
  'tiles mistry': 'grid_on',
  'tiles & marble': 'grid_on',
  tiles: 'grid_on',
  interior_designer: 'chair',
  handyman: 'handyman',
  'bike repair': 'two_wheeler',
  bike: 'two_wheeler',
  'sim supplier': 'sim_card',
  sim: 'sim_card',
};

/** Map aliases / missing glyphs → MaterialIcons-safe names (underscore form). */
const ICON_ALIASES: Record<string, string> = {
  electrical_services: 'bolt',
  format_paint: 'format_paint',
  brush: 'format_paint',
  painter: 'format_paint',
  ac_unit: 'ac_unit',
  mode_fan: 'ac_unit',
  mop: 'cleaning_services',
  cleaning_services: 'cleaning_services',
  local_taxi: 'local_taxi',
  directions_car: 'local_taxi',
  plumbing: 'plumbing',
  two_wheeler: 'two_wheeler',
  sim_card: 'sim_card',
};

/** Glyphs known missing from MaterialIcons font used by RN. */
const MISSING_GLYPHS = new Set(['mop', 'mode_fan', 'directions_car', 'painter']);

function hyphenName(underscored: string): string {
  return underscored.replace(/_/g, '-');
}

function isValidMaterialIcon(underscored: string): boolean {
  if (MISSING_GLYPHS.has(underscored)) return false;
  if (!glyphMap) return true;
  return Boolean(glyphMap[hyphenName(underscored)] || glyphMap[underscored]);
}

export function toMaterialSymbolName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return 'build';
  const trimmed = raw.trim();
  if (!trimmed) return 'build';

  const underscored = trimmed
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();

  if (!/^[a-z][a-z0-9_]*$/.test(underscored)) return 'build';
  const aliased = ICON_ALIASES[underscored] || underscored;
  if (!isValidMaterialIcon(aliased)) {
    return 'build';
  }
  return aliased;
}

function iconFromCategoryName(categoryName?: string | null): string | null {
  const key = (categoryName || '').trim().toLowerCase();
  if (!key) return null;
  if (CATEGORY_FALLBACKS[key]) {
    return toMaterialSymbolName(CATEGORY_FALLBACKS[key]);
  }
  for (const [k, v] of Object.entries(CATEGORY_FALLBACKS)) {
    if (key.includes(k)) return toMaterialSymbolName(v);
  }
  return null;
}

/**
 * Resolve a Material icon for a service.
 * Call as `serviceCategoryIcon(apiIcon, serviceName)` or `serviceCategoryIcon(undefined, serviceName)`.
 * A single display name (e.g. "Painter") must be passed as categoryName, not icon.
 */
export function serviceCategoryIcon(
  icon?: string | null,
  categoryName?: string | null,
): string {
  const looksLikeLabel =
    Boolean(icon) &&
    (/\s/.test(String(icon)) || Boolean(iconFromCategoryName(icon)));

  if (icon && !looksLikeLabel) {
    const fromIcon = toMaterialSymbolName(icon);
    if (fromIcon !== 'build' || !categoryName) {
      if (isValidMaterialIcon(fromIcon) && fromIcon !== 'build') {
        return fromIcon;
      }
    }
  }

  return (
    iconFromCategoryName(categoryName) ||
    iconFromCategoryName(icon) ||
    'build'
  );
}
