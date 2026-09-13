import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Linking, StyleSheet, Text, View} from 'react-native';
import {Button} from 'sapvt-ltd-app-packages';
import {exchangeContextHandoff} from '../services/api/contextExchange';
import {setSession} from '../services/session';
import {useStore} from '../store';
import useTranslation from '../hooks/useTranslation';
import {SUPPORT_PHONE_TEL} from '../config/support';
import {getCustomerWebUrl} from '../utils/customerWebUrl';

function codeFromUrl(url: string | null): string {
  if (!url) return '';
  const match = url.match(/[?&]code=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function mapHandoffError(err: any): string {
  const raw = String(err?.message || err || '').toLowerCase();
  if (raw.includes('expired')) return 'CODE_EXPIRED';
  if (raw.includes('used') || raw.includes('already')) return 'CODE_ALREADY_USED';
  if (raw.includes('network') || raw.includes('timeout')) return 'NETWORK_ERROR';
  if (raw.includes('missing')) return 'CODE_MISSING';
  return 'CODE_INVALID';
}

export default function AuthHandoffScreen({navigation, route}: any) {
  const {t} = useTranslation();
  const setCurrentUser = useStore(s => s.setCurrentUser);
  const [error, setError] = useState<string | null>(null);
  const paramCode = String(route?.params?.code || '').trim();

  useEffect(() => {
    const sub = Linking.addEventListener('url', ({url}) => {
      const next = codeFromUrl(url);
      if (next) navigation.setParams({code: next});
    });
    return () => sub.remove();
  }, [navigation]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const initial = await Linking.getInitialURL();
      const code = paramCode || codeFromUrl(initial);
      if (!code) {
        if (active) setError('CODE_MISSING');
        return;
      }
      setError(null);
      try {
        const {user, token} = await exchangeContextHandoff(code);
        await setSession(token, user);
        if (!active) return;
        setCurrentUser(user as any);
        navigation.reset({index: 0, routes: [{name: 'ProviderMain'}]});
      } catch (err) {
        if (active) setError(mapHandoffError(err));
      }
    })();
    return () => {
      active = false;
    };
  }, [paramCode, navigation, setCurrentUser]);

  if (!error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>{String(t('handoff.loading'))}</Text>
      </View>
    );
  }

  const errorKey =
    error === 'CODE_MISSING'
      ? 'handoff.errorMissing'
      : error === 'CODE_EXPIRED'
        ? 'handoff.errorExpired'
        : error === 'CODE_ALREADY_USED'
          ? 'handoff.errorUsed'
          : error === 'NETWORK_ERROR'
            ? 'handoff.errorNetwork'
            : 'handoff.errorInvalid';
  const canOpenHome =
    error === 'CODE_ALREADY_USED' || error === 'CODE_EXPIRED';

  return (
    <View style={styles.center}>
      <Text style={styles.h}>{String(t('handoff.failedTitle'))}</Text>
      <Text style={styles.muted}>{String(t(errorKey))}</Text>
      <Button
        onPress={() => {
          if (canOpenHome) {
            navigation.reset({index: 0, routes: [{name: 'Login'}]});
            return;
          }
          void Linking.openURL(getCustomerWebUrl());
        }}>
        {canOpenHome ? String(t('auth.login')) : String(t('handoff.retry'))}
      </Button>
      <Button
        variant="secondary"
        onPress={() => void Linking.openURL(SUPPORT_PHONE_TEL)}>
        {String(t('handoff.getHelp'))}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12},
  h: {fontSize: 20, fontWeight: '700', color: '#1A202C'},
  muted: {fontSize: 14, color: '#718096', textAlign: 'center'},
});
