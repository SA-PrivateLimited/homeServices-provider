import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface PINVerificationModalProps {
  visible: boolean;
  onVerify: (pin: string) => Promise<void>;
  onCancel: () => void;
}

const PINVerificationModal: React.FC<PINVerificationModalProps> = ({
  visible,
  onVerify,
  onCancel,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!pin || pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    setVerifying(true);
    setError('');
    try {
      await onVerify(pin);
      setPin('');
    } catch (err: any) {
      setError(err.message || 'Invalid PIN. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.card,
                shadowColor: isDarkMode ? '#000' : '#000',
              },
            ]}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: theme.primary + '15'},
                ]}>
                <Icon name="lock-closed" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.headerTitle, {color: theme.text}]}>
                Verify PIN
              </Text>
              <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
                Enter the 4-digit PIN sent to the customer
              </Text>
            </View>

            {/* PIN Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: error ? '#FF3B30' : theme.border,
                  },
                ]}
                value={pin}
                onChangeText={(text) => {
                  setPin(text.replace(/[^0-9]/g, '').slice(0, 4));
                  setError('');
                }}
                placeholder="0000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus={true}
                secureTextEntry={false}
              />
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                onPress={handleClose}
                disabled={verifying}>
                <Text
                  style={[
                    styles.cancelButtonText,
                    {color: theme.text},
                  ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: verifying ? 0.6 : 1,
                  },
                ]}
                onPress={handleVerify}
                disabled={verifying || pin.length !== 4}>
                {verifying ? (
                  <Text style={styles.verifyButtonText}>Verifying...</Text>
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const {width} = Dimensions.get('window');
const modalWidth = width * 0.85;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: modalWidth,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  pinInput: {
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  verifyButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PINVerificationModal;

