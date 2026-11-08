import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import type {Theme} from '../utils/theme';
import type {Provider} from '../services/api/providersApi';
import {
  PARTNER_HOME_DASH_LABEL_KEY,
  PARTNER_HOME_DASH_SCREEN,
  partnerHomeDashboardPercent,
  partnerHomeDashboardSteps,
} from '../utils/partnerProfile';
import useTranslation from '../hooks/useTranslation';

export function HomeProfileProgress({
  theme,
  profile,
  phoneVerified,
  onOpen,
}: {
  theme: Theme;
  profile: Provider | null;
  phoneVerified?: boolean;
  onOpen: (screen: 'SettingsProfile' | 'MyServices') => void;
}) {
  const {t} = useTranslation();
  const dashOpts = {phoneVerified: Boolean(phoneVerified)};
  const steps = partnerHomeDashboardSteps(profile as any, dashOpts);
  const percent = partnerHomeDashboardPercent(profile as any, dashOpts);
  if (percent >= 100) return null;

  const next = steps.find(step => !step.done);
  const nextScreen = next
    ? PARTNER_HOME_DASH_SCREEN[next.key]
    : 'SettingsProfile';

  return (
    <View style={[styles.card, {backgroundColor: theme.card}]}>
      <View style={styles.head}>
        <View style={styles.ring}>
          <Text style={[styles.ringText, {color: theme.primary}]}>
            {percent}%
          </Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={[styles.title, {color: theme.text}]}>
            {String(t('home.completeTitle') || t('home.ctaTitle'))}
          </Text>
          <TouchableOpacity
            onPress={() => onOpen(nextScreen)}
            style={[styles.cta, {backgroundColor: theme.primary}]}
            accessibilityRole="button">
            <Text style={styles.ctaText}>
              {String(t('home.ctaAction') || 'Complete profile')}
            </Text>
            <Icon name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.body, {color: theme.textSecondary}]}>
        {String(t('home.completeBody') || t('home.ctaBody'))}
      </Text>
      <View style={styles.steps}>
        {steps.map(step => (
          <TouchableOpacity
            key={step.key}
            style={styles.step}
            onPress={() => onOpen(PARTNER_HOME_DASH_SCREEN[step.key])}>
            <Icon
              name={step.done ? 'check-circle' : 'radio-button-unchecked'}
              size={16}
              color={step.done ? theme.success : theme.textSecondary}
            />
            <Text
              style={[
                styles.stepLabel,
                {color: step.done ? theme.text : theme.textSecondary},
              ]}>
              {String(t(PARTNER_HOME_DASH_LABEL_KEY[step.key]))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
    gap: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {fontSize: 11, fontWeight: '800'},
  title: {flexGrow: 1, flexShrink: 1, fontSize: 16, fontWeight: '700'},
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  body: {fontSize: 13, lineHeight: 18, width: '100%'},
  steps: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  step: {flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: '45%'},
  stepLabel: {fontSize: 12, fontWeight: '600', flex: 1},
});
