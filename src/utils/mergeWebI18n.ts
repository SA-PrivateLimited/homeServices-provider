/** Merge flat web locale keys (`browse.call`) under nested RN namespaces. RN keys win. */

/**
 * Flat web keys (`settings.colorTheme` + `settings.colorTheme.brand`) cannot
 * both be nested leaves. When a parent string must become an object for children,
 * keep the string under `label` so `t('settings.colorTheme.label')` still works.
 */
export function unflattenDotted(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.');
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      const next = cur[p];
      if (typeof next === 'string') {
        cur[p] = {label: next};
      } else if (!next || typeof next !== 'object' || Array.isArray(next)) {
        cur[p] = {};
      }
      cur = cur[p] as Record<string, unknown>;
    }
    const last = parts[parts.length - 1];
    if (cur[last] === undefined) {
      cur[last] = value;
    } else if (
      typeof value === 'string' &&
      cur[last] &&
      typeof cur[last] === 'object' &&
      !Array.isArray(cur[last]) &&
      (cur[last] as Record<string, unknown>).label === undefined
    ) {
      (cur[last] as Record<string, unknown>).label = value;
    }
  }
  return out;
}

export function deepMergePreferLeft(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {...left};
  for (const key of Object.keys(right)) {
    const r = right[key];
    const l = out[key];
    if (
      l &&
      r &&
      typeof l === 'object' &&
      typeof r === 'object' &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      out[key] = deepMergePreferLeft(
        l as Record<string, unknown>,
        r as Record<string, unknown>,
      );
    } else if (!(key in out)) {
      out[key] = r;
    }
  }
  return out;
}

export function mergeWebLocale(
  appNested: Record<string, unknown>,
  webFlat: Record<string, unknown>,
): Record<string, unknown> {
  return deepMergePreferLeft(appNested, unflattenDotted(webFlat));
}
