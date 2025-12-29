import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import CountryCodePicker from '../components/CountryCodePicker';
import {DEFAULT_COUNTRY_CODE, CountryCode} from '../utils/countryCodes';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({navigation}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);

  const {isDarkMode, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const handleSendPhoneCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Validate phone number length (minimum 10 digits for India)
    const numericPhone = phoneNumber.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Combine country code with phone number (E.164 format)
    const fullPhoneNumber = selectedCountry.dialCode + numericPhone;

    setLoading(true);
    try {
      console.log('Attempting to send code to:', fullPhoneNumber);
      const result = await authService.sendPhoneVerificationCode(fullPhoneNumber);
      setConfirmResult(result);
      Alert.alert('Success', 'Verification code sent to your phone');
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    if (!confirmResult) {
      Alert.alert('Error', 'Please request a verification code first');
      return;
    }

    setLoading(true);
    try {
      console.log('🔐 [LOGIN] Verifying code for provider login...');
      const user = await authService.verifyPhoneCode(
        confirmResult,
        verificationCode,
        'Provider', // Default name for phone login
      );

      console.log('✅ [LOGIN] Code verified, setting up provider user...');
      // Set role as 'provider' for HomeServicesProvider app
      const userWithRole = {
        ...user,
        role: 'provider' as const,
      };

      // Update user role in Firestore if needed
      if (user.role !== 'provider') {
        try {
          console.log('📝 [LOGIN] Updating user role to provider...');
          await authService.updateUserRole(user.id, 'provider');
          userWithRole.role = 'provider';
        } catch (error) {
          // Role update failed, but continue with login
          console.warn('⚠️ [LOGIN] Failed to update user role:', error);
        }
      }

      console.log('✅ [LOGIN] Setting current user and navigating...');
      setCurrentUser(userWithRole);
      
      // Check if phone is verified
      if (userWithRole.phoneVerified !== true) {
        console.log('⚠️ [LOGIN] Phone not verified, redirecting to PhoneVerification...');
        navigation.reset({
          index: 0,
          routes: [{name: 'PhoneVerification'}],
        });
      } else {
        console.log('✅ [LOGIN] Phone verified, navigating to ProviderMain...');
        navigation.reset({
          index: 0,
          routes: [{name: 'ProviderMain'}],
        });
      }
    } catch (error: any) {
      console.error('❌ [LOGIN] Verification failed:', error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Failed to verify code';
      
      if (error.message?.includes('Connection reset') || error.message?.includes('Connection error')) {
        errorMessage = 'Network connection error. Please check your internet and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const user = await authService.signInWithGoogle();

      // Set role as 'provider' for HomeServicesProvider app
      const userWithRole = {
        ...user,
        role: 'provider' as const,
      };

      // Update user role in Firestore if needed
      if (user.role !== 'provider') {
        try {
          await authService.updateUserRole(user.id, 'provider');
          userWithRole.role = 'provider';
        } catch (error) {
          // Role update failed, but continue with login
          console.warn('Failed to update user role:', error);
        }
      }

      setCurrentUser(userWithRole);
      
      // Check if phone is verified
      if (userWithRole.phoneVerified !== true) {
        navigation.reset({
          index: 0,
          routes: [{name: 'PhoneVerification'}],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{name: 'ProviderMain'}],
        });
      }
    } catch (error: any) {
      if (error.message?.includes('cancelled')) {
        // User cancelled, don't show error
        return;
      }
      Alert.alert('Error', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Icon name="construct" size={60} color={theme.primary} />
          <Text style={[styles.title, {color: theme.text}]}>HomeServices Provider</Text>
          <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
            Login to provide home services
          </Text>
        </View>

        {/* Phone Login Form */}
          <View style={styles.form}>
            {!confirmResult ? (
              <>
                <View style={styles.phoneInputRow}>
                  <CountryCodePicker
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                  />
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        flex: 1,
                      },
                    ]}>
                    <TextInput
                      style={[styles.input, {color: theme.text}]}
                      placeholder="9876543210"
                      placeholderTextColor={theme.textSecondary}
                      value={phoneNumber}
                      onChangeText={(text) => {
                        // Remove non-numeric characters
                        const numericText = text.replace(/\D/g, '');
                        setPhoneNumber(numericText);
                      }}
                      keyboardType="phone-pad"
                      editable={!loading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {backgroundColor: theme.primary},
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleSendPhoneCode}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.phoneNumberDisplay}>
                  <Text style={[styles.phoneNumberText, {color: theme.textSecondary}]}>
                    Code sent to: {selectedCountry.dialCode} {phoneNumber}
                  </Text>
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}>
                  <Icon
                    name="keypad-outline"
                    size={20}
                    color={theme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, {color: theme.text}]}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={theme.textSecondary}
                    value={verificationCode}
                    onChangeText={(text) => {
                      // Only allow numeric input, max 6 digits
                      const numericText = text.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(numericText);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    {
                      backgroundColor: theme.primary,
                      opacity: verificationCode.length === 6 && !loading ? 1 : 0.6,
                    },
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleVerifyPhoneCode}
                  disabled={loading || verificationCode.length !== 6}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.changeNumberButton}
                    onPress={() => {
                      setConfirmResult(null);
                      setVerificationCode('');
                      setPhoneNumber('');
                    }}
                    disabled={loading}>
                    <Icon name="arrow-back" size={16} color={theme.primary} />
                    <Text style={[styles.changeNumberText, {color: theme.primary}]}>
                      Change Number
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleSendPhoneCode}
                    disabled={loading}>
                    <Text style={[styles.resendText, {color: theme.primary}]}>
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

        {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
            <Text style={[styles.dividerText, {color: theme.textSecondary}]}>
              OR
            </Text>
            <View style={[styles.divider, {backgroundColor: theme.border}]} />
          </View>

        {/* Google Sign-In */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              {backgroundColor: theme.card, borderColor: theme.border},
              loading && styles.buttonDisabled,
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}>
            <Icon name="logo-google" size={20} color="#DB4437" />
            <Text style={[styles.googleButtonText, {color: theme.text}]}>
              Continue with Google
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  phoneNumberDisplay: {
    marginBottom: 12,
    alignItems: 'center',
  },
  phoneNumberText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  changeNumberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeNumberText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  googleButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginScreen;
