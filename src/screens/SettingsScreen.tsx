import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Icon} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import type {Theme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

function SettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  theme,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, {borderBottomColor: theme.border}]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={22} color={theme.text} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, {color: theme.text}]}>{title}</Text>
        <Text style={[styles.sub, {color: theme.textSecondary}]}>{subtitle}</Text>
      </View>
      <Icon name="chevron_right" size={22} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function SettingsScreen({navigation}: any) {
  const {colorTheme} = useStore();
  const theme = useResolvedTheme();
  const {t} = useTranslation();
  const tx = (key: string) => String(t(key));
  void colorTheme;

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, {color: theme.textSecondary}]}>
          {tx('settings.lead')}
        </Text>
        <SettingsRow
          theme={theme}
          icon="person"
          title={tx('settings.sectionProfile')}
          subtitle={tx('settings.sectionProfileSub')}
          onPress={() => navigation.navigate('SettingsProfile')}
        />
        <SettingsRow
          theme={theme}
          icon="handyman"
          title={tx('nav.myServices')}
          subtitle={tx('settings.myServicesLinkSub')}
          onPress={() => navigation.navigate('MyServices')}
        />
        <SettingsRow
          theme={theme}
          icon="lock"
          title={tx('settings.sectionAccount')}
          subtitle={tx('settings.sectionAccountSub')}
          onPress={() => navigation.navigate('SettingsAccount')}
        />
        <SettingsRow
          theme={theme}
          icon="support"
          title={tx('ecosystem.helpTitle') || tx('help.title')}
          subtitle={tx('settings.sectionHelpSub')}
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <SettingsRow
          theme={theme}
          icon="info"
          title={tx('settings.sectionAbout')}
          subtitle={tx('settings.sectionAboutSub')}
          onPress={() => navigation.navigate('SettingsAbout')}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  content: {padding: 16, paddingBottom: 40},
  lead: {fontSize: 14, lineHeight: 20, marginBottom: 16},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {width: 36, alignItems: 'center'},
  copy: {flex: 1},
  title: {fontSize: 16, fontWeight: '700'},
  sub: {fontSize: 13, marginTop: 2},
});
