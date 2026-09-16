import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import type {EffectiveRequestAvailability} from '../utils/effectiveRequestAvailability';

type Props = {
  state: EffectiveRequestAvailability;
};

/** Concise customer-facing result for Online + Receive + Admin policy. */
export function EffectiveRequestStatus({state}: Props) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));

  const available = state === 'available' || state === 'available_offline';
  const titleKey =
    state === 'available'
      ? 'home.effectiveRequestAvailableTitle'
      : state === 'available_offline'
        ? 'home.effectiveRequestAvailableOfflineTitle'
        : state === 'paused_offline'
          ? 'home.effectiveRequestPausedTitle'
          : 'home.effectiveRequestOffTitle';
  const bodyKey =
    state === 'available'
      ? 'home.effectiveRequestAvailableBody'
      : state === 'available_offline'
        ? 'home.effectiveRequestAvailableOfflineBody'
        : state === 'paused_offline'
          ? 'home.effectiveRequestPausedBody'
          : 'home.effectiveRequestOffBody';

  const tone = available ? theme.success || theme.primary : theme.warning;
  const bg = isDarkMode ? `${tone}22` : `${tone}14`;

  return (
    <View
      style={[styles.wrap, {backgroundColor: bg, borderColor: `${tone}44`}]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${tx(titleKey)}. ${tx(bodyKey)}`}>
      <Icon
        name={available ? 'check-circle' : 'info'}
        size={20}
        color={tone}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.copy}>
        <Text style={[styles.title, {color: theme.text}]}>{tx(titleKey)}</Text>
        <Text style={[styles.body, {color: theme.textSecondary}]}>
          {tx(bodyKey)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  copy: {flex: 1, minWidth: 0},
  title: {fontSize: 14, fontWeight: '700', lineHeight: 20},
  body: {marginTop: 2, fontSize: 13, lineHeight: 18},
});
