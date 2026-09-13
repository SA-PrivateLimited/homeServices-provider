import React from 'react';
import {Linking, ScrollView, StyleSheet, Text} from 'react-native';
import {Button} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';
import {useStore} from '../store';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import {CrystalSurface} from '../components/CrystalSurface';
import {ShareAkansoPanel} from '../components/ShareAkansoPanel';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.homeservices.providerapp';

export default function SettingsAboutScreen({navigation}: {navigation: any}) {
  const {t} = useTranslation();
  const theme = useResolvedTheme();
  const {isDarkMode} = useStore();

  return (
    <ScrollView
      style={{backgroundColor: theme.background}}
      contentContainerStyle={styles.pad}>
      <CrystalSurface
        primary={theme.primary}
        card={theme.card}
        isDark={isDarkMode}
        contentStyle={styles.card}>
        <Text style={[styles.h3, {color: theme.text}]}>
          {t('settings.aboutApp')}
        </Text>
        <Text style={[styles.p, {color: theme.text}]}>
          <Text style={styles.strong}>Akansho</Text> · v1.0.0
        </Text>
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {t('settings.aboutCopy')}
        </Text>
        <Button
          variant="ghost"
          onPress={() => void Linking.openURL(PLAY_STORE_URL)}>
          {t('appUpdate.title')}
        </Button>
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {t('appUpdate.hint')}
        </Text>
      </CrystalSurface>
      <ShareAkansoPanel />
      <CrystalSurface
        primary={theme.primary}
        card={theme.card}
        isDark={isDarkMode}
        contentStyle={styles.card}>
        <Text style={[styles.h3, {color: theme.text}]}>
          {t('settings.legal')}
        </Text>
        <Button
          variant="ghost"
          onPress={() =>
            navigation.navigate('LegalDocument', {kind: 'privacy'})
          }>
          {t('collab.privacy')}
        </Button>
        <Button
          variant="ghost"
          onPress={() => navigation.navigate('LegalDocument', {kind: 'terms'})}>
          {t('settings.terms')}
        </Button>
      </CrystalSurface>
      <Text style={[styles.muted, {color: theme.textSecondary}]}>
        © Akansho Pvt Ltd
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: {padding: 14, gap: 12},
  card: {
    padding: 14,
    gap: 8,
  },
  h3: {fontSize: 16, fontWeight: '700'},
  p: {fontSize: 14},
  strong: {fontWeight: '700'},
  muted: {fontSize: 13},
});
