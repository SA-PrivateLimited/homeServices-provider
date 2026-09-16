import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import useTranslation from '../hooks/useTranslation';
import {loginFromWeb as web, WEB} from '../fromWebCss/loginFromWeb.styles';
import {WebCodeBoxes} from './login/WebCodeBoxes';
import {LOGIN_PIN_LENGTH, LOGIN_PIN_RE} from './login/pinUtils';
import {
  biometricKindLabel,
  getBiometricAvailability,
  promptBiometricUnlock,
} from '../services/biometricUnlock';
import {getRememberedPhone} from '../services/session';
import {loginPin} from '../services/api/phoneAuthApi';
import {
  normalizeUser,
  rememberPhone,
  setSession,
} from '../services/session';
import {INDIA_DIAL_CODE, localTenDigits} from '../utils/phone';
import {useStore} from '../store';

type Props = {
  onUnlocked: () => void;
};

/**
 * Cold-start gate when a JWT session exists and biometric unlock is enabled.
 * Face/Fingerprint unlocks the local session; PIN re-authenticates via existing login-pin API.
 */
export function BiometricUnlockGate({onUnlocked}: Props) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const setCurrentUser = useStore(s => s.setCurrentUser);
  const [busy, setBusy] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState(String(t('biometric.kindBiometric')));
  const [phoneFull, setPhoneFull] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const avail = await getBiometricAvailability();
      if (!mounted) return;
      const label = biometricKindLabel(avail.biometryType, t);
      setKind(label);
      const remembered = await getRememberedPhone();
      if (mounted && remembered) {
        setPhoneFull(remembered.fullPhone);
      }
      setBusy(true);
      try {
        const result = await promptBiometricUnlock({
          promptMessage: String(t('biometric.unlockPrompt', {kind: label})),
          cancelButtonText: String(t('common.cancel') || 'Cancel'),
        });
        if (!mounted) return;
        if (result.success) {
          onUnlocked();
          return;
        }
        if (result.error && !/cancel/i.test(result.error)) {
          setError(String(t('biometric.unlockFailed')));
        }
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // Cold-start only — do not re-prompt when `t` identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUnlocked]);

  const tryBiometric = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await promptBiometricUnlock({
        promptMessage: String(t('biometric.unlockPrompt', {kind})),
        cancelButtonText: String(t('common.cancel') || 'Cancel'),
      });
      if (result.success) {
        onUnlocked();
        return;
      }
      if (result.error && !/cancel/i.test(result.error)) {
        setError(String(t('biometric.unlockFailed')));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitPin = async (codeOverride?: string) => {
    const code = (codeOverride ?? pin).trim();
    if (!LOGIN_PIN_RE.test(code)) {
      setError(String(t('auth.pinMustBeFourDigits')));
      return;
    }
    if (!phoneFull) {
      setError(String(t('biometric.pinNeedsPhone')));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await loginPin(phoneFull, code);
      const user = normalizeUser({
        ...result.user,
        role: 'provider',
        phoneVerified: true,
      });
      await setSession(result.token, user);
      await rememberPhone(localTenDigits(phoneFull), INDIA_DIAL_CODE);
      await setCurrentUser(user);
      onUnlocked();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : String(t('auth.incorrectPin'));
      setError(message || String(t('auth.incorrectPin')));
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(24, insets.top + 12),
          paddingBottom: Math.max(24, insets.bottom + 12),
        },
      ]}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name="shield-checkmark" size={36} color={WEB.primary} />
        </View>
        <Text style={styles.title}>{t('biometric.unlockTitle')}</Text>
        <Text style={styles.sub}>
          {t('biometric.unlockSubtitle', {kind})}
        </Text>

        {!pinMode ? (
          <>
            <TouchableOpacity
              style={[web.primaryFill, busy && {opacity: 0.65}]}
              onPress={() => void tryBiometric()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={String(
                t('biometric.unlockWith', {kind}),
              )}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={web.primaryFillText}>
                  {t('biometric.unlockWith', {kind})}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => {
                setPinMode(true);
                setError(null);
                setPin('');
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={String(t('biometric.usePinInstead'))}>
              <Text style={styles.linkText}>{t('biometric.usePinInstead')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.pinBlock}>
            <Text style={web.label}>{t('login.enterPinLabel')}</Text>
            <WebCodeBoxes
              value={pin}
              length={LOGIN_PIN_LENGTH}
              secure
              editable={!busy}
              autoFocus
              accessibilityLabel={String(t('login.enterPinLabel'))}
              accessibilityHint={String(t('login.pinFieldHint'))}
              onChange={text => {
                setPin(text);
                setError(null);
              }}
              onComplete={code => {
                void submitPin(code);
              }}
            />
            {error ? <Text style={web.fieldError}>{error}</Text> : null}
            <TouchableOpacity
              style={[web.primaryFill, busy && {opacity: 0.65}]}
              onPress={() => void submitPin()}
              disabled={busy || pin.length !== LOGIN_PIN_LENGTH}
              accessibilityRole="button"
              accessibilityLabel={String(t('login.loginCta'))}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={web.primaryFillText}>{t('login.loginCta')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => {
                setPinMode(false);
                setError(null);
                setPin('');
                void tryBiometric();
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={String(
                t('biometric.unlockWith', {kind}),
              )}>
              <Text style={styles.linkText}>
                {t('biometric.unlockWith', {kind})}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!pinMode && error ? (
          <Text style={[web.fieldError, styles.errorTop]}>{error}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WEB.background,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: WEB.card,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: WEB.border,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WEB.pinIconBg,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: WEB.text,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
    color: WEB.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  linkBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: WEB.primary,
  },
  pinBlock: {
    gap: 10,
  },
  errorTop: {
    marginTop: 4,
  },
});
