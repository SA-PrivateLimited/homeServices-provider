import React, {useCallback, useEffect, useState} from 'react';
import {PermissionsAndroid, Platform, StyleSheet, Text, View} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import {Button} from 'sapvt-ltd-app-packages';
import notificationService from '../services/notificationService';
import type {Theme} from '../utils/theme';
import {CrystalSurface} from './CrystalSurface';

type PushState = 'loading' | 'granted' | 'denied' | 'default';

type Props = {
  theme?: Theme;
  prompt?: boolean;
  title: string;
  body: string;
  enableLabel: string;
  onLabel: string;
  offLabel: string;
  blockedLabel: string;
};

async function readPushState(): Promise<PushState> {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return granted ? 'granted' : 'default';
    }
    const status = await messaging().hasPermission();
    if (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    ) {
      return 'granted';
    }
    if (status === messaging.AuthorizationStatus.DENIED) return 'denied';
    return 'default';
  } catch {
    return 'default';
  }
}

export function NotificationsSettingsCard({
  theme: themeProp,
  prompt,
  title,
  body,
  enableLabel,
  onLabel,
  offLabel,
  blockedLabel,
}: Props) {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const theme = themeProp;

  const refresh = useCallback(async () => {
    setState(await readPushState());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (prompt && (state === 'loading' || state === 'granted')) {
    return null;
  }
  if (state === 'loading') return null;
  if (!theme) return null;

  const isDark = theme.background === '#0B1220';

  return (
    <CrystalSurface
      primary={theme.primary}
      card={theme.card}
      isDark={isDark}
      style={cardStyles.wrap}
      contentStyle={cardStyles.card}>
      <Text style={[cardStyles.strong, {color: theme.text}]}>{title}</Text>
      <Text style={[cardStyles.p, {color: theme.textSecondary}]}>{body}</Text>
      <Text
        style={[
          cardStyles.status,
          {
            color:
              state === 'granted'
                ? theme.success
                : state === 'denied'
                  ? theme.error
                  : theme.warning,
          },
        ]}>
        {state === 'granted'
          ? onLabel
          : state === 'denied'
            ? blockedLabel
            : offLabel}
      </Text>
      {state !== 'granted' && state !== 'denied' ? (
        <Button
          variant="primary"
          title={enableLabel}
          loading={busy}
          onPress={() => {
            setBusy(true);
            void (async () => {
              try {
                await notificationService.requestPermissions();
                if (Platform.OS === 'ios') {
                  await messaging().requestPermission();
                } else if (Number(Platform.Version) >= 33) {
                  await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                  );
                }
              } finally {
                await refresh();
                setBusy(false);
              }
            })();
          }}
        />
      ) : null}
    </CrystalSurface>
  );
}

const cardStyles = StyleSheet.create({
  wrap: {marginBottom: 10},
  card: {paddingVertical: 14, paddingHorizontal: 16, gap: 8},
  strong: {fontSize: 15, fontWeight: '700'},
  p: {fontSize: 13, lineHeight: 18},
  status: {fontSize: 13, fontWeight: '600'},
});
