import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {CommonActions} from '@react-navigation/native';
import {Picker} from '@react-native-picker/picker';
import {useStore} from '../store';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import {COPYRIGHT_OWNER} from '@env';
import authService from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import useTranslation from '../hooks/useTranslation';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({navigation}) => {
  const {isDarkMode, toggleTheme, currentUser, setCurrentUser, language, setLanguage} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const handleAbout = () => {
    Alert.alert(
      t('settings.aboutHomeServices'),
      t('settings.aboutMessage', {owner: COPYRIGHT_OWNER || 'SA-PrivateLimited'}),
      [{text: t('common.ok')}],
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      t('settings.privacy'),
      t('settings.privacyMessage'),
      [{text: t('common.ok')}],
    );
  };

  const handleTerms = () => {
    Alert.alert(
      t('settings.terms'),
      t('settings.termsMessage'),
      [{text: t('common.ok')}],
    );
  };

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await authService.logout();
      setCurrentUser(null);
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleRestartAppTour = () => {
    Alert.alert(
      t('settings.restartAppTour'),
      t('settings.restartAppTourMessage'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('settings.restartTour'),
          onPress: async () => {
            try {
              const currentAuthUser = auth().currentUser;
              if (!currentAuthUser) return;

              // Clear all guide completion flags from Firestore
              await firestore()
                .collection('users')
                .doc(currentAuthUser.uid)
                .update({
                  hasCompletedGuide: firestore.FieldValue.delete(),
                });

              // Clear all guide completion flags from AsyncStorage
              const keys = await AsyncStorage.getAllKeys();
              const guideKeys = keys.filter(key => key.startsWith('@homeservices_guide_completed'));
              if (guideKeys.length > 0) {
                await AsyncStorage.multiRemove(guideKeys);
              }

              Alert.alert(
                t('common.success'),
                t('settings.appTourResetSuccess'),
                [{text: t('common.ok')}]
              );
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.appTourResetError'));
            }
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <View style={[styles.settingItem, {backgroundColor: theme.card}]}>
      <TouchableOpacity
        style={styles.settingLeft}
        onPress={onPress}
        disabled={!onPress || !!rightComponent}
        activeOpacity={onPress ? 0.7 : 1}>
        <Icon name={icon} size={22} color={theme.primary} />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, {color: theme.text}]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, {color: theme.textSecondary}]}>
              {subtitle}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {rightComponent ? (
        <View style={{minWidth: 150, alignItems: 'flex-end'}}>{rightComponent}</View>
      ) : (
        onPress && <Icon name="chevron-forward" size={20} color={theme.textSecondary} />
      )}
    </View>
  );

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const [imageError, setImageError] = React.useState(false);

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.content}>
      {/* Profile Header - Similar to Doctor Profile */}
      {currentUser && (
        <TouchableOpacity 
          style={[styles.profileHeader, {backgroundColor: theme.card}]}
          onPress={() => {
            // Navigate to Profile screen
            navigation.dispatch(
              CommonActions.navigate({
                name: 'Profile',
              }),
            );
          }}
          activeOpacity={0.7}>
          {(() => {
            const imageUrl = (currentUser.profileImage || '').trim();
            const hasValidImage = imageUrl !== '' && !imageError && 
              (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
               imageUrl.startsWith('file://') || imageUrl.startsWith('content://'));
            
            if (hasValidImage) {
              return (
                <Image
                  source={{uri: imageUrl}}
                  style={styles.profileHeaderImage}
                  onError={() => setImageError(true)}
                  resizeMode="cover"
                />
              );
            }
            
            return (
              <View style={[styles.profileHeaderImage, styles.profileHeaderImagePlaceholder, {backgroundColor: theme.primary}]}>
                {currentUser.name && currentUser.name.trim() !== '' ? (
                  <Text style={styles.profileHeaderInitials}>
                    {getInitials(currentUser.name)}
                  </Text>
                ) : (
                  <Icon name="person" size={50} color="#fff" />
                )}
              </View>
            );
          })()}
          <Text style={[styles.profileHeaderName, {color: theme.text}]}>
            {currentUser.name}
          </Text>
          <Text style={[styles.profileHeaderEmail, {color: theme.textSecondary}]}>
            {currentUser.email}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          {t('settings.account')}
        </Text>
        {currentUser && (
          <SettingItem
            icon="person-circle"
            title={t('settings.profile')}
            subtitle={currentUser.name}
            onPress={() => {
              // Navigate to Profile screen
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'Profile',
                }),
              );
            }}
          />
        )}
        <SettingItem
          icon="log-out-outline"
          title={t('settings.logout')}
          subtitle={t('settings.logoutSubtitle')}
          onPress={handleLogout}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          {String(t('settings.appearance') || 'APPEARANCE')}
        </Text>
        <SettingItem
          icon="moon"
          title={String(t('settings.darkMode') || 'Dark Mode')}
          subtitle={isDarkMode ? String(t('common.enabled') || 'Enabled') : String(t('common.disabled') || 'Disabled')}
          rightComponent={
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{false: theme.border, true: theme.primary}}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingItem
          icon="language"
          title={String(t('settings.language') || 'Language')}
          subtitle={language === 'en' ? String(t('settings.english') || 'English') : String(t('settings.hindi') || 'Hindi')}
          rightComponent={<LanguageSwitcher />}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          {t('settings.support')}
        </Text>
        <SettingItem
          icon="help-circle"
          title={t('settings.help')}
          subtitle={t('settings.helpSubtitle')}
          onPress={() => navigation.navigate('HelpSupport')}
        />
        <SettingItem
          icon="book"
          title={t('settings.appTour')}
          subtitle={t('settings.appTourSubtitle')}
          onPress={handleRestartAppTour}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          {t('settings.information')}
        </Text>
        <SettingItem
          icon="information-circle"
          title={t('settings.about')}
          subtitle={t('settings.aboutSubtitle')}
          onPress={handleAbout}
        />
        <SettingItem
          icon="shield-checkmark"
          title={t('settings.privacy')}
          onPress={handlePrivacy}
        />
        <SettingItem
          icon="document-text"
          title={t('settings.terms')}
          onPress={handleTerms}
        />
      </View>

      <View style={styles.footer}>
        <Icon name="medical" size={32} color={theme.primary} />
        <Text style={[styles.appName, {color: theme.text}]}>{t('settings.appName')}</Text>
        <Text style={[styles.version, {color: theme.textSecondary}]}>
          {t('settings.version')} 1.0.0
        </Text>
        <Text style={[styles.copyright, {color: theme.textSecondary}]}>
          © 2025 {COPYRIGHT_OWNER || 'SA-PrivateLimited'}
        </Text>
        <Text style={[styles.copyright, {color: theme.textSecondary}]}>
          {t('settings.allRightsReserved')}
        </Text>
        <View style={styles.disclaimer}>
          <Icon name="alert-circle-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.disclaimerText, {color: theme.textSecondary}]}>
            {t('settings.disclaimer')}
          </Text>
        </View>
      </View>
      
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...commonStyles.shadowSmall,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  version: {
    fontSize: 14,
    marginTop: 4,
  },
  copyright: {
    fontSize: 12,
    marginTop: 4,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    marginLeft: 8,
    textAlign: 'center',
    lineHeight: 16,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 24,
    marginHorizontal: 20,
    borderRadius: 12,
    ...commonStyles.shadowSmall,
  },
  profileHeaderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  profileHeaderImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderInitials: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileHeaderName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileHeaderEmail: {
    fontSize: 14,
  },
  languagePicker: {
    width: 150,
    height: 50,
    backgroundColor: 'transparent',
  },
});

export default SettingsScreen;
