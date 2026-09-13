import React, {useState, useEffect, useCallback} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {
  PROVIDER_WEB,
  webTabBarStyle,
  webTabLabelStyle,
  Icon,
} from 'sapvt-ltd-app-packages';
import {getMyProfile} from '../services/api/providersApi';
import {getMyJobCards} from '../services/api/jobsApi';
import {getUserId} from '../services/session';

import ProviderDashboardScreen from '../screens/ProviderDashboardScreen';
import JobsScreen from '../screens/JobsScreen';
import JobsHistoryScreen from '../screens/JobsHistoryScreen';
import ProviderProfileScreen from '../screens/ProviderProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MyServicesScreen from '../screens/MyServicesScreen';
import ServiceDetailsScreen from '../screens/ServiceDetailsScreen';
import SettingsAccountScreen from '../screens/SettingsAccountScreen';
import SettingsAboutScreen from '../screens/SettingsAboutScreen';
import LegalDocumentScreen from '../screens/LegalDocumentScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import {AccountMenu, AccountMenuProvider} from '../components/account/AccountMenu';
import {HeaderAccountActions} from '../components/account/HeaderAccountActions';
import ProfileSetupModal from '../components/ProfileSetupModal';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import websocketService from '../services/websocketService';
import useTranslation from '../hooks/useTranslation';
import {IncomingBookingProvider} from '../components/IncomingBookingContext';
import {PushEnablePrompt} from '../components/PushEnablePrompt';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack wrapper for Jobs with header
const JobsStack = () => {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  void colorTheme;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        ...( {headerRightContainerStyle: {width: 96, paddingRight: 4}} as object ),
      }}>
      <Stack.Screen
        name="JobsMain"
        component={JobsScreen}
        options={({navigation}) => ({
          title: String(t('nav.activeJobs') || 'Active services'),
          headerRight: () => <HeaderAccountActions navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: String(t('notifications.title') || 'Notifications')}}
      />
    </Stack.Navigator>
  );
};

const JobsHistoryStack = () => {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  void colorTheme;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
        ...( {headerRightContainerStyle: {width: 96, paddingRight: 4}} as object ),
      }}>
      <Stack.Screen
        name="JobsHistoryMain"
        component={JobsHistoryScreen}
        options={({navigation}) => ({
          title: String(t('nav.history') || 'Job history'),
          headerRight: () => <HeaderAccountActions navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: String(t('notifications.title') || 'Notifications')}}
      />
    </Stack.Navigator>
  );
};

const SettingsStack = () => {
  const {isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  void colorTheme;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {backgroundColor: theme.card},
        headerTintColor: theme.text,
        headerTitleStyle: {fontWeight: '700', fontSize: 17},
        ...( {headerRightContainerStyle: {width: 96, paddingRight: 4}} as object ),
      }}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={({navigation}) => ({
          title: String(t('nav.settings') || t('common.settings')),
          headerRight: () => (
            <AccountMenu navigation={navigation} compact />
          ),
        })}
      />
      <Stack.Screen
        name="SettingsProfile"
        component={ProviderProfileScreen}
        options={{title: String(t('settings.sectionProfile'))}}
      />
      <Stack.Screen
        name="MyServices"
        component={MyServicesScreen}
        options={{title: String(t('settings.sectionServices') || 'My services')}}
      />
      <Stack.Screen
        name="ServiceDetails"
        component={ServiceDetailsScreen}
        options={{title: String(t('settings.serviceDetails') || 'Service')}}
      />
      <Stack.Screen
        name="SettingsAccount"
        component={SettingsAccountScreen}
        options={{title: String(t('settings.sectionAccount'))}}
      />
      <Stack.Screen
        name="SettingsAbout"
        component={SettingsAboutScreen}
        options={{title: String(t('settings.sectionAbout'))}}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={({route}: any) => ({
          title:
            route?.params?.kind === 'terms'
              ? String(t('settings.terms'))
              : String(t('collab.privacy')),
        })}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{title: String(t('help.title'))}}
      />
    </Stack.Navigator>
  );
};

export default function ProviderTabNavigator() {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {currentUser, isDarkMode, colorTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  void colorTheme;
  const insets = useSafeAreaInsets();
  const userId = getUserId(currentUser);
  const [showProfileSetupModal, setShowProfileSetupModal] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  const checkProviderProfile = useCallback(async () => {
    if (!userId) return;

    try {
      // Use backend API to check provider profile
      const provider = await getMyProfile();

      // If no profile exists, show the modal
      if (!provider) {
        setShowProfileSetupModal(true);
        setHasCheckedProfile(true);
      } else {
        // Profile exists - connect WebSocket for real-time booking notifications
        const providerId = provider._id || provider.id || userId;
        try {
          websocketService.connect(providerId);
          console.log('WebSocket connected for provider:', providerId);
        } catch (wsError) {
          console.warn('Failed to connect WebSocket:', wsError);
          // Don't block the app if WebSocket fails
        }
        setShowProfileSetupModal(false);
        setHasCheckedProfile(true);
      }
    } catch (error) {
      console.error('Error checking provider profile:', error);
      // On error, still mark as checked but don't show modal
      // This prevents blocking the user if API is temporarily unavailable
      setHasCheckedProfile(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || hasCheckedProfile) return;
    checkProviderProfile();
  }, [userId, hasCheckedProfile, checkProviderProfile]);

  // Disconnect only when leaving the provider tabs (not when profile-check state flips)
  useEffect(() => {
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Re-check profile when screen comes into focus (e.g., after returning from profile setup)
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      // Only re-check if we haven't confirmed a profile yet — avoid reconnect churn
      if (!hasCheckedProfile) {
        checkProviderProfile();
      }
    }, [userId, hasCheckedProfile, checkProviderProfile])
  );

  const handleSetupNow = () => {
    setShowProfileSetupModal(false);
    // Navigate to profile setup screen
    navigation.navigate('ProviderProfileSetup' as never);
  };

  const handleSetupLater = () => {
    setShowProfileSetupModal(false);
  };

  return (
    <IncomingBookingProvider>
      <AccountMenuProvider>
      <ProfileSetupModal
        visible={showProfileSetupModal}
        onSetupNow={handleSetupNow}
        onSetupLater={handleSetupLater}
      />

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          headerShown: false,
          tabBarStyle: [
            webTabBarStyle({
              height: PROVIDER_WEB.tabBarH,
              padTop: PROVIDER_WEB.tabBarPadTop,
              safeBottom: insets.bottom,
              borderTopColor: theme.border,
            }),
            {
              backgroundColor: theme.tabBar,
              borderTopColor: theme.border,
            },
          ],
          tabBarLabelStyle: webTabLabelStyle(
            PROVIDER_WEB.tabLabelSize,
            PROVIDER_WEB.tabLabelWeight,
          ),
          tabBarItemStyle: {
            borderWidth: 0,
            borderRightWidth: 0,
            borderLeftWidth: 0,
          },
        }}>
        <Tab.Screen
          name="Dashboard"
          component={ProviderDashboardScreen}
          options={{
            tabBarIcon: ({color}) => (
              <Icon name="home" size={PROVIDER_WEB.tabIcon} color={color} />
            ),
            tabBarLabel: String(t('nav.home') || t('common.home')),
          }}
        />
        <Tab.Screen
          name="Jobs"
          component={JobsStack}
          options={{
            tabBarIcon: ({color}) => (
              <Icon name="work" size={PROVIDER_WEB.tabIcon} color={color} />
            ),
            tabBarLabel: String(t('nav.activeTab') || t('nav.activeJobs')),
          }}
        />
        <Tab.Screen
          name="History"
          component={JobsHistoryStack}
          options={{
            tabBarIcon: ({color}) => (
              <Icon name="history" size={PROVIDER_WEB.tabIcon} color={color} />
            ),
            tabBarLabel: String(t('nav.history') || t('common.history')),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsStack}
          options={{
            tabBarIcon: ({color}) => (
              <Icon name="settings" size={PROVIDER_WEB.tabIcon} color={color} />
            ),
            tabBarLabel: String(t('nav.settings') || t('common.settings')),
          }}
        />
      </Tab.Navigator>
      <PushEnablePrompt />
      </AccountMenuProvider>
    </IncomingBookingProvider>
  );
}
