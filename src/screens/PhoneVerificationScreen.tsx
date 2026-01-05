/**
 * Phone Verification Screen
 * Required for Google Sign-In users who haven't verified their phone
 * Blocks access to app until phone is verified
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import authService from '../services/authService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import CountryCodePicker from '../components/CountryCodePicker';
import {DEFAULT_COUNTRY_CODE, CountryCode, COUNTRY_CODES} from '../utils/countryCodes';
import AlertModal from '../components/AlertModal';
import SuccessModal from '../components/SuccessModal';

interface PhoneVerificationScreenProps {
  navigation: any;
  route?: any;
}

export default function PhoneVerificationScreen({
  navigation,
  route,
}: PhoneVerificationScreenProps) {
  const mode = route?.params?.mode || 'verify'; // 'verify', 'change', or 'secondary'
  const initialPhoneNumber = route?.params?.phoneNumber || '';
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [retryAfter, setRetryAfter] = useState<number | null>(null); // Seconds until retry allowed

  // Extract country code and phone number from initial phone if provided
  useEffect(() => {
    if (initialPhoneNumber) {
      // Try to extract country code (assuming +91 format)
      if (initialPhoneNumber.startsWith('+')) {
        // Try to match dial codes from longest to shortest
        let matched = false;
        for (const country of COUNTRY_CODES.sort((a, b) => b.dialCode.length - a.dialCode.length)) {
          if (initialPhoneNumber.startsWith(country.dialCode)) {
            const phone = initialPhoneNumber.substring(country.dialCode.length).replace(/\D/g, '');
            setSelectedCountry(country);
            setPhoneNumber(phone);
            matched = true;
            break;
          }
        }
        if (!matched) {
          // If no match, just extract digits
          setPhoneNumber(initialPhoneNumber.replace(/\D/g, ''));
        }
      } else {
        // Just digits, use default country
        setPhoneNumber(initialPhoneNumber.replace(/\D/g, ''));
      }
    }
  }, [initialPhoneNumber]);

  const {isDarkMode, currentUser, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Modal states
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown timer for retry
  useEffect(() => {
    if (retryAfter !== null && retryAfter > 0) {
      const timer = setTimeout(() => {
        setRetryAfter(retryAfter - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryAfter === 0) {
      setRetryAfter(null);
    }
  }, [retryAfter]);

  const handleSendPhoneCode = async () => {
    if (retryAfter !== null && retryAfter > 0) {
      const minutes = Math.floor(retryAfter / 60);
      const seconds = retryAfter % 60;
      setAlertModal({
        visible: true,
        title: 'Too Many Attempts',
        message: `Please wait ${minutes}:${seconds.toString().padStart(2, '0')} before trying again.`,
        type: 'warning',
      });
      return;
    }

    if (!phoneNumber.trim()) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter your phone number',
        type: 'error',
      });
      return;
    }

    // Validate phone number length (minimum 10 digits for India)
    const numericPhone = phoneNumber.replace(/\D/g, '');
    if (numericPhone.length < 10) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter a valid 10-digit phone number',
        type: 'error',
      });
      return;
    }

    // Combine country code with phone number (E.164 format)
    const fullPhoneNumber = selectedCountry.dialCode + numericPhone;

    setLoading(true);
    try {
      console.log('Attempting to send code to:', fullPhoneNumber);
      const result = await authService.sendPhoneVerificationCode(fullPhoneNumber);
      setConfirmResult(result);
      setStep('code');
      setRetryAfter(null); // Reset retry timer on success
      setAlertModal({
        visible: true,
        title: 'Success',
        message: 'Verification code sent to your phone',
        type: 'success',
      });
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      
      // Handle rate limiting with retry timer
      if (error.message?.includes('Too many attempts') || error.message?.includes('too many verification attempts') || error.code === 'auth/too-many-requests') {
        // Set retry timer to 120 seconds (2 minutes) - shorter wait for better UX
        setRetryAfter(120);
        setAlertModal({
          visible: true,
          title: 'Verification Limit Reached',
          message: 'Too many verification attempts for this number. Please wait 2 minutes before trying again, or use a different phone number.',
          type: 'warning',
        });
      } else {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: error.message || 'Failed to send verification code. Please try again.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!verificationCode.trim()) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: 'Please enter the verification code',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const authUser = auth().currentUser;
      if (!authUser) {
        setAlertModal({
          visible: true,
          title: 'Error',
          message: 'User not authenticated',
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // Combine country code with phone number (E.164 format)
      const numericPhone = phoneNumber.replace(/\D/g, '');
      const fullPhoneNumber = selectedCountry.dialCode + numericPhone;

      if (mode === 'change') {
        // For change mode, verify the code and update provider's phone in Firestore
        await confirmResult.confirm(verificationCode);
        
        // Update provider's phone number in Firestore
        const providerDoc = await firestore()
          .collection('providers')
          .where('email', '==', authUser.email)
          .limit(1)
          .get();

        if (!providerDoc.empty) {
          await firestore()
            .collection('providers')
            .doc(providerDoc.docs[0].id)
            .update({
              phone: fullPhoneNumber,
              phoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }

        // Also update user document if it exists
        const userDoc = await firestore()
          .collection('users')
          .doc(authUser.uid)
          .get();

        if (userDoc.exists) {
          await firestore()
            .collection('users')
            .doc(authUser.uid)
            .update({
              phone: fullPhoneNumber,
              phoneNumber: fullPhoneNumber,
              phoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }

        setSuccessMessage('Phone number updated successfully!');
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          // Navigate back to profile
          navigation.goBack();
        }, 2000);
      } else if (mode === 'secondary') {
        // For secondary phone mode, verify the code and save as secondary phone
        await confirmResult.confirm(verificationCode);
        
        // Update user document with secondary phone
        const userDoc = await firestore()
          .collection('users')
          .doc(authUser.uid)
          .get();

        if (userDoc.exists) {
          await firestore()
            .collection('users')
            .doc(authUser.uid)
            .update({
              secondaryPhone: fullPhoneNumber,
              secondaryPhoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }

        // Also update provider document if it exists
        const providerDoc = await firestore()
          .collection('providers')
          .where('email', '==', authUser.email)
          .limit(1)
          .get();

        if (!providerDoc.empty) {
          await firestore()
            .collection('providers')
            .doc(providerDoc.docs[0].id)
            .update({
              secondaryPhone: fullPhoneNumber,
              secondaryPhoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        }

        // Update current user in store
        const updatedUser = {
          ...currentUser,
          secondaryPhone: fullPhoneNumber,
          secondaryPhoneVerified: true,
        };
        setCurrentUser(updatedUser as any);

        setSuccessMessage('Secondary phone number added and verified successfully!');
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }, 2000);
      } else {
        // Default verify mode - original flow
        const user = await authService.verifyPhoneCode(
          confirmResult,
          verificationCode,
          currentUser?.name || 'User',
          currentUser?.email,
        );

        // Also update provider document if it exists
        const providerDoc = await firestore()
          .collection('providers')
          .doc(authUser.uid)
          .get();

        if (providerDoc.exists) {
          await firestore()
            .collection('providers')
            .doc(authUser.uid)
            .update({
              phone: authUser.phoneNumber || user.phone,
              phoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        } else if (authUser.email) {
          // Try to find by email
          const emailQuery = await firestore()
            .collection('providers')
            .where('email', '==', authUser.email)
            .limit(1)
            .get();
          
          if (!emailQuery.empty) {
            await firestore()
              .collection('providers')
              .doc(emailQuery.docs[0].id)
              .update({
                phone: authUser.phoneNumber || user.phone,
                phoneVerified: true,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
          }
        }

        // Update current user with verified phone
        const updatedUser = {
          ...user,
          phoneVerified: true,
          role: currentUser?.role || user.role,
        };

        setCurrentUser(updatedUser);

        setSuccessMessage('Phone number verified successfully!');
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
                // Navigate to provider dashboard
                navigation.reset({
                  index: 0,
                  routes: [{name: 'ProviderMain'}],
                });
        }, 2000);
      }
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to verify code',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setStep('phone');
    setVerificationCode('');
    setConfirmResult(null);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header with back button - show in change and secondary modes */}
      {(mode === 'change' || mode === 'secondary') && (
        <View style={[styles.header, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              {mode === 'secondary' ? 'Add Secondary Phone' : 'Update Phone Number'}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="phone-portrait" size={64} color={theme.primary} />
        </View>

        <Text style={[styles.title, {color: theme.text}]}>
          {mode === 'change' 
            ? 'Change Your Phone Number' 
            : mode === 'secondary'
            ? 'Add Secondary Phone Number'
            : 'Verify Your Phone Number'}
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {mode === 'change' 
            ? 'Enter your new phone number to update your contact information.'
            : mode === 'secondary'
            ? 'Add a secondary phone number for backup contact. This will be verified via SMS.'
            : 'Phone verification is required to use HomeServices. This helps us ensure account security and enable important features.'}
        </Text>

        {step === 'phone' ? (
          <>
            <View style={styles.phoneInputWrapper}>
              <Text style={[styles.inputLabel, {color: theme.text}]}>Phone Number *</Text>
            <View style={styles.phoneInputContainer}>
              <CountryCodePicker
                selectedCountry={selectedCountry}
                onSelect={setSelectedCountry}
              />
              <View style={[styles.inputContainer, {flex: 1}]}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.card,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    // Remove non-numeric characters
                    const numericText = text.replace(/\D/g, '');
                    setPhoneNumber(numericText);
                  }}
                  placeholder="9876543210"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  autoFocus
                />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    phoneNumber.trim() && !loading && retryAfter === null
                      ? theme.primary
                      : theme.border,
                  opacity: phoneNumber.trim() && !loading && retryAfter === null ? 1 : 0.5,
                },
              ]}
              onPress={handleSendPhoneCode}
              disabled={!phoneNumber.trim() || loading || (retryAfter !== null && retryAfter > 0)}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : retryAfter !== null && retryAfter > 0 ? (
                <Text style={styles.buttonText}>
                  Retry in {Math.floor(retryAfter / 60)}:{(retryAfter % 60).toString().padStart(2, '0')}
                </Text>
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.codeInputWrapper}>
              <Text style={[styles.inputLabel, {color: theme.text}]}>Verification Code *</Text>
            <View style={styles.inputContainer}>
              <Icon
                name="keypad-outline"
                size={20}
                color={theme.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                    styles.inputWithIcon,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor:
                    verificationCode.trim().length === 6 && !loading
                      ? theme.primary
                      : theme.border,
                  opacity:
                    verificationCode.trim().length === 6 && !loading ? 1 : 0.5,
                },
              ]}
              onPress={handleVerifyPhoneCode}
              disabled={verificationCode.trim().length !== 6 || loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={loading}>
              <Text style={[styles.resendText, {color: theme.primary}]}>
                Resend Code
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.infoText, {color: theme.textSecondary}]}>
          By continuing, you agree to receive SMS messages for verification
          purposes.
        </Text>
      </View>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage || ''}
        onClose={() => setShowSuccessModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  phoneInputWrapper: {
    marginBottom: 16,
    width: '100%',
    alignItems: 'stretch',
  },
  codeInputWrapper: {
    marginBottom: 16,
    width: '100%',
    alignItems: 'stretch',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 0,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 12,
    fontSize: 16,
  },
  inputWithIcon: {
    paddingLeft: 44, // Space for icon (12px padding + 20px icon + 12px gap)
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 16,
  },
});

