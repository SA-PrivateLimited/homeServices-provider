import React, {useState, useEffect, useCallback} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {getMyProfile} from '../services/api/providersApi';
import {getUserId} from '../services/session';

import ProviderDashboardScreen from '../screens/ProviderDashboardScreen';
import JobsScreen from '../screens/JobsScreen';
import JobsHistoryScreen from '../screens/JobsHistoryScreen';
import ProviderProfileScreen from '../screens/ProviderProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationIcon from '../components/NotificationIcon';
import ProfileSetupModal from '../components/ProfileSetupModal';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import websocketService from '../services/websocketService';
import useTranslation from '../hooks/useTranslation';
import {IncomingBookingProvider} from '../components/IncomingBookingContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack wrapper for Jobs with header
const JobsStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="JobsMain"
        component={JobsScreen}
        options={({navigation}) => ({
          title: 'Jobs',
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </Stack.Navigator>
  );
};

// Stack wrapper for Jobs History with header
const JobsHistoryStack = () => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="JobsHistoryMain"
        component={JobsHistoryScreen}
        options={({navigation}) => ({
          title: 'Job History',
          headerRight: () => (
            <NotificationIcon
              onPress={() => navigation.navigate('Notifications')}
            />
          ),
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{title: 'Notifications'}}
      />
    </Stack.Navigator>
  );
};

export default function ProviderTabNavigator() {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {currentUser} = useStore();
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
      <ProfileSetupModal
        visible={showProfileSetupModal}
        onSetupNow={handleSetupNow}
        onSetupLater={handleSetupLater}
      />

      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#34C759',
          tabBarInactiveTintColor: '#8E8E93',
          headerShown: false,
          tabBarStyle: {
            borderWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
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
            tabBarIcon: ({color, size}) => (
              <Icon name="dashboard" size={size} color={color} />
            ),
            tabBarLabel: String(t('common.home')),
          }}
        />
        <Tab.Screen
          name="Jobs"
          component={JobsStack}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="work" size={size} color={color} />
            ),
            tabBarLabel: String(t('common.jobs')),
          }}
        />
        <Tab.Screen
          name="History"
          component={JobsHistoryStack}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="history" size={size} color={color} />
            ),
            tabBarLabel: String(t('common.history')),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProviderProfileScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="person" size={size} color={color} />
            ),
            tabBarLabel: String(t('common.profile')),
          }}
        />
      </Tab.Navigator>
    </IncomingBookingProvider>
  );
}
