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

/** Partner Web `.home-avail.home-receive` — crystal glass. */
export function ReceiveRequestsCard({enabled, toggling, onToggle}: Props) {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));
  void colorTheme;
  const primary = theme.primary;
  const indicatorBg = enabled
    ? `${primary}24`
    : isDarkMode
      ? 'rgba(232, 237, 245, 0.08)'
      : 'rgba(26, 32, 44, 0.08)';

  return (
    <CrystalSurface
      primary={primary}
      card={theme.card}
      isDark={isDarkMode}
      accent={enabled}
      style={styles.card}
      contentStyle={styles.row}>
      <View style={[styles.indicator, {backgroundColor: indicatorBg}]}>
        <Icon
          name={enabled ? 'notifications' : 'notifications-off'}
          size={28}
          color={enabled ? primary : theme.textSecondary}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.dot,
              {backgroundColor: enabled ? primary : theme.textSecondary},
            ]}
          />
          <Text style={[styles.title, {color: theme.text}]}>
            {enabled
              ? tx('dashboard.receiveRequestsOnTitle')
              : tx('dashboard.receiveRequestsOffTitle')}
          </Text>
        </View>
        <Text style={[styles.sub, {color: theme.textSecondary}]}>
          {enabled
            ? tx('dashboard.receiveRequestsOnSub')
            : tx('dashboard.receiveRequestsOffSub')}
        </Text>
      </View>
      <Button
        variant={enabled ? 'secondary' : 'primary'}
        loading={toggling}
        onPress={onToggle}
        size="md"
        style={enabled ? styles.offBtn : styles.onBtn}
        textStyle={enabled ? {color: theme.textSecondary} : undefined}>
        {enabled
          ? tx('dashboard.receiveRequestsStop')
          : tx('dashboard.receiveRequestsStart')}
      </Button>
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  card: {marginBottom: 12},
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {fontSize: 17, fontWeight: '700', lineHeight: 22.1, flex: 1},
  dot: {width: 10, height: 10, borderRadius: 5},
  sub: {marginTop: 4, fontSize: 13, lineHeight: 18.2},
  onBtn: {minHeight: 40, marginLeft: 'auto'},
  offBtn: {
    minHeight: 40,
    marginLeft: 'auto',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
