import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Button} from 'sapvt-ltd-app-packages';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';
import useTranslation from '../hooks/useTranslation';
import {CrystalSurface} from './CrystalSurface';

type Props = {
  enabled: boolean;
  toggling: boolean;
  onToggle: () => void;
};

/** Secondary Home control — Receive Requests preference (not Online status). */
export function ReceiveRequestsCard({enabled, toggling, onToggle}: Props) {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));
  void colorTheme;
  const primary = theme.primary;
  const stateLabel = enabled
    ? tx('home.receiveRequestsStateOn')
    : tx('home.receiveRequestsStateOff');
  const sub = enabled
    ? tx('home.receiveRequestsPrefOnSub')
    : tx('home.receiveRequestsPrefOffSub');
  const actionLabel = enabled
    ? tx('home.receiveRequestsStop')
    : tx('home.receiveRequestsStart');
  const indicatorBg = isDarkMode
    ? 'rgba(232, 237, 245, 0.08)'
    : 'rgba(26, 32, 44, 0.06)';

  return (
    <CrystalSurface
      primary={primary}
      card={theme.card}
      isDark={isDarkMode}
      accent={false}
      style={styles.card}
      contentStyle={styles.row}
      accessibilityRole="summary"
      accessibilityLabel={`${tx('home.receiveRequestsLabel')}. ${stateLabel}. ${sub}`}
      accessibilityHint={
        enabled
          ? tx('home.receiveRequestsStopA11yHint')
          : tx('home.receiveRequestsStartA11yHint')
      }>
      <View
        style={[styles.indicator, {backgroundColor: indicatorBg}]}
        accessibilityElementsHidden
        importantForAccessibility="no">
        <Icon
          name={enabled ? 'notifications' : 'notifications-off'}
          size={22}
          color={enabled ? primary : theme.textSecondary}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, {color: theme.textSecondary}]}>
          {tx('home.receiveRequestsLabel')}
        </Text>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.dot,
              {backgroundColor: enabled ? primary : theme.textSecondary},
            ]}
          />
          <Text style={[styles.title, {color: theme.text}]}>{stateLabel}</Text>
        </View>
        <Text style={[styles.sub, {color: theme.textSecondary}]}>{sub}</Text>
      </View>
      <Button
        variant={enabled ? 'secondary' : 'primary'}
        loading={toggling}
        onPress={onToggle}
        size="md"
        style={enabled ? styles.offBtn : styles.onBtn}
        textStyle={enabled ? {color: theme.textSecondary} : undefined}>
        {actionLabel}
      </Button>
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: 10},
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  indicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1, minWidth: 140},
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {fontSize: 16, fontWeight: '700', lineHeight: 22, flex: 1},
  dot: {width: 8, height: 8, borderRadius: 4},
  sub: {marginTop: 4, fontSize: 12, lineHeight: 17},
  onBtn: {minHeight: 40, marginLeft: 'auto'},
  offBtn: {
    minHeight: 40,
    marginLeft: 'auto',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
