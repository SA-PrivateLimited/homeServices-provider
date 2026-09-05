/**
 * Service category icons from the API use Material Icons hyphen names
 * (e.g. `electrical-services`). Material Symbols ligatures use underscores
 * (`electrical_services`). Invalid names render as giant label text.
 */

const CATEGORY_FALLBACKS: Record<string, string> = {
  plumber: 'plumbing',
  electrician: 'bolt',
  carpenter: 'carpenter',
  painter: 'brush',
  'ac repair': 'mode_fan',
  ac_repair: 'mode_fan',
  ac: 'mode_fan',
  'cleaning service': 'mop',
  cleaning: 'mop',
  cleaner: 'mop',
  driver: 'directions_car',
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
  interior_designer: 'chair',
  handyman: 'handyman',
};

const ICON_ALIASES: Record<string, string> = {
  electrical_services: 'bolt',
  format_paint: 'brush',
  ac_unit: 'mode_fan',
  cleaning_services: 'mop',
  local_taxi: 'directions_car',
  plumbing: 'plumbing',
};

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
  return ICON_ALIASES[underscored] || underscored;
}

export function serviceCategoryIcon(
  icon?: string | null,
  categoryName?: string | null,
): string {
  if (icon) return toMaterialSymbolName(icon);
  const key = (categoryName || '').trim().toLowerCase();
  if (key && CATEGORY_FALLBACKS[key]) return CATEGORY_FALLBACKS[key];
  for (const [k, v] of Object.entries(CATEGORY_FALLBACKS)) {
    if (key.includes(k)) return v;
  }
  return 'build';
}
