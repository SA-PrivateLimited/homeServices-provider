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

/** Partner Web `.home-avail` — crystal glass + online primary wash. */
export function AvailabilityCard({online, toggling, onToggle}: Props) {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));
  void colorTheme;
  const primary = theme.primary;
  const sub = online
    ? tx('home.availableSubRing') || tx('dashboard.tapToGoOffline')
    : tx('home.offlineSub') || tx('dashboard.tapToGoOnline');

  return (
    <CrystalSurface
      primary={primary}
      card={theme.card}
      isDark={isDarkMode}
      accent={online}
      style={styles.card}
      contentStyle={styles.row}>
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
        ]}>
        <Icon
          name={online ? 'wifi' : 'wifi-off'}
          size={28}
          color={online ? primary : theme.textSecondary}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: online ? primary : theme.textSecondary,
              },
            ]}
          />
          <Text style={[styles.title, {color: theme.text}]}>
            {online
              ? tx('home.availableTitle')
              : tx('home.offlineTitle') || tx('dashboard.goOnline')}
          </Text>
        </View>
        <Text style={[styles.sub, {color: theme.textSecondary}]}>{sub}</Text>
      </View>
      <Button
        variant={online ? 'secondary' : 'primary'}
        loading={toggling}
        onPress={onToggle}
        style={online ? styles.offBtn : styles.onBtn}
        textStyle={online ? {color: theme.textSecondary} : undefined}>
        {online ? tx('home.goOffline') : tx('home.goOnline')}
      </Button>
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
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
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  title: {fontSize: 17, fontWeight: '700', lineHeight: 22, flex: 1},
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
