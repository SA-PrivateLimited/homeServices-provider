import React, {useState, useEffect, useCallback} from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useNavigation, useFocusEffect} from '@react-navigation/native';

import ProviderDashboardScreen from '../screens/ProviderDashboardScreen';
import JobsScreen from '../screens/JobsScreen';
import JobsHistoryScreen from '../screens/JobsHistoryScreen';
import ProviderProfileScreen from '../screens/ProviderProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import NotificationIcon from '../components/NotificationIcon';
import PincodeHeader from '../components/PincodeHeader';
import ProfileSetupModal from '../components/ProfileSetupModal';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import websocketService from '../services/websocketService';

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
          headerLeft: () => <PincodeHeader />,
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
          headerLeft: () => <PincodeHeader />,
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
  const [showProfileSetupModal, setShowProfileSetupModal] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const currentUser = auth().currentUser;

  const checkProviderProfile = useCallback(async () => {
    if (!currentUser) return;

    try {
      // Check by UID first (phone auth or if saved with UID as doc ID)
      let providerDoc = await firestore()
        .collection('providers')
        .doc(currentUser.uid)
        .get();

      // If not found by UID, check by email (Google auth)
      if (!providerDoc.exists && currentUser.email) {
        const emailQuery = await firestore()
          .collection('providers')
          .where('email', '==', currentUser.email)
          .limit(1)
          .get();

        if (!emailQuery.empty) {
          providerDoc = emailQuery.docs[0];
        }
      }

      // If no profile exists, show the modal
      if (!providerDoc.exists) {
        setShowProfileSetupModal(true);
        setHasCheckedProfile(true);
      } else {
        // Profile exists - connect WebSocket for real-time booking notifications
        const providerId = providerDoc.id;
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
      setHasCheckedProfile(true);
    }
  }, [currentUser]);

  useEffect(() => {
    // Check if provider has set up their profile
    if (!currentUser || hasCheckedProfile) return;

    checkProviderProfile();

    // Cleanup: Disconnect WebSocket when component unmounts
    return () => {
      websocketService.disconnect();
    };
  }, [currentUser, hasCheckedProfile, checkProviderProfile]);

  // Re-check profile when screen comes into focus (e.g., after returning from profile setup)
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        // Reset check flag to allow re-checking when screen comes into focus
        setHasCheckedProfile(false);
        // Small delay to ensure state update is processed
        setTimeout(() => {
          checkProviderProfile();
        }, 100);
      }
    }, [currentUser, checkProviderProfile])
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
    <>
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
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen
          name="Jobs"
          component={JobsStack}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="work" size={size} color={color} />
            ),
            tabBarLabel: 'Jobs',
          }}
        />
        <Tab.Screen
          name="History"
          component={JobsHistoryStack}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="history" size={size} color={color} />
            ),
            tabBarLabel: 'History',
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProviderProfileScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <Icon name="person" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
}
