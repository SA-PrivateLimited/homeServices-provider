import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon} from 'sapvt-ltd-app-packages';
import {useTranslation} from 'react-i18next';
import type {Theme} from '../../utils/theme';
import {useStore} from '../../store';
import {useResolvedTheme} from '../../hooks/useResolvedTheme';
import {CrystalSurface} from '../CrystalSurface';

type Props = {
  canSwitch: boolean;
  busy?: boolean;
  onOpenCustomer: () => void;
  theme?: Theme;
};

export function UseAsCustomerCard({
  canSwitch,
  busy,
  onOpenCustomer,
  theme: themeProp,
}: Props) {
  const {t} = useTranslation();
  const {isDarkMode} = useStore();
  const resolved = useResolvedTheme();
  const theme = themeProp || resolved;
  const title = canSwitch
    ? t('ecosystem.openCustomer')
    : t('ecosystem.becomeCustomer');
  const body = canSwitch
    ? t('ecosystem.useAsCustomerBodySwitchShort')
    : t('ecosystem.useAsCustomerBodyJoinShort');

  return (
    <CrystalSurface
      primary={theme.primary}
      card={theme.card}
      isDark={isDarkMode}
      style={styles.wrap}
      contentStyle={busy ? {opacity: 0.6} : undefined}>
      <Pressable disabled={busy} onPress={onOpenCustomer} style={styles.row}>
        <Icon name="person" size={22} color={theme.text} />
        <View style={styles.copy}>
          <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
          <Text style={[styles.body, {color: theme.textSecondary}]}>
            {busy ? t('handoff.openingCustomer') : body}
          </Text>
        </View>
        <Icon name="chevron_right" size={22} color={theme.textSecondary} />
      </Pressable>
    </CrystalSurface>
  );
}

const styles = StyleSheet.create({
  wrap: {marginBottom: 10},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  copy: {flex: 1},
  title: {fontSize: 15, fontWeight: '700'},
  body: {fontSize: 13, marginTop: 4},
});
