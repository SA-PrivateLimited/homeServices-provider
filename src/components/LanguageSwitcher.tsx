import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useStore} from '../store';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import useTranslation from '../hooks/useTranslation';

type AppLanguage = 'en' | 'hi';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const OPTIONS: {
  value: AppLanguage;
  labelKey: string;
  shortKey: string;
}[] = [
  {value: 'hi', labelKey: 'login.langHindi', shortKey: 'login.langHindiShort'},
  {
    value: 'en',
    labelKey: 'login.langEnglish',
    shortKey: 'login.langEnglishShort',
  },
];

const LanguageSwitcher = ({
  compact = false,
}: LanguageSwitcherProps): React.ReactElement => {
  const {language, setLanguage} = useStore();
  const theme = useResolvedTheme();
  const {t} = useTranslation();
  const current: AppLanguage = language === 'hi' ? 'hi' : 'en';

  return (
    <View
      style={[
        styles.track,
        compact ? styles.trackCompact : styles.trackFull,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('account.language')}>
      {OPTIONS.map(opt => {
        const selected = current === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.option,
              compact ? styles.optionCompact : styles.optionFull,
              selected && {backgroundColor: `${theme.primary}29`},
            ]}
            onPress={() => {
              if (!selected) void setLanguage(opt.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{selected}}
            accessibilityLabel={t(opt.labelKey)}>
            <Text
              style={[
                compact ? styles.optionTextCompact : styles.optionText,
                {
                  color: selected ? theme.primary : theme.textSecondary,
                  fontWeight: selected ? '700' : '600',
                },
              ]}
              numberOfLines={1}>
              {t(compact ? opt.shortKey : opt.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  trackFull: {
    alignSelf: 'stretch',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  trackCompact: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    padding: 3,
    gap: 2,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionFull: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  optionCompact: {
    minHeight: 32,
    minWidth: 40,
    borderRadius: 999,
    paddingHorizontal: 10,
  },
  optionText: {
    fontSize: 15,
  },
  optionTextCompact: {
    fontSize: 13,
  },
});

export default LanguageSwitcher;
