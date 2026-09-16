/**
 * Provider login — phone + OTP (new) / PIN (returning), same pattern as customer.
 * New providers start as approvalStatus=pending until admin approves.
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Share,
  Linking,
  StatusBar,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStore} from '../store';
import {loginFromWeb as web, WEB} from '../fromWebCss/loginFromWeb.styles';
import {
  lookupPhone,
  loginPin,
  enablePartnerProfile,
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
import {WebCodeBoxes} from '../components/login/WebCodeBoxes';
import AlertModal from '../components/AlertModal';
import useTranslation from '../hooks/useTranslation';
import {Banner} from 'sapvt-ltd-app-packages';
import PhoneNumberInput from '../components/PhoneNumberInput';
import {LoginStepIndicator} from '../components/login/LoginStepIndicator';
import {LoginLangSwitcher} from '../components/login/LoginLangSwitcher';
import {LoginTermsMini} from '../components/login/LoginTermsMini';
import {
  formatPhoneDisplay,
  INDIA_DIAL_CODE,
  localTenDigits,
} from '../utils/phone';
import {useFirebasePhoneAuth} from '../hooks/useFirebasePhoneAuth';
import {getCustomerWebUrl} from '../utils/customerWebUrl';
import {isWeakPin, LOGIN_PIN_LENGTH, LOGIN_PIN_RE} from '../components/login/pinUtils';
import {SuggestPartnerModal} from '../components/SuggestPartnerModal';
import {lightTheme, darkTheme} from '../utils/theme';
import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../config/support';
import {openExternalUrl} from '../utils/openExternalUrl';
import {isBrowserRequiredOtpError} from '../utils/canOpenHttpsUrl';
import ConfirmationModal from '../components/ConfirmationModal';
import {
  enableBiometricUnlock,
  getBiometricAvailability,
  isBiometricUnlockEnabled,
  biometricKindLabel,
} from '../services/biometricUnlock';

const PARTNER_WEB_URL = 'https://partner.akansho.com';

interface LoginScreenProps {
  navigation: any;
}

type Step = 'phone' | 'pin' | 'otp' | 'createPin' | 'showPin';
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

function authErrorMessage(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
  fallbackKey: string,
): string {
  if (isBrowserRequiredOtpError(error)) {
    return (
      t('auth.browserRequiredForOtp') ||
      'Phone verification needs a browser on this device. Please install or enable Chrome (or another browser) and try again.'
    );
  }
  const message =
    error instanceof Error
      ? error.message
      : String((error as {message?: string})?.message || '');
  return message || t(fallbackKey);
}

function LoginPrimary({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isDisabled = Boolean(loading || disabled);
  return (
    <TouchableOpacity
      style={[web.primaryFill, isDisabled && {opacity: 0.65}]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{disabled: isDisabled, busy: Boolean(loading)}}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={web.primaryFillText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('phone');
  const [otpMode, setOtpMode] = useState<OtpMode>('signup');
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [customerOnly, setCustomerOnly] = useState(false);
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [otpBanner, setOtpBanner] = useState<OtpBanner | null>(null);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [biometricOfferOpen, setBiometricOfferOpen] = useState(false);
  const [biometricKind, setBiometricKind] = useState('Face / Fingerprint');
  const [enablingBiometric, setEnablingBiometric] = useState(false);
  const [approvalNote, setApprovalNote] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const pinLoginInFlight = useRef(false);

  const {setCurrentUser, isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const firebasePhone = useFirebasePhoneAuth();

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

  /** After auth: optionally offer Face/Fingerprint unlock, then enter app. */
  const enterAppAfterAuth = async () => {
    try {
      const enabled = await isBiometricUnlockEnabled();
      const avail = await getBiometricAvailability();
      if (!enabled && avail.available) {
        setBiometricKind(biometricKindLabel(avail.biometryType, t));
        setBiometricOfferOpen(true);
        return;
      }
    } catch {
      // ignore — still enter app
    }
    goMain();
  };

  const confirmEnableBiometric = async () => {
    setEnablingBiometric(true);
    try {
      await enableBiometricUnlock({
        promptMessage: String(
          t('biometric.enablePrompt', {kind: biometricKind}),
        ),
        cancelButtonText: String(t('common.cancel') || 'Cancel'),
      });
    } catch {
      // ignore
    } finally {
      setEnablingBiometric(false);
      setBiometricOfferOpen(false);
      goMain();
    }
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
    setConfirmPin('');

      if (lookup.exists && lookup.hasPin) {
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
        message: authErrorMessage(error, t, 'auth.loginError'),
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
      await enterAppAfterAuth();
    }
  };

  const handleLoginWithPin = async (pinOverride?: string) => {
    const code = (pinOverride ?? pin).trim();
    if (!LOGIN_PIN_RE.test(code)) {
      setInlineError(t('auth.pinMustBeFourDigits') || 'PIN must be 4 digits');
      return;
    }
    if (pinLoginInFlight.current || loading) return;
    pinLoginInFlight.current = true;
    setLoading(true);
    setInlineError(null);
    try {
      const result = await loginPin(fullPhone(), code);
      await applySession(result.token, result.user);
      await enterAppAfterAuth();
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (
        error?.code === 'PARTNER_PROFILE_REQUIRED' ||
        /Create a Partner account/i.test(msg)
      ) {
        setCustomerOnly(true);
        setInlineError(null);
      } else {
        setInlineError(error.message || t('auth.incorrectPin') || 'Incorrect PIN');
        setPin('');
      }
    } finally {
      pinLoginInFlight.current = false;
      setLoading(false);
    }
  };

  const handleCreatePartner = async () => {
    const code = pin.trim();
    if (!LOGIN_PIN_RE.test(code)) {
      setInlineError(t('auth.pinMustBeFourDigits') || 'PIN must be 4 digits');
      return;
    }
    setCreatingPartner(true);
    setInlineError(null);
    try {
      const result = await enablePartnerProfile(fullPhone(), code);
      await applySession(result.token, result.user);
      await enterAppAfterAuth();
    } catch (error: any) {
      setInlineError(error.message || t('auth.incorrectPin') || 'Incorrect PIN');
    } finally {
      setCreatingPartner(false);
    }
  };

  const handleForgotPin = async () => {
    setLoading(true);
    setInlineError(null);
    setOtp('');
    setNewPin('');
    setConfirmPin('');
    try {
      setOtpMode('forgot');
      setOtpBanner(null);
      await firebasePhone.sendOtp(fullPhone());
      setStep('otp');
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: authErrorMessage(error, t, 'auth.failedToSendCode'),
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
      setInlineError(authErrorMessage(error, t, 'auth.failedToSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setInlineError(t('auth.pleaseEnterCode') || 'Enter OTP');
      return;
    }
    setLoading(true);
    setInlineError(null);
    try {
      await firebasePhone.verifyOtp(otp.trim());
      setNewPin('');
      setConfirmPin('');
      setOtpBanner(null);
      setStep('createPin');
    } catch (error: any) {
      setInlineError(error.message || t('auth.failedToVerifyCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (!LOGIN_PIN_RE.test(newPin.trim())) {
      setInlineError(t('auth.pinMustBeFourDigits') || 'PIN must be 4 digits');
      return;
    }
    if (newPin.trim() !== confirmPin.trim()) {
      setInlineError(t('errors.pinMismatch') || 'Both PINs must match.');
      return;
    }
    if (isWeakPin(newPin.trim())) {
      setInlineError(t('errors.weakPin') || 'Please avoid easy PINs like 1234 or 0000.');
      return;
    }
    setLoading(true);
    setInlineError(null);
    try {
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

  const handleUseAnotherNumber = () => {
    setLoading(false);
    setPin('');
    setOtp('');
    setNewPin('');
    setConfirmPin('');
    setCreatedPin(null);
    setInlineError(null);
    setOtpBanner(null);
    setApprovalNote(null);
    setCustomerOnly(false);
    setOtpMode('signup');
    setStep('phone');
    void firebasePhone.reset();
    void clearAllCredentials();
    setCurrentUser(null);
  };

  /** Soft step-back for Android hardware Back — does not clear session/remembered phone. */
  const goBackAuthStep = () => {
    if (loading || creatingPartner || pinLoginInFlight.current) {
      return true;
    }
    if (step === 'pin') {
      setPin('');
      setInlineError(null);
      setCustomerOnly(false);
      setStep('phone');
      return true;
    }
    if (step === 'otp') {
      void firebasePhone.reset();
      setOtp('');
      setNewPin('');
      setConfirmPin('');
      setInlineError(null);
      setOtpBanner(null);
      if (otpMode === 'forgot') {
        setStep('pin');
      } else {
        setStep('phone');
      }
      return true;
    }
    if (step === 'createPin') {
      void firebasePhone.reset();
      setOtp('');
      setNewPin('');
      setConfirmPin('');
      setInlineError(null);
      setOtpBanner(null);
      setStep('otp');
      return true;
    }
    if (step === 'showPin') {
      // Session already applied in finishWithPinReveal — continue into app.
      goMain();
      return true;
    }
    // phone: allow default system back (exit / leave Login)
    return false;
  };

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      goBackAuthStep,
    );
    return () => sub.remove();
  }, [step, loading, creatingPartner, otpMode]);

  const titleForStep = () => {
    switch (step) {
      case 'createPin':
        return otpMode === 'forgot'
          ? t('login.createPinTitleForgot')
          : t('login.createPinTitle');
      case 'showPin':
        return t('login.createPinTitle');
      case 'pin':
        return t('login.pinTitle');
      case 'otp':
        return t('login.otpTitle');
      default:
        return t('login.welcome');
    }
  };

  const subtitleForStep = () => {
    switch (step) {
      case 'createPin':
      case 'showPin':
        return t('login.createPinSubtitle');
      case 'pin':
        return t('login.pinSubtitle');
      case 'otp':
        return otpMode === 'signup'
          ? t('login.otpSubtitle', {phone: fullPhone()})
          : t('login.otpSubtitleForgot', {phone: fullPhone()});
      default:
        return t('login.phoneSubtitle');
    }
  };

  if (booting) {
    return (
      <View style={web.boot}>
        <ActivityIndicator size="large" color={WEB.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={web.layout}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={WEB.navyBand} />
      <View style={web.navyBand} />
      <View
        style={[
          web.stage,
          {
            paddingTop: Math.max(16, 8 + insets.top),
            paddingBottom: 12 + insets.bottom,
          },
        ]}>
        <View style={web.authStack}>
          <View style={web.card}>
            <ScrollView
              contentContainerStyle={web.cardScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <View style={web.cardTop}>
                <View style={web.toolbar}>
                  {step === 'phone' || step === 'pin' || step === 'showPin' ? (
                    <View style={web.toolbarSpacer} />
                  ) : (
                    <TouchableOpacity
                      style={web.backToolbar}
                      onPress={handleUseAnotherNumber}
                      accessibilityRole="button"
                      accessibilityLabel={String(t('login.changeMobile'))}
                      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                      <Text style={web.backText}>{t('login.changeMobile')}</Text>
                    </TouchableOpacity>
                  )}
                  <LoginLangSwitcher />
                </View>

                <LoginStepIndicator
                  step={step}
                  flow={
                    step === 'pin'
                      ? 'pinLogin'
                      : step === 'otp' ||
                        step === 'createPin' ||
                        step === 'showPin'
                        ? 'otpFlow'
                        : 'preview'
                  }
                />

                <View style={web.brandRow}>
                  <Image
                    source={require('../assets/fromWeb/logo.png')}
                    style={web.logo}
                    resizeMode="contain"
                    accessibilityLabel={String(t('login.productName'))}
                  />
                  <View style={web.brandCopy}>
                    <Text style={web.brandName}>{t('login.productName')}</Text>
                    <Text style={web.brandTag}>{t('login.tagline')}</Text>
                  </View>
                </View>
              </View>

              {otpBanner && otpSecondsLeft > 0 ? (
                <Banner
                  variant="info"
                  title={t('auth.otpBannerTitle', {phone: otpBanner.phone})}
                  detail={t('auth.otpExpiresIn', {
                    time: formatMmSs(otpSecondsLeft),
                  })}
                  meta={otpBanner.otp}
                  onDismiss={() => setOtpBanner(null)}
                />
              ) : null}

              <View style={web.cardBody}>
                <View style={web.stepHeader}>
                  {step === 'otp' ? (
                    <View style={[web.stepIcon, web.stepIconOtp]}>
                      <Icon name="chatbubble-ellipses" size={26} color={WEB.otpIcon} />
                    </View>
                  ) : null}
                  {step === 'pin' || step === 'createPin' || step === 'showPin' ? (
                    <View style={[web.stepIcon, web.stepIconPin]}>
                      <Icon name="key" size={26} color={WEB.primary} />
                    </View>
                  ) : null}
                  <Text style={web.stepTitle}>{titleForStep()}</Text>
                  <Text style={web.stepSub}>{subtitleForStep()}</Text>
                </View>

                {step === 'phone' ? (
                  <View style={web.form}>
                    <Text style={web.label}>{t('login.mobileLabel')}</Text>
                    <PhoneNumberInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder={t('login.mobilePlaceholder')}
                      editable={!loading}
                      borderColor={WEB.border}
                      backgroundColor={WEB.card}
                      prefixBackgroundColor="#F5F5F5"
                      textColor={WEB.text}
                      placeholderTextColor={WEB.textSecondary}
                    />
                    <LoginPrimary
                      title={String(t('login.continue'))}
                      onPress={() => void handleContinuePhone()}
                      loading={loading}
                    />
                    <View style={web.trustBadge}>
                      <Icon name="shield-checkmark" size={14} color={WEB.primary} />
                      <Text style={web.trustBadgeText}>{t('login.phoneSafe')}</Text>
                    </View>
                  </View>
                ) : null}

                {step === 'pin' ? (
                  <View style={web.form}>
                    <View style={web.readonlyPhone}>
                      <Text style={web.readonlyPhoneLabel}>
                        {t('login.pinStepMobileLabel')}
                      </Text>
                      <View style={web.readonlyPhoneRow}>
                        <Text
                          style={web.readonlyPhoneValue}
                          accessibilityRole="text"
                          accessibilityLabel={`${String(
                            t('login.pinStepMobileLabel'),
                          )}: ${formatPhoneDisplay(fullPhone())}`}>
                          {formatPhoneDisplay(fullPhone())}
                        </Text>
                        <TouchableOpacity
                          style={web.editMobileBtn}
                          onPress={handleUseAnotherNumber}
                          accessibilityRole="button"
                          accessibilityLabel={String(t('login.changeMobile'))}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                          <Text style={web.editMobileText}>
                            {t('login.editMobile')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={web.pinFieldBlock}>
                      <Text style={web.label}>{t('login.enterPinLabel')}</Text>
                      <WebCodeBoxes
                        value={pin}
                        length={LOGIN_PIN_LENGTH}
                        onChange={text => {
                          setPin(text);
                          setInlineError(null);
                        }}
                        onComplete={code => {
                          void handleLoginWithPin(code);
                        }}
                        editable={!loading}
                        autoFocus
                        secure
                        accessibilityLabel={String(t('login.enterPinLabel'))}
                        accessibilityHint={String(t('login.pinFieldHint'))}
                      />
                    </View>
                    {customerOnly ? (
                      <View style={web.customerOnly}>
                        <Text style={web.customerOnlyTitle}>
                          {t('login.customerOnlyTitle')}
                        </Text>
                        <Text style={web.customerOnlyBody}>
                          {t('login.customerOnlyBody')}
                        </Text>
                        <LoginPrimary
                          title={String(
                            creatingPartner
                              ? t('login.creatingPartner')
                              : t('login.createPartnerAccount'),
                          )}
                          loading={creatingPartner}
                          disabled={loading || pin.length !== LOGIN_PIN_LENGTH}
                          onPress={() => void handleCreatePartner()}
                        />
                      </View>
                    ) : (
                      <>
                        {inlineError ? (
                          <Text style={web.fieldError}>{inlineError}</Text>
                        ) : null}
                        <LoginPrimary
                          title={String(t('login.loginCta'))}
                          onPress={() => void handleLoginWithPin()}
                          loading={loading}
                          disabled={pin.length !== LOGIN_PIN_LENGTH}
                        />
                      </>
                    )}
                    <View style={web.linkRow}>
                      <TouchableOpacity
                        style={web.textLink}
                        onPress={() => void handleForgotPin()}
                        disabled={loading}
                        accessibilityRole="button"
                        accessibilityLabel={String(t('login.forgotPin'))}>
                        <Text style={web.textLinkLabel}>{t('login.forgotPin')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {step === 'otp' ? (
                  <View style={web.form}>
                    <View style={web.readonlyPhone}>
                      <Text style={web.readonlyPhoneLabel}>
                        {t('login.pinStepMobileLabel')}
                      </Text>
                      <View style={web.readonlyPhoneRow}>
                        <Text
                          style={web.readonlyPhoneValue}
                          accessibilityRole="text"
                          accessibilityLabel={`${String(
                            t('login.pinStepMobileLabel'),
                          )}: ${formatPhoneDisplay(fullPhone())}`}>
                          {formatPhoneDisplay(fullPhone())}
                        </Text>
                        <TouchableOpacity
                          style={web.editMobileBtn}
                          onPress={handleUseAnotherNumber}
                          accessibilityRole="button"
                          accessibilityLabel={String(t('login.changeMobile'))}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                          <Text style={web.editMobileText}>
                            {t('login.editMobile')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={web.label}>{t('login.otpLabel')}</Text>
                    <WebCodeBoxes
                      value={otp}
                      length={6}
                      onChange={text => {
                        setOtp(text);
                        setInlineError(null);
                      }}
                      editable={!loading}
                      autoFocus
                    />
                    {inlineError ? (
                      <Text style={web.fieldError}>{inlineError}</Text>
                    ) : null}
                    <LoginPrimary
                      title={String(t('login.verifyOtp'))}
                      onPress={() => void handleVerifyOtp()}
                      loading={loading}
                      disabled={otp.length !== 6}
                    />
                    <TouchableOpacity
                      style={[web.textLink, web.textLinkCenter]}
                      onPress={() => void handleResendOtp()}
                      disabled={loading}>
                      <Text style={web.textLinkLabel}>{t('login.resendOtp')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {step === 'createPin' ? (
                  <View style={web.form}>
                    <View style={web.readonlyPhone}>
                      <Text style={web.readonlyPhoneLabel}>
                        {t('login.pinStepMobileLabel')}
                      </Text>
                      <View style={web.readonlyPhoneRow}>
                        <Text style={web.readonlyPhoneValue}>
                          {formatPhoneDisplay(fullPhone())}
                        </Text>
                        <TouchableOpacity
                          style={web.editMobileBtn}
                          onPress={handleUseAnotherNumber}
                          accessibilityRole="button"
                          accessibilityLabel={String(t('login.changeMobile'))}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                          <Text style={web.editMobileText}>
                            {t('login.editMobile')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={web.label}>{t('login.newPinLabel')}</Text>
                    <WebCodeBoxes
                      value={newPin}
                      length={LOGIN_PIN_LENGTH}
                      onChange={text => {
                        setNewPin(text);
                        setInlineError(null);
                      }}
                      editable={!loading}
                      autoFocus
                      secure
                      accessibilityLabel={String(t('login.newPinLabel'))}
                    />
                    <Text style={web.label}>{t('login.confirmPinLabel')}</Text>
                    <WebCodeBoxes
                      value={confirmPin}
                      length={LOGIN_PIN_LENGTH}
                      onChange={text => {
                        setConfirmPin(text);
                        setInlineError(null);
                      }}
                      editable={!loading}
                      secure
                      accessibilityLabel={String(t('login.confirmPinLabel'))}
                    />
                    {inlineError ? (
                      <Text style={web.fieldError}>{inlineError}</Text>
                    ) : null}
                    <LoginPrimary
                      title={String(t('login.setPinCta'))}
                      onPress={() => void handleSetPin()}
                      loading={loading}
                      disabled={
                        newPin.length !== LOGIN_PIN_LENGTH ||
                        confirmPin.length !== LOGIN_PIN_LENGTH
                      }
                    />
                  </View>
                ) : null}

                {step === 'showPin' && createdPin ? (
                  <View style={web.form}>
                    <View style={web.pinReveal}>
                      <Text style={web.label}>{t('login.pinLabel')}</Text>
                      <Text style={web.pinValue}>{createdPin}</Text>
                    </View>
                    {approvalNote ? (
                      <Text style={web.stepSub}>{approvalNote}</Text>
                    ) : null}
                    <LoginPrimary
                      title={String(t('login.continue'))}
                      onPress={() => void enterAppAfterAuth()}
                    />
                  </View>
                ) : null}

                <View style={web.extras}>
                  <View style={web.utilRow}>
                    <TouchableOpacity
                      style={web.utilBtn}
                      onPress={() => navigation.navigate('HelpSupport')}>
                      <Icon name="help-circle-outline" size={20} color={WEB.primary} />
                      <Text style={web.utilBtnText}>{t('login.helpCta')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={web.utilBtn}
                      onPress={() => {
                        void Share.share({
                          message: String(
                            t('ecosystem.shareMessageEn', {url: PARTNER_WEB_URL}),
                          ),
                          url: PARTNER_WEB_URL,
                        });
                      }}>
                      <Icon name="share-social-outline" size={20} color={WEB.primary} />
                      <Text style={web.utilBtnText}>{t('login.utilShareShort')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={web.extrasBottom}>
                    <TouchableOpacity
                      style={web.partnerLink}
                      onPress={() => setSuggestOpen(true)}>
                      <Text style={web.partnerLinkTitle}>
                        {t('home.suggestPartnerTitle')}
                      </Text>
                      <Text style={web.partnerLinkCta}>
                        {t('home.suggestPartnerCta')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={web.partnerLink}
                      onPress={() => void Linking.openURL(getCustomerWebUrl())}>
                      <Text style={web.partnerLinkTitle}>
                        {t('login.customerBannerTitle')}
                      </Text>
                      <Text style={web.partnerLinkCta}>
                        {t('login.customerBannerCta')}
                      </Text>
                    </TouchableOpacity>
                    <View style={web.extrasFoot}>
                      <Text style={web.extrasTrust}>{t('login.heroSafety')}</Text>
                      <LoginTermsMini
                        onTerms={() => void openExternalUrl(TERMS_OF_SERVICE_URL)}
                        onPrivacy={() => void openExternalUrl(PRIVACY_POLICY_URL)}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() =>
          setAlertModal({visible: false, title: '', message: '', type: 'info'})
        }
      />
      <ConfirmationModal
        visible={biometricOfferOpen}
        title={String(t('biometric.offerTitle', {kind: biometricKind}))}
        message={String(t('biometric.offerBody', {kind: biometricKind}))}
        confirmText={String(t('biometric.offerEnable', {kind: biometricKind}))}
        cancelText={String(t('biometric.offerNotNow'))}
        type="info"
        onConfirm={() => void confirmEnableBiometric()}
        onCancel={() => {
          if (enablingBiometric) return;
          setBiometricOfferOpen(false);
          goMain();
        }}
      />
      <SuggestPartnerModal
        theme={theme}
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
      />
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
