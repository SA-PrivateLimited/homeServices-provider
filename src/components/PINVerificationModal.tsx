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
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

interface Material {
  description: string;
  quantity?: string;
  unitPrice?: string;
  total?: string;
}

interface PINVerificationModalProps {
  visible: boolean;
  onVerify: (pin: string, amount?: number, materials?: Material[], timeStarted?: Date, timeCompleted?: Date) => Promise<void>;
  onCancel: () => void;
  timeStarted?: Date;
}

const PINVerificationModal: React.FC<PINVerificationModalProps> = ({
  visible,
  onVerify,
  onCancel,
  timeStarted,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [materials, setMaterials] = useState<Material[]>([{description: '', quantity: '', unitPrice: ''}]);
  const [showAmountSection, setShowAmountSection] = useState(false);

  const handleVerify = async () => {
    if (!pin || pin.length !== 4) {
      setError(String(t('jobDetails.pleaseEnter4DigitPIN')));
      return;
    }

    setVerifying(true);
    setError('');
    try {
      const amountValue = amount.trim() ? parseFloat(amount.trim()) : undefined;
      const materialsValue = materials.filter(m => m.description.trim()).length > 0 
        ? materials
          .filter(m => m.description.trim())
          .map(m => ({
            description: m.description.trim(),
            quantity: m.quantity ? parseFloat(m.quantity) : undefined,
            unitPrice: m.unitPrice ? parseFloat(m.unitPrice) : undefined,
            total: m.total ? parseFloat(m.total) : undefined,
          }))
        : undefined;
      const timeCompleted = new Date();
      
      await onVerify(pin, amountValue, materialsValue, timeStarted, timeCompleted);
      setPin('');
      setAmount('');
      setMaterials([{description: '', quantity: '', unitPrice: ''}]);
      setShowAmountSection(false);
    } catch (err: any) {
      setError(err.message || String(t('jobDetails.invalidPIN')));
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setPin('');
    setAmount('');
    setMaterials([{description: '', quantity: '', unitPrice: ''}]);
    setError('');
    setShowAmountSection(false);
    onCancel();
  };

  const addMaterial = () => {
    setMaterials([...materials, {description: '', quantity: '', unitPrice: ''}]);
  };

  const removeMaterial = (index: number) => {
    if (materials.length > 1) {
      setMaterials(materials.filter((_, i) => i !== index));
    }
  };

  const updateMaterial = (index: number, field: keyof Material, value: string) => {
    const updated = [...materials];
    updated[index] = {...updated[index], [field]: value};
    
    // Calculate total if quantity and unitPrice are provided
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(updated[index].quantity || '0');
      const price = parseFloat(updated[index].unitPrice || '0');
      if (qty > 0 && price > 0) {
        updated[index].total = (qty * price).toFixed(2);
      } else {
        updated[index].total = '';
      }
    }
    
    setMaterials(updated);
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
            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
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
                  {String(t('jobDetails.verifyPIN'))}
                </Text>
                <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
                  {String(t('jobDetails.enter4DigitPIN'))}
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

              {/* Amount Section Toggle */}
              <TouchableOpacity
                style={styles.toggleSection}
                onPress={() => setShowAmountSection(!showAmountSection)}>
                <Text style={[styles.toggleText, {color: theme.text}]}>
                  {String(t('jobDetails.addServiceDetails'))} {showAmountSection ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {/* Amount and Materials Section */}
              {showAmountSection && (
                <View style={styles.amountSection}>
                  {/* Service Amount */}
                  <View style={styles.amountInputContainer}>
                    <Text style={[styles.label, {color: theme.text}]}>
                      {String(t('jobDetails.serviceAmount'))} ({String(t('jobDetails.optional'))})
                    </Text>
                    <TextInput
                      style={[
                        styles.amountInput,
                        {
                          backgroundColor: theme.background,
                          color: theme.text,
                          borderColor: theme.border,
                        },
                      ]}
                      value={amount}
                      onChangeText={(text) => {
                        const numericValue = text.replace(/[^0-9.]/g, '');
                        setAmount(numericValue);
                      }}
                      placeholder="0.00"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="decimal-pad"
                    />
                  </View>

                  {/* Materials Used */}
                  <View style={styles.materialsSection}>
                    <View style={styles.materialsHeader}>
                      <Text style={[styles.label, {color: theme.text}]}>
                        {String(t('jobDetails.materialsUsed'))} ({String(t('jobDetails.optional'))})
                      </Text>
                      <TouchableOpacity
                        style={[styles.addButton, {backgroundColor: theme.primary}]}
                        onPress={addMaterial}>
                        <Icon name="add" size={20} color="#fff" />
                        <Text style={styles.addButtonText}>{String(t('common.add'))}</Text>
                      </TouchableOpacity>
                    </View>

                    {materials.map((material, index) => (
                      <View key={index} style={[styles.materialRow, {backgroundColor: theme.background}]}>
                        {materials.length > 1 && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeMaterial(index)}>
                            <Icon name="close" size={18} color="#FF3B30" />
                          </TouchableOpacity>
                        )}
                        <View style={styles.materialInputs}>
                          <TextInput
                            style={[
                              styles.materialInput,
                              {
                                backgroundColor: theme.card,
                                color: theme.text,
                                borderColor: theme.border,
                              },
                            ]}
                            value={material.description}
                            onChangeText={(text) => updateMaterial(index, 'description', text)}
                            placeholder={String(t('jobDetails.materialDescription'))}
                            placeholderTextColor={theme.textSecondary}
                          />
                          <View style={styles.materialQuantityPrice}>
                            <TextInput
                              style={[
                                styles.materialQuantityInput,
                                {
                                  backgroundColor: theme.card,
                                  color: theme.text,
                                  borderColor: theme.border,
                                },
                              ]}
                              value={material.quantity}
                              onChangeText={(text) => updateMaterial(index, 'quantity', text.replace(/[^0-9.]/g, ''))}
                              placeholder={String(t('jobDetails.quantity'))}
                              placeholderTextColor={theme.textSecondary}
                              keyboardType="decimal-pad"
                            />
                            <TextInput
                              style={[
                                styles.materialPriceInput,
                                {
                                  backgroundColor: theme.card,
                                  color: theme.text,
                                  borderColor: theme.border,
                                },
                              ]}
                              value={material.unitPrice}
                              onChangeText={(text) => updateMaterial(index, 'unitPrice', text.replace(/[^0-9.]/g, ''))}
                              placeholder={String(t('jobDetails.unitPrice'))}
                              placeholderTextColor={theme.textSecondary}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          {material.total && (
                            <Text style={[styles.materialTotal, {color: theme.primary}]}>
                              {String(t('common.total'))}: ₹{material.total}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

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
                  {String(t('common.cancel'))}
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
                  <Text style={styles.verifyButtonText}>{String(t('jobDetails.verifying'))}</Text>
                ) : (
                  <Text style={styles.verifyButtonText}>{String(t('jobDetails.verifyAndComplete'))}</Text>
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
    maxHeight: '90%',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scrollView: {
    maxHeight: 500,
  },
  toggleSection: {
    paddingVertical: 12,
    marginBottom: 12,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountSection: {
    marginBottom: 20,
  },
  amountInputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  materialsSection: {
    marginTop: 16,
  },
  materialsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  materialRow: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  removeButton: {
    padding: 4,
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  materialInputs: {
    flex: 1,
  },
  materialInput: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  materialQuantityPrice: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  materialQuantityInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  materialPriceInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  materialTotal: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
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

