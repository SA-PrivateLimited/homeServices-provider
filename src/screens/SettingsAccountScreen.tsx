import React, {useEffect, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Button, formatPhoneDisplay, Icon} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';
import {useStore} from '../store';
import {useResolvedTheme} from '../hooks/useResolvedTheme';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import authService from '../services/authService';
import {CommonActions} from '@react-navigation/native';
import {CrystalSurface} from '../components/CrystalSurface';
import {NotificationsSettingsCard} from '../components/NotificationsSettingsCard';
import {
  biometricKindLabel,
  enableBiometricUnlock,
  getBiometricAvailability,
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
} from '../services/biometricUnlock';
import {
  PARTNER_COLOR_THEMES,
  type PartnerColorThemeId,
} from '../utils/partnerColorTheme';
import {getBrandThemeSwatch} from '../utils/theme';
import {deleteMe} from '../services/api/usersApi';
import {ACCOUNT_DELETION_INFO_URL} from '../config/support';
import {getUserFacingErrorMessage} from '../utils/userFacingError';
import {openExternalUrl} from '../utils/openExternalUrl';

export default function SettingsAccountScreen({navigation}: any) {
  const {t} = useTranslation();
  const {
    currentUser,
    setCurrentUser,
    isDarkMode,
    toggleTheme,
    colorTheme,
    setColorTheme,
  } = useStore();
  const theme = useResolvedTheme();
  const phone = formatPhoneDisplay(
    currentUser?.phoneNumber || currentUser?.phone || '',
  );
  const [showLogout, setShowLogout] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricKind, setBiometricKind] = useState(
    String(t('biometric.kindBiometric')),
  );
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const brandSwatch = getBrandThemeSwatch();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const avail = await getBiometricAvailability();
      const enabled = await isBiometricUnlockEnabled();
      if (!mounted) return;
      setBiometricAvailable(avail.available);
      setBiometricEnabled(enabled);
      setBiometricKind(biometricKindLabel(avail.biometryType, t));
    })();
    return () => {
      mounted = false;
    };
  }, [t]);

  const onToggleBiometric = async (next: boolean) => {
    setBiometricBusy(true);
    setBiometricError(null);
    try {
      if (next) {
        const result = await enableBiometricUnlock({
          promptMessage: String(
            t('biometric.enablePrompt', {kind: biometricKind}),
          ),
          cancelButtonText: String(t('common.cancel') || 'Cancel'),
        });
        setBiometricEnabled(result.enabled);
        if (!result.enabled) {
          setBiometricError(String(t('biometric.enableFailed')));
        }
      } else {
        await setBiometricUnlockEnabled(false);
        setBiometricEnabled(false);
      }
    } catch {
      setBiometricError(String(t('biometric.enableFailed')));
      setBiometricEnabled(false);
    } finally {
      setBiometricBusy(false);
    }
  };

  const leaveToLogin = async () => {
    try {
      await setBiometricUnlockEnabled(false);
    } catch {
      /* ignore */
    }
    try {
      await authService.logout();
    } catch {
      /* ignore */
    }
    await setCurrentUser(null);
    const parent = navigation.getParent();
    (parent || navigation).dispatch(
      CommonActions.reset({index: 0, routes: [{name: 'Login'}]}),
    );
  };

  const performLogout = async () => {
    setShowLogout(false);
    await leaveToLogin();
  };

  /** Same pattern as HomeServices customer SettingsScreen handleDeleteAccount. */
  const handleDeleteAccount = () => {
    Alert.alert(
      String(t('settings.deleteAccountTitle') || t('settings.deleteAccount')),
      String(
        t('settings.deleteAccountMessage') ||
          t('settings.deleteAccountConfirm') ||
          'This permanently deletes your account. This cannot be undone.',
      ),
      [
        {text: String(t('common.cancel') || 'Cancel'), style: 'cancel'},
        {
          text: String(
            t('settings.deleteAccountConfirm') ||
              t('settings.deleteAccountCta') ||
              'Delete account',
          ),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (deleting) return;
              setDeleting(true);
              try {
                await deleteMe();
                await leaveToLogin();
              } catch (error: any) {
                Alert.alert(
                  String(t('common.error') || 'Error'),
                  getUserFacingErrorMessage(error) ||
                    String(t('settings.deleteAccountFailed')),
                );
              } finally {
                setDeleting(false);
              }
            })();
          },
        },
      ],
    );
  };

  const onPhonePress = () => {
    Alert.alert(
      String(t('settings.accountPhone')),
      String(t('settings.phoneCannotChangeHere')),
    );
  };

  const colorThemeLabel = (() => {
    const nested = String(t('settings.colorTheme.label') || '');
    if (nested && !nested.startsWith('settings.')) return nested;
    const raw = t('settings.colorTheme');
    return typeof raw === 'string' ? raw : 'Theme color';
  })();

  return (
    <ScrollView
      style={{backgroundColor: theme.background}}
      contentContainerStyle={styles.pad}>
      <NotificationsSettingsCard
        theme={theme}
        title={String(t('notifications.settingsTitle') || t('notifications.title'))}
        body={String(
          t('notifications.settingsBody') || t('notifications.enableHint'),
        )}
        enableLabel={String(
          t('notifications.settingsEnable') ||
            t('notifications.enable') ||
            'Turn on notifications',
        )}
        onLabel={String(t('notifications.settingsOn'))}
        offLabel={String(t('notifications.settingsOff'))}
        blockedLabel={String(t('notifications.settingsBlocked'))}
      />
      <CrystalSurface
        primary={theme.primary}
        card={theme.card}
        isDark={isDarkMode}
        contentStyle={styles.card}>
        <Text style={[styles.h3, {color: theme.text}]}>
          {t('settings.accountPhone')}
        </Text>
        <Pressable
          onPress={onPhonePress}
          accessibilityRole="button"
          accessibilityLabel={`${String(t('settings.accountPhone'))}: ${phone}`}>
          <Text style={[styles.p, {color: theme.text}]}>{phone}</Text>
          <Text style={[styles.muted, {color: theme.textSecondary}]}>
            {t('profile.verifiedCannotChange')}
          </Text>
        </Pressable>
      </CrystalSurface>
      <CrystalSurface
        primary={theme.primary}
        card={theme.card}
        isDark={isDarkMode}
        contentStyle={styles.card}>
        <Text style={[styles.h3, {color: theme.text}]}>
          {t('account.language')}
        </Text>
        <LanguageSwitcher />
      </CrystalSurface>
      <CrystalSurface
        primary={theme.primary}
        card={theme.card}
        isDark={isDarkMode}
        contentStyle={styles.card}>
        <Text style={[styles.h3, {color: theme.text}]}>{colorThemeLabel}</Text>
        <View style={styles.themesRow}>
          {PARTNER_COLOR_THEMES.map(opt => {
            const selected = colorTheme === opt.id;
            const swatch = opt.id === 'brand' ? brandSwatch : opt.swatch;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.themeSwatch,
                  {
                    borderColor: selected ? `${swatch}73` : theme.border,
                    backgroundColor: selected ? `${swatch}1F` : theme.background,
                  },
                ]}
                onPress={() => void setColorTheme(opt.id as PartnerColorThemeId)}
                accessibilityRole="button"
                accessibilityState={{selected}}
                accessibilityLabel={String(t(`settings.colorTheme.${opt.id}`))}>
                <View style={[styles.themeDot, {backgroundColor: swatch}]} />
                <Text
                  style={[
                    styles.themeName,
                    {color: selected ? theme.text : theme.textSecondary},
                  ]}
                  numberOfLines={1}>
                  {String(t(`settings.colorTheme.${opt.id}`))}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.bioRow}>
          <View style={styles.bioCopy}>
            <Text style={[styles.h3, {color: theme.text}]}>
              {t('settings.themeMode.dark')}
            </Text>
            <Text style={[styles.muted, {color: theme.textSecondary}]}>
              {t('settings.appearanceHint')}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={() => toggleTheme()}
            trackColor={{false: theme.border, true: `${theme.primary}99`}}
            thumbColor={isDarkMode ? theme.primary : '#f4f3f4'}
            accessibilityLabel={String(t('settings.themeMode.dark'))}
          />
        </View>
      </CrystalSurface>
      <CrystalSurface
        primary={theme.primary}
        card={theme.card}
        isDark={isDarkMode}
        contentStyle={styles.card}>
        <Text style={[styles.h3, {color: theme.text}]}>
          {t('settings.accountPin')}
        </Text>
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {t('settings.accountPinHint')}
        </Text>
        <Button
          variant="secondary"
          onPress={() => setShowLogout(true)}>
          {t('settings.accountPinSignOut')}
        </Button>
      </CrystalSurface>
      {biometricAvailable ? (
        <CrystalSurface
          primary={theme.primary}
          card={theme.card}
          isDark={isDarkMode}
          contentStyle={styles.card}>
          <View style={styles.bioRow}>
            <View style={styles.bioCopy}>
              <Text style={[styles.h3, {color: theme.text}]}>
                {t('biometric.settingsTitle', {kind: biometricKind})}
              </Text>
              <Text style={[styles.muted, {color: theme.textSecondary}]}>
                {t('biometric.settingsHint', {kind: biometricKind})}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              disabled={biometricBusy}
              onValueChange={value => void onToggleBiometric(value)}
              trackColor={{false: theme.border, true: `${theme.primary}99`}}
              thumbColor={biometricEnabled ? theme.primary : '#f4f3f4'}
              accessibilityLabel={String(
                t('biometric.settingsTitle', {kind: biometricKind}),
              )}
            />
          </View>
          {biometricError ? (
            <Text style={[styles.muted, {color: theme.error}]}>
              {biometricError}
            </Text>
          ) : null}
        </CrystalSurface>
      ) : null}

      </CrystalSurface>

      <View style={[styles.logoutWrap, {borderTopColor: theme.border}]}>
        <Pressable
          style={[
            styles.logout,
            {
              borderColor: `${theme.error}66`,
              backgroundColor: theme.card,
            },
          ]}
          onPress={() => setShowLogout(true)}
          accessibilityRole="button"
          accessibilityLabel={String(t('profile.logout'))}>
          <Icon name="logout" size={20} color={theme.error} />
          <Text style={[styles.logoutText, {color: theme.error}]}>
            {t('profile.logout')}
          </Text>
        </Pressable>
        <Pressable
          style={styles.deleteQuiet}
          disabled={deleting}
          onPress={handleDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel={String(t('settings.deleteAccountCta'))}>
          <Text
            style={[
              styles.deleteQuietText,
              {color: theme.textSecondary, opacity: deleting ? 0.6 : 1},
            ]}>
            {deleting
              ? String(t('common.loading') || '…')
              : String(t('settings.deleteAccountCta'))}
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            void openExternalUrl(ACCOUNT_DELETION_INFO_URL, {
              failTitle: String(t('common.error') || 'Error'),
              failMessage: String(t('settings.legalOpenFailed')),
            })
          }
          accessibilityRole="link">
          <Text style={[styles.link, {color: theme.textSecondary}]}>
            {t('settings.deleteAccountLearnMore')}
          </Text>
        </Pressable>
      </View>
      <LogoutConfirmationModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={() => void performLogout()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: {padding: 16, gap: 12, paddingBottom: 40},
  card: {
    padding: 16,
    gap: 8,
  },
  h3: {fontSize: 16, fontWeight: '700'},
  p: {fontSize: 16},
  muted: {fontSize: 13, lineHeight: 18},
  link: {fontSize: 13, fontWeight: '500', marginTop: 2, textAlign: 'center'},
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  bioCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  themesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeSwatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 88,
  },
  themeDot: {width: 12, height: 12, borderRadius: 6},
  themeName: {fontSize: 12, fontWeight: '600'},
  logoutWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    alignItems: 'center',
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  logoutText: {fontSize: 15, fontWeight: '700'},
  deleteQuiet: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  deleteQuietText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
