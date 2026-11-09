export const JOB_OTHER = '__other__';

export const FALLBACK_JOBS = [
  'Carpenter',
  'Electrician',
  'Plumber',
  'Painter',
  'Mason',
  'Welder',
  'AC Repair',
  'Appliance Repair',
  'Cleaning Service',
  'Gardener',
  'Roofer',
  'Flooring',
  'Tiles & Marble',
  'Interior Designer',
];

export function catalogJobNames(
  cats: Array<{
    name?: string;
    isActive?: boolean;
    enabled?: boolean;
    order?: number;
  }>,
): string[] {
  return cats
    .filter(c => c.name && c.isActive !== false && c.enabled !== false)
    .sort(
      (a, b) =>
        (a.order ?? 999) - (b.order ?? 999) ||
        String(a.name).localeCompare(String(b.name)),
    )
    .map(c => String(c.name).trim())
    .filter(name => name && name.toLowerCase() !== 'other');
}

export function jobSelectOptions(
  catalog: string[],
  currentValue: string,
  otherLabel: string,
): {value: string; label: string}[] {
  const names = catalog.filter(n => n.toLowerCase() !== 'other');
  const current = currentValue.trim();
  if (
    current &&
    current !== JOB_OTHER &&
    !names.some(n => n.toLowerCase() === current.toLowerCase())
  ) {
    names.unshift(current);
  }
  return [
    ...names.map(s => ({value: s, label: s})),
    {value: JOB_OTHER, label: otherLabel},
  ];
}

export function resolvedJobName(selectValue: string, customName: string): string {
  if (selectValue === JOB_OTHER) return customName.trim();
  return selectValue.trim();
}
