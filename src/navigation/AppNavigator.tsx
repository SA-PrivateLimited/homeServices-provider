import React, {useState, useEffect} from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import LanguageSwitcher from '../components/LanguageSwitcher';
import useTranslation from '../hooks/useTranslation';
import {
  getStoredJwt,
  normalizeUser,
  readStoredUser,
} from '../services/session';
import {onSessionExpired} from '../services/sessionExpiry';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import ProviderTabNavigator from './ProviderTabNavigator';
import JobDetailsScreen from '../screens/JobDetailsScreen';
import ServiceProviderProfileSetupScreen from '../screens/ServiceProviderProfileSetupScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';
import ShareContactRecommendationScreen from '../screens/ShareContactRecommendationScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const jwt = await getStoredJwt();
        const storedUser = await readStoredUser();
        if (jwt && storedUser && mounted) {
          setCurrentUser(normalizeUser(storedUser));
          setHasSession(true);
        } else if (mounted) {
          setCurrentUser(null);
          setHasSession(false);
        }
      } catch (e) {
        console.warn('Provider app boot failed:', e);
        if (mounted) {
          setCurrentUser(null);
          setHasSession(false);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    };
    void boot();
    return () => {
      mounted = false;
    };
  }, [setCurrentUser]);

  useEffect(() => {
    return onSessionExpired(() => {
      void (async () => {
        try {
          await setCurrentUser(null);
        } catch {
          // ignore
        }
        setHasSession(false);
        if (navigationRef.isReady()) {
          navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{name: 'Login'}],
            }),
          );
        }
      })();
    });
  }, [setCurrentUser]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={{
        dark: isDarkMode,
        colors: {
          primary: theme.primary,
          background: theme.background,
          card: theme.card,
          text: theme.text,
          border: theme.border,
          notification: theme.primary,
        },
      }}>
      <Stack.Navigator
        initialRouteName={hasSession ? 'ProviderMain' : 'Login'}
        screenOptions={{headerShown: false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen
          name="PhoneVerification"
          component={PhoneVerificationScreen}
          options={{headerShown: false, gestureEnabled: false}}
        />
        <Stack.Screen name="ProviderMain" component={ProviderTabNavigator} />
        <Stack.Screen
          name="JobDetails"
          component={JobDetailsScreen}
          options={{
            headerShown: true,
            title: 'Job Details',
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="ProviderProfileSetup"
          component={ServiceProviderProfileSetupScreen}
          options={{
            headerShown: true,
            title: String(
              t('providerProfile.serviceProviderProfile') ||
                'Service Provider Profile Setup',
            ),
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
            headerRight: () => (
              <View style={{marginRight: 10}}>
                <LanguageSwitcher compact />
              </View>
            ),
          }}
        />
        <Stack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="ShareContactRecommendation"
          component={ShareContactRecommendationScreen}
          options={{
            headerShown: true,
            title: String(t('recommendations.shareContact') || 'Share Contact'),
            headerStyle: {backgroundColor: theme.card},
            headerTintColor: theme.text,
            headerRight: () => (
              <View style={{marginRight: 10}}>
                <LanguageSwitcher compact />
              </View>
            ),
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
