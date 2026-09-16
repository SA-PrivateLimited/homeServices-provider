import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {CrystalSurface} from './CrystalSurface';

type Props = {
  online: boolean;
  toggling: boolean;
  onToggle: () => void;
};

/** Primary Home control — current Online / Offline status only. */
export function AvailabilityCard({online, toggling, onToggle}: Props) {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));
  void colorTheme;
  const primary = theme.primary;
  const statusLabel = online
    ? tx('home.statusOnline')
    : tx('home.statusOffline');
  const statusHint = online
    ? tx('home.statusOnlineHint')
    : tx('home.statusOfflineHint');
  const actionLabel = online ? tx('home.goOffline') : tx('home.goOnline');

  return (
    <CrystalSurface
      primary={primary}
      card={theme.card}
      isDark={isDarkMode}
      accent={online}
      style={styles.card}
      contentStyle={styles.row}
      accessibilityRole="summary"
      accessibilityLabel={`${tx('home.statusLabel')}. ${statusLabel}. ${statusHint}`}
      accessibilityHint={
        online ? tx('home.goOfflineA11yHint') : tx('home.goOnlineA11yHint')
      }>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: online
              ? `${primary}24`
              : isDarkMode
                ? 'rgba(232, 237, 245, 0.08)'
                : 'rgba(26, 32, 44, 0.08)',
          },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no">
        <Icon
          name={online ? 'wifi' : 'wifi-off'}
          size={28}
          color={online ? primary : theme.textSecondary}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, {color: theme.textSecondary}]}>
          {tx('home.statusLabel')}
        </Text>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: online ? primary : theme.textSecondary,
              },
            ]}
          />
          <Text style={[styles.title, {color: theme.text}]}>{statusLabel}</Text>
        </View>
        <Text style={[styles.sub, {color: theme.textSecondary}]}>
          {statusHint}
        </Text>
      </View>
      <Button
        variant={online ? 'secondary' : 'primary'}
        loading={toggling}
        onPress={onToggle}
        style={online ? styles.offBtn : styles.onBtn}
        textStyle={online ? {color: theme.textSecondary} : undefined}>
        {actionLabel}
      </Button>
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  indicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1, minWidth: 140},
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  title: {fontSize: 20, fontWeight: '800', lineHeight: 26, flex: 1},
  dot: {width: 10, height: 10, borderRadius: 5},
  sub: {marginTop: 4, fontSize: 13, lineHeight: 18},
  onBtn: {minHeight: 40, marginLeft: 'auto'},
  offBtn: {
    minHeight: 40,
    marginLeft: 'auto',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
