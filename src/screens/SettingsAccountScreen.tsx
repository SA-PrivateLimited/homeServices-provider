import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
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

export default function SettingsAccountScreen({navigation}: any) {
  const {t} = useTranslation();
  const {currentUser, setCurrentUser, isDarkMode} = useStore();
  const theme = useResolvedTheme();
  const phone = formatPhoneDisplay(
    currentUser?.phoneNumber || currentUser?.phone || '',
  );
  const [showLogout, setShowLogout] = useState(false);

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
        <Text style={[styles.p, {color: theme.text}]}>{phone}</Text>
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {t('profile.verifiedCannotChange')}
        </Text>
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
        <Text style={[styles.h3, {color: theme.text}]}>
          {t('settings.accountPin')}
        </Text>
        <Text style={[styles.muted, {color: theme.textSecondary}]}>
          {t('settings.accountPinHint')}
        </Text>
        <Button variant="secondary" disabled>
          {t('settings.accountPinChange')}
        </Button>
      </CrystalSurface>
      {/* Web `.settings-account-logout` + `.settings-account-logout-btn` */}
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
      </View>
      <LogoutConfirmationModal
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={async () => {
          setShowLogout(false);
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
        }}
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
  muted: {fontSize: 13},
  logoutWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
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
});
