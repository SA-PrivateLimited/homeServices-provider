import React, {type ReactNode, useRef} from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import {Hoverable} from './Hoverable';

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
  /** `job` = Active cards; `history` = completed/cancelled diagonal fade */
  intensity?: 'default' | 'job' | 'history';
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
      base: mixColor(tint, card, opts.isDark ? 0.14 : 0.1),
      wash: mixColor(tint, card, opts.isDark ? 0.26 : 0.22),
    };
  }
  if (opts.intensity === 'history') {
    return {
      base: mixColor(tint, card, opts.isDark ? 0.16 : 0.12),
      wash: mixColor(tint, card, opts.isDark ? 0.28 : 0.2),
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
      (opts.intensity === 'job' || opts.intensity === 'history') && wash
        ? wash
        : isDark
          ? '#000000'
          : '#1E3C5A',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity:
      opts.intensity === 'job'
        ? isDark
          ? 0.35
          : 0.18
        : opts.intensity === 'history'
          ? isDark
            ? 0.22
            : 0.08
          : isDark
            ? 0.28
            : 0.05,
    shadowRadius: opts.intensity === 'history' ? 12 : 20,
    elevation:
      opts.intensity === 'job' ? 4 : opts.intensity === 'history' ? 1 : 2,
  };
}

type CrystalSurfaceProps = ViewProps &
  CrystalOpts & {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    radius?: number;
    compact?: boolean;
    /** Hover zoom — web `.hs-card--interactive:hover`. Tap/click does not zoom. */
    interactive?: boolean;
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
  interactive,
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
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(255, 255, 255, 0.5)';
  const sheenOpacity = isDark ? 0.28 : intensity === 'job' ? 0.7 : 0.55;
  const historyPattern = intensity === 'history';
  const scale = useRef(new Animated.Value(1)).current;

  const surface = (
    <View
      {...rest}
      pointerEvents="box-none"
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
          {historyPattern ? (
            <>
              <View
                pointerEvents="none"
                style={[styles.historySweep, {backgroundColor: fill.wash}]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.historySweepEdge,
                  {backgroundColor: fill.wash},
                ]}
              />
            </>
          ) : (
            <View
              pointerEvents="none"
              style={[styles.diagWash, {backgroundColor: fill.wash}]}
            />
          )}
        </View>
      ) : null}
      {historyPattern ? null : (
        <View pointerEvents="none" style={styles.sheenClip}>
          <View
            pointerEvents="none"
            style={[
              styles.sheen,
              {backgroundColor: sheen, opacity: sheenOpacity},
            ]}
          />
        </View>
      )}
      <View
        pointerEvents="none"
        style={[styles.highlight, {backgroundColor: highlight}]}
      />
      <View style={[styles.body, contentStyle]}>{children}</View>
    </View>
  );

  if (!interactive) {
    return surface;
  }

  const zoomTo = (value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      friction: 7,
      tension: 140,
    }).start();
  };

  return (
    <Hoverable
      style={{alignSelf: 'stretch'}}
      onHoverIn={() => zoomTo(1.045)}
      onHoverOut={() => zoomTo(1)}>
      <Animated.View style={{transform: [{scale}], alignSelf: 'stretch'}}>
        {surface}
      </Animated.View>
    </Hoverable>
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
  /** Web HistoryPage 120° status fade — diagonal sweep, not the Active oval. */
  historySweep: {
    position: 'absolute',
    top: '-40%',
    right: '-8%',
    width: '72%',
    height: '180%',
    opacity: 0.38,
    transform: [{rotate: '30deg'}],
  },
  historySweepEdge: {
    position: 'absolute',
    top: '-20%',
    right: '-28%',
    width: '48%',
    height: '160%',
    opacity: 0.28,
    transform: [{rotate: '30deg'}],
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
