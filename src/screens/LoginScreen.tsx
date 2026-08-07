/**
 * Provider login — phone + OTP (new) / PIN (returning), same pattern as customer.
 * New providers start as approvalStatus=pending until admin approves.
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {
  lookupPhone,
  loginPin,
  registerWithOtp,
  resetPin,
} from '../services/api/phoneAuthApi';
import {
  getRememberedPhone,
  normalizeUser,
  rememberPhone,
  setSession,
  clearAllCredentials,
} from '../services/session';
import PinBoxesInput from '../components/PinBoxesInput';
import AlertModal from '../components/AlertModal';
import useTranslation from '../hooks/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {Banner} from 'sapvt-ltd-app-packages';
import PhoneNumberInput from '../components/PhoneNumberInput';
import {INDIA_DIAL_CODE, localTenDigits} from '../utils/phone';
import {useFirebasePhoneAuth} from '../hooks/useFirebasePhoneAuth';

interface LoginScreenProps {
  navigation: any;
}

type Step = 'phone' | 'pin' | 'otp' | 'showPin';
type OtpMode = 'signup' | 'forgot';

type OtpBanner = {
  otp: string;
  phone: string;
  expiresAt: number;
};

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('phone');
  const [otpMode, setOtpMode] = useState<OtpMode>('signup');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [otpBanner, setOtpBanner] = useState<OtpBanner | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [approvalNote, setApprovalNote] = useState<string | null>(null);
  const pinLoginInFlight = useRef(false);
  const firebasePhone = useFirebasePhoneAuth();

  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const fullPhone = () =>
    INDIA_DIAL_CODE + localTenDigits(phoneNumber);

  const applyOtpFromResponse = (result: {
    otp?: string;
    expiresAt?: string;
    expiresInSeconds?: number;
    phoneNumber?: string;
  }) => {
    if (!result?.otp) {
      setOtpBanner(null);
      setOtpSecondsLeft(0);
      return;
    }
    const expiresAt = result.expiresAt
      ? Date.parse(result.expiresAt)
      : Date.now() + (result.expiresInSeconds || 300) * 1000;
    setOtpBanner({
      otp: result.otp,
      phone: result.phoneNumber || fullPhone(),
      expiresAt,
    });
    setOtpSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
    setOtp(result.otp);
  };

  useEffect(() => {
    if (!otpBanner) {
      setOtpSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((otpBanner.expiresAt - Date.now()) / 1000),
      );
      setOtpSecondsLeft(left);
      if (left <= 0) setOtpBanner(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [otpBanner]);

  useEffect(() => {
    let mounted = true;
    const loadRemembered = async () => {
      try {
        const remembered = await getRememberedPhone();
        if (!mounted || !remembered) return;
        setPhoneNumber(localTenDigits(remembered.phoneLocal));
        setStep('pin');
      } finally {
        if (mounted) setBooting(false);
      }
    };
    void loadRemembered();
    return () => {
      mounted = false;
    };
  }, []);

  const goMain = () => {
    navigation.reset({
      index: 0,
      routes: [{name: 'ProviderMain'}],
    });
  };

  const applySession = async (token: string, userRaw: any) => {
    const user = normalizeUser({
      ...userRaw,
      role: 'provider',
      phoneVerified: true,
    });
    await setSession(token, user);
    await rememberPhone(
      localTenDigits(phoneNumber),
      INDIA_DIAL_CODE,
    );
    await setCurrentUser(user);
    if (user.approvalStatus && user.approvalStatus !== 'approved') {
      setApprovalNote(
        t('auth.pendingApprovalHint') ||
          'Your profile is pending admin approval. Customers will see you after approval.',
      );
    } else {
      setApprovalNote(null);
    }
  };

  const handleContinuePhone = async () => {
    const numericPhone = phoneNumber.replace(/\D/g, '');
    if (numericPhone.length !== 10) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message:
          t('auth.pleaseEnterValid10DigitPhone') ||
          t('auth.pleaseEnterValidPhone'),
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setInlineError(null);
    try {
      const lookup = await lookupPhone(fullPhone());
      await rememberPhone(numericPhone, INDIA_DIAL_CODE);
      setPin('');
      setOtp('');
      setNewPin('');

      if (lookup.exists && lookup.roleMatch === false) {
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message:
            t('auth.numberRegisteredAsCustomer') ||
            'This number is registered as a customer. Use a different number for the provider app.',
          type: 'error',
        });
        return;
      }

      if (lookup.exists && lookup.hasPin && lookup.roleMatch !== false) {
        setStep('pin');
        return;
      }

      setOtpMode('signup');
      setOtpBanner(null);
      await firebasePhone.sendOtp(fullPhone());
      setStep('otp');
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('auth.loginError'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const finishWithPinReveal = async (
    token: string,
    user: any,
    revealedPin?: string,
  ) => {
    await applySession(token, user);
    if (revealedPin) {
      setCreatedPin(revealedPin);
      setStep('showPin');
    } else {
      goMain();
    }
  };

  const handleLoginWithPin = async (pinOverride?: string) => {
    const code = (pinOverride ?? pin).trim();
    if (!/^\d{6}$/.test(code)) {
      setInlineError(t('auth.pinMustBeSixDigits') || 'PIN must be 6 digits');
      return;
    }
    if (pinLoginInFlight.current || loading) return;
    pinLoginInFlight.current = true;
    setLoading(true);
    setInlineError(null);
    try {
      const result = await loginPin(fullPhone(), code);
      await applySession(result.token, result.user);
      goMain();
    } catch (error: any) {
      setInlineError(error.message || t('auth.incorrectPin') || 'Incorrect PIN');
      setPin('');
    } finally {
      pinLoginInFlight.current = false;
      setLoading(false);
    }
  };

  const handleForgotPin = async () => {
    setLoading(true);
    setInlineError(null);
    setOtp('');
    setNewPin('');
    try {
      setOtpMode('forgot');
      setOtpBanner(null);
      await firebasePhone.sendOtp(fullPhone());
      setStep('otp');
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('auth.failedToSendCode'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setInlineError(null);
    try {
      setOtp('');
      setOtpBanner(null);
      await firebasePhone.sendOtp(fullPhone());
    } catch (error: any) {
      setInlineError(error.message || t('auth.failedToSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndSetPin = async () => {
    if (!otp.trim()) {
      setInlineError(t('auth.pleaseEnterCode') || 'Enter OTP');
      return;
    }
    if (!/^\d{6}$/.test(newPin.trim())) {
      setInlineError(t('auth.pinMustBeSixDigits') || 'PIN must be 6 digits');
      return;
    }
    setLoading(true);
    setInlineError(null);
    try {
      await firebasePhone.verifyOtp(otp.trim());
      const idToken = await firebasePhone.getIdToken();
      const result =
        otpMode === 'signup'
          ? await registerWithOtp(fullPhone(), newPin.trim(), {
              idToken,
              fullName: 'Provider',
            })
          : await resetPin(fullPhone(), newPin.trim(), {idToken});
      await firebasePhone.reset();
      await finishWithPinReveal(
        result.token,
        result.user,
        result.pin || newPin.trim(),
      );
      setOtpBanner(null);
    } catch (error: any) {
      setInlineError(error.message || t('auth.failedToVerifyCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherNumber = async () => {
    await firebasePhone.reset();
    await clearAllCredentials();
    setCurrentUser(null);
    setPhoneNumber('');
    setPin('');
    setOtp('');
    setNewPin('');
    setCreatedPin(null);
    setInlineError(null);
    setOtpBanner(null);
    setApprovalNote(null);
    setOtpMode('signup');
    setStep('phone');
  };

  const subtitleForStep = () => {
    switch (step) {
      case 'showPin':
        return (
          t('auth.saveYourPinLead') ||
          'Save this 6-digit PIN. You will use it with this number.'
        );
      case 'pin':
        return (
          t('auth.enterPinLead') ||
          'Enter your 6-digit PIN to sign in as a provider.'
        );
      case 'otp':
        return otpMode === 'signup'
          ? t('auth.signupOtpLead') ||
              'Verify this number with OTP, then set your own 6-digit PIN.'
          : t('auth.enterOtpLead') ||
              'Enter the OTP, then choose your new 6-digit PIN.';
      default:
        return (
          t('auth.providerLoginLead') ||
          'Enter your mobile number. New providers need OTP + PIN. You appear to customers only after admin approval.'
        );
    }
  };

  if (booting) {
    return (
      <View
        style={[
          styles.container,
          styles.boot,
          {backgroundColor: theme.background},
        ]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={styles.backButton} />
          <LanguageSwitcher compact />
        </View>

        {otpBanner && otpSecondsLeft > 0 ? (
          <Banner
            variant="info"
            title={
              t('auth.otpBannerTitle', {phone: otpBanner.phone}) ||
              `OTP for ${otpBanner.phone}`
            }
            detail={
              t('auth.otpExpiresIn', {
                time: formatMmSs(otpSecondsLeft),
              }) || `Expires in ${formatMmSs(otpSecondsLeft)}`
            }
            meta={otpBanner.otp}
            onDismiss={() => setOtpBanner(null)}
          />
        ) : null}

        <View style={styles.header}>
          <Icon name="construct-outline" size={56} color={theme.primary} />
          <Text style={[styles.title, {color: theme.text}]}>
            HomeServices Provider
          </Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            {subtitleForStep()}
          </Text>
        </View>

        {step === 'phone' ? (
          <View style={styles.form}>
            <Text style={[styles.phoneLabel, {color: theme.textSecondary}]}>
              {t('auth.phone') || 'Phone'}
            </Text>
            <PhoneNumberInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder={
                t('auth.phoneTenDigitsHint') ||
                t('auth.phonePlaceholder') ||
                '10-digit mobile'
              }
              editable={!loading}
              borderColor={theme.border}
              backgroundColor={theme.card}
              prefixBackgroundColor={isDarkMode ? theme.border : '#F5F5F5'}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              style={{marginBottom: 16}}
            />
            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: theme.primary},
                loading && styles.buttonDisabled,
              ]}
              onPress={() => void handleContinuePhone()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {t('auth.continue') || 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'pin' ? (
          <View style={styles.form}>
            <Text style={[styles.codeHint, {color: theme.textSecondary}]}>
              {t('auth.enterPinFor', {phone: fullPhone()}) ||
                `Enter PIN for ${fullPhone()}`}
            </Text>
            <PinBoxesInput
              value={pin}
              length={6}
              onChange={text => {
                setPin(text);
                setInlineError(null);
              }}
              onComplete={code => {
                void handleLoginWithPin(code);
              }}
              editable={!loading}
              autoFocus
              secure={false}
              cellBackground={theme.card}
              cellBorder={theme.border}
              textColor={theme.text}
              focusedBorder={theme.primary}
            />
            {inlineError ? (
              <Text style={styles.inlineError}>{inlineError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: theme.primary},
                loading && styles.buttonDisabled,
              ]}
              onPress={() => void handleLoginWithPin()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login') || 'Login'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => void handleForgotPin()}
              disabled={loading}>
              <Text style={[styles.linkText, {color: theme.primary}]}>
                {t('auth.forgotPin') || 'Forgot PIN?'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => void handleUseAnotherNumber()}
              disabled={loading}>
              <Text style={[styles.linkText, {color: theme.textSecondary}]}>
                {t('auth.useAnotherNumber') || 'Use another number'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'otp' ? (
          <View style={styles.form}>
            <Text style={[styles.codeHint, {color: theme.textSecondary}]}>
              {t('auth.codeSentHint', {phone: fullPhone()}) ||
                `Enter OTP for ${fullPhone()}`}
            </Text>
            <View
              style={[
                styles.inputContainer,
                {backgroundColor: theme.card, borderColor: theme.border},
              ]}>
              <Icon
                name="chatbubble-ellipses-outline"
                size={20}
                color={theme.textSecondary}
              />
              <TextInput
                style={[styles.input, {color: theme.text, letterSpacing: 4}]}
                placeholder={t('auth.verificationCode') || 'OTP'}
                placeholderTextColor={theme.textSecondary}
                value={otp}
                onChangeText={text => {
                  setOtp(text.replace(/\D/g, '').slice(0, 8));
                  setInlineError(null);
                }}
                keyboardType="number-pad"
                maxLength={8}
                editable={!loading}
                autoFocus
              />
            </View>
            <Text style={[styles.pinLabel, {color: theme.textSecondary}]}>
              {t('auth.chooseSixDigitPin') || 'Choose your 6-digit PIN'}
            </Text>
            <PinBoxesInput
              value={newPin}
              length={6}
              onChange={text => {
                setNewPin(text);
                setInlineError(null);
              }}
              editable={!loading}
              secure={false}
              cellBackground={theme.card}
              cellBorder={theme.border}
              textColor={theme.text}
              focusedBorder={theme.primary}
            />
            {inlineError ? (
              <Text style={styles.inlineError}>{inlineError}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.button,
                {backgroundColor: theme.primary},
                loading && styles.buttonDisabled,
              ]}
              onPress={() => void handleVerifyOtpAndSetPin()}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {otpMode === 'signup'
                    ? t('auth.verifyAndCreateAccount') ||
                      'Verify & create account'
                    : t('auth.verifyOtpAndSetPin') || 'Verify & set PIN'}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => void handleResendOtp()}
              disabled={loading}>
              <Text style={[styles.linkText, {color: theme.primary}]}>
                {t('auth.resendOtp') || 'Resend OTP'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => {
                if (otpMode === 'forgot') {
                  setStep('pin');
                  setInlineError(null);
                  setOtp('');
                  setNewPin('');
                  setOtpBanner(null);
                } else {
                  void handleUseAnotherNumber();
                }
              }}
              disabled={loading}>
              <Text style={[styles.linkText, {color: theme.textSecondary}]}>
                {otpMode === 'forgot'
                  ? t('auth.backToPin') || 'Back to PIN'
                  : t('auth.useAnotherNumber') || 'Use another number'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {step === 'showPin' && createdPin ? (
          <View style={styles.form}>
            <View
              style={[
                styles.pinReveal,
                {backgroundColor: theme.card, borderColor: theme.primary},
              ]}>
              <Text style={[styles.pinLabel, {color: theme.textSecondary}]}>
                {t('auth.yourPin') || 'Your PIN'}
              </Text>
              <Text style={[styles.pinValue, {color: theme.text}]}>
                {createdPin}
              </Text>
            </View>
            {approvalNote ? (
              <Text style={[styles.approvalNote, {color: theme.textSecondary}]}>
                {approvalNote}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.button, {backgroundColor: theme.primary}]}
              onPress={goMain}>
              <Text style={styles.buttonText}>
                {t('auth.continue') || 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() =>
          setAlertModal({visible: false, title: '', message: '', type: 'info'})
        }
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  boot: {justifyContent: 'center', alignItems: 'center'},
  scrollContent: {flexGrow: 1, padding: 24, paddingBottom: 40},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  backButton: {width: 40, height: 40},
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1B6B4A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  otpBannerTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 4,
  },
  otpBannerCode: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 4,
  },
  otpBannerExpiry: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {alignItems: 'center', marginBottom: 28},
  title: {fontSize: 26, fontWeight: 'bold', marginTop: 16, marginBottom: 8},
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  form: {marginBottom: 8},
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: 12,
  },
  input: {flex: 1, marginLeft: 8, fontSize: 16, paddingVertical: 0},
  codeHint: {fontSize: 14, marginBottom: 12, textAlign: 'center'},
  pinLabel: {fontSize: 13, marginBottom: 8, fontWeight: '600'},
  inlineError: {
    color: '#E53E3E',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {opacity: 0.6},
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  linkBtn: {alignItems: 'center', paddingVertical: 10},
  linkText: {fontSize: 14, fontWeight: '600'},
  pinReveal: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  pinValue: {fontSize: 32, fontWeight: '800', letterSpacing: 8, marginTop: 8},
  approvalNote: {fontSize: 13, textAlign: 'center', marginBottom: 16, lineHeight: 18},
});

export default LoginScreen;
