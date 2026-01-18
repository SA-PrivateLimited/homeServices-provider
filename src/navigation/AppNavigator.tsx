import React, {useState, useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import LanguageSwitcher from '../components/LanguageSwitcher';
import useTranslation from '../hooks/useTranslation';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';

// Tab Navigators
import ProviderTabNavigator from './ProviderTabNavigator'; // Provider tabs

// Shared screens
import JobDetailsScreen from '../screens/JobDetailsScreen';
import ServiceProviderProfileSetupScreen from '../screens/ServiceProviderProfileSetupScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import PhoneVerificationScreen from '../screens/PhoneVerificationScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (authUser) => {
      if (authUser) {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(authUser.uid)
            .get();

          if (userDoc.exists) {
            const userData = userDoc.data();
            // HomeServicesProvider app is for providers only - set role to provider
            setUserRole('provider');
            setPhoneVerified(userData?.phoneVerified === true);
            
            // Update store with user data
            setCurrentUser({
              id: userDoc.id,
              ...userData,
              createdAt: userData?.createdAt?.toDate(),
              phoneVerified: userData?.phoneVerified === true,
            } as any);
          } else {
            // New user - set as provider for HomeServicesProvider app
            setUserRole('provider');
            setPhoneVerified(false);
          }
        } catch (error) {
          setUserRole(null);
          setPhoneVerified(null);
        }
      } else {
        setUserRole(null);
        setPhoneVerified(null);
      }

      setUser(authUser);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  const getInitialRoute = () => {
    if (!user) return 'Login';
    
    // Check if phone is verified - if not, redirect to phone verification
    if (phoneVerified === false) {
      return 'PhoneVerification';
    }
    
    // HomeServicesProvider app is for providers only - always go to ProviderMain
    return 'ProviderMain';
  };

  return (
    <NavigationContainer
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
        initialRouteName={getInitialRoute()}
        screenOptions={{headerShown: false}}>
        {/* Authentication */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen 
          name="PhoneVerification" 
          component={PhoneVerificationScreen}
          options={{
            headerShown: false,
            gestureEnabled: false, // Prevent back navigation
          }}
        />

        {/* Provider Navigation */}
        <Stack.Screen name="ProviderMain" component={ProviderTabNavigator} />

        {/* Shared Screens */}
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
            title: String(t('providerProfile.serviceProviderProfile') || 'Service Provider Profile Setup'),
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
          options={{
            headerShown: false,
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
