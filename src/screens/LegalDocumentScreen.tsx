/**
 * Opens Partner Privacy / Terms on partner.akansho.com.
 * Prefer in-app explanation; browser open is optional and fail-safe.
 */
import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../config/support';
import {openExternalUrl} from '../utils/openExternalUrl';

export default function LegalDocumentScreen({route}: {route: any}) {
  const kind: 'privacy' | 'terms' =
    route?.params?.kind === 'terms' ? 'terms' : 'privacy';
  const url = kind === 'terms' ? TERMS_OF_SERVICE_URL : PRIVACY_POLICY_URL;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const title =
    kind === 'terms'
      ? String(t('settings.terms'))
      : String(t('collab.privacy'));

  const open = () => {
    void openExternalUrl(url, {
      failTitle: String(t('common.error') || 'Error'),
      failMessage: String(
        t('settings.legalOpenFailed') ||
          'Could not open the browser. On an emulator, install Chrome, or open the link on your phone.',
      ),
    });
  };

  return (
    <View style={[styles.wrap, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={[styles.h, {color: theme.text}]}>{title}</Text>
        <Text style={[styles.body, {color: theme.textSecondary}]}>
          {String(
            t('settings.legalOpenHint') ||
              'Full Privacy Policy and Terms are on the Akansho Partner website.',
          )}
        </Text>
        {kind === 'privacy' ? (
          <Text style={[styles.body, {color: theme.textSecondary}]}>
            {String(
              t('settings.deleteAccountLead') ||
                'You can delete your account from Account & security in this app.',
            )}
          </Text>
        ) : null}
        <Text style={[styles.url, {color: theme.primary}]} onPress={open}>
          {url}
        </Text>
        <Button
          variant="primary"
          block
          title={String(t('common.openInBrowser') || 'Open in browser')}
          onPress={open}
          style={{marginTop: 16}}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {flex: 1},
  pad: {padding: 14, paddingBottom: 40, gap: 10},
  h: {fontSize: 20, fontWeight: '700'},
  body: {fontSize: 14, lineHeight: 22},
  url: {fontSize: 13, lineHeight: 20},
});
