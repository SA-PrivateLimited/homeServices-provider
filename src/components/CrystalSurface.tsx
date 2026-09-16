import React, {type ReactNode} from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

/** Partner web `--crystal-radius` / `--crystal-radius-sm`. */
export const CRYSTAL_RADIUS = 20;
export const CRYSTAL_RADIUS_SM = 16;

export type CrystalTone = 'default' | 'accent' | 'status';

type CrystalOpts = {
  primary: string;
  card: string;
  isDark?: boolean;
  /** Stronger primary wash — web `.home-avail.is-online` */
  accent?: boolean;
  /** Job/history status tint (success / error / warning / primary) */
  statusColor?: string;
  /** `job` = JobsPage accepted/in-progress saturation */
  intensity?: 'default' | 'job';
};

function parseColor(
  input: string,
): {r: number; g: number; b: number} | null {
  const raw = String(input || '').trim();
  if (raw.startsWith('#')) {
    const h = raw.slice(1);
    if (h.length === 3) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
      };
    }
    if (h.length >= 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
    return null;
  }
  const m = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) {
    return null;
  }
  return {r: Number(m[1]), g: Number(m[2]), b: Number(m[3])};
}

function toHex(rgb: {r: number; g: number; b: number}): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

/** CSS `color-mix(in srgb, fg amount, bg)` for RN. */
export function mixColor(fg: string, bg: string, amount: number): string {
  const a = parseColor(fg);
  const b = parseColor(bg);
  if (!a || !b) {
    return bg;
  }
  const t = Math.max(0, Math.min(1, amount));
  return toHex({
    r: b.r + (a.r - b.r) * t,
    g: b.g + (a.g - b.g) * t,
    b: b.b + (a.b - b.b) * t,
  });
}

/**
 * Partner web glass fill:
 * `--crystal-surface-bg` 6% → 10% primary into card
 * `.home-avail.is-online` 10% primary
 * no-backdrop fallback: `color-mix(primary 6%, card)`
 */
export function crystalFillColors(opts: CrystalOpts): {
  base: string;
  wash: string | null;
} {
  const tint = opts.statusColor || opts.primary;
  const card = opts.card;
  if (opts.intensity === 'job') {
    return {
      base: mixColor(tint, card, opts.isDark ? 0.22 : 0.18),
      wash: null,
    };
  }
  if (opts.accent) {
    return {
      base: mixColor(tint, card, 0.1),
      wash: mixColor(tint, card, 0.14),
    };
  }
  if (opts.statusColor) {
    return {
      base: mixColor(tint, card, 0.08),
      wash: mixColor(tint, card, 0.12),
    };
  }
  return {
    base: mixColor(tint, card, 0.06),
    wash: mixColor(tint, card, 0.1),
  };
}

/** @deprecated use crystalFillColors — kept for existing imports */
export function crystalWashColor(opts: CrystalOpts): string {
  return crystalFillColors(opts).base;
}

export function crystalSurfaceStyle(opts: CrystalOpts): ViewStyle {
  const isDark = Boolean(opts.isDark);
  const wash = opts.statusColor || opts.primary;
  const fill = crystalFillColors(opts);
  return {
    borderRadius: CRYSTAL_RADIUS,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: fill.base,
    shadowColor:
      opts.intensity === 'job' && wash
        ? wash
        : isDark
          ? '#000000'
          : '#1E3C5A',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity:
      opts.intensity === 'job' ? (isDark ? 0.35 : 0.18) : isDark ? 0.28 : 0.05,
    shadowRadius: 20,
    elevation: opts.intensity === 'job' ? 4 : 2,
  };
}

type CrystalSurfaceProps = ViewProps &
  CrystalOpts & {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    radius?: number;
    compact?: boolean;
  };

/**
 * Partner web `.crystal-surface--glass` / `.hs-card` recipe on RN:
 * primary color-mix fill, 145° wash, 120° corner sheen, inset highlight.
 * No CSS backdrop-filter — fill matches the no-blur fallback.
 */
export function CrystalSurface({
  children,
  style,
  contentStyle,
  primary,
  card,
  isDark,
  accent,
  statusColor,
  intensity = 'default',
  compact,
  radius,
  ...rest
}: CrystalSurfaceProps) {
  const fill = crystalFillColors({
    primary,
    card,
    isDark,
    accent,
    statusColor,
    intensity,
  });
  const resolvedRadius =
    radius ?? (compact ? CRYSTAL_RADIUS_SM : CRYSTAL_RADIUS);
  const highlight = isDark
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.85)';
  const sheen = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(255, 255, 255, 0.45)';
  const sheenOpacity = isDark ? 0.22 : 0.55;

  return (
    <View
      {...rest}
      style={[
        crystalSurfaceStyle({
          primary,
          card,
          isDark,
          accent,
          statusColor,
          intensity,
        }),
        {borderRadius: resolvedRadius, backgroundColor: fill.base},
        style,
      ]}>
      {fill.wash ? (
        <View pointerEvents="none" style={styles.washClip}>
          <View style={[styles.diagWash, {backgroundColor: fill.wash}]} />
        </View>
      ) : null}
      <View pointerEvents="none" style={styles.sheenClip}>
        <View
          style={[
            styles.sheen,
            {backgroundColor: sheen, opacity: sheenOpacity},
          ]}
        />
      </View>
      <View
        pointerEvents="none"
        style={[styles.highlight, {backgroundColor: highlight}]}
      />
      <View style={[styles.body, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  washClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  diagWash: {
    position: 'absolute',
    right: -28,
    bottom: -36,
    width: '78%',
    height: '72%',
    borderRadius: 90,
    opacity: 0.55,
    transform: [{rotate: '18deg'}],
  },
  sheenClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: -48,
    left: -40,
    width: '62%',
    height: '52%',
    borderRadius: 80,
    transform: [{rotate: '-18deg'}],
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  body: {
    position: 'relative',
    zIndex: 1,
  },
});
