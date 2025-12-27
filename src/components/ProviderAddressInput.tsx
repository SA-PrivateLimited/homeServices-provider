import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GeolocationService from '../services/geolocationService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface ProviderAddress {
  type: 'home' | 'office';
  address: string;
  city?: string;
  state?: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

interface ProviderAddressInputProps {
  value?: ProviderAddress | null;
  onChange: (address: ProviderAddress | null) => void;
}

const ProviderAddressInput: React.FC<ProviderAddressInputProps> = ({
  value,
  onChange,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  const [addressType, setAddressType] = useState<'home' | 'office'>('home');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  useEffect(() => {
    if (value) {
      setAddressType(value.type);
      setPincode(value.pincode || '');
      setAddress(value.address || '');
      setCity(value.city || '');
      setState(value.state || '');
    }
  }, [value]);

  // Fetch address when pincode changes
  useEffect(() => {
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      fetchAddressFromPincode();
    }
  }, [pincode]);

  const fetchAddressFromPincode = async () => {
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      return;
    }

    setIsFetchingAddress(true);
    try {
      const geocodeData = await GeolocationService.geocodePincode(pincode);
      if (geocodeData.address) {
        setAddress(geocodeData.address);
        setCity(geocodeData.city || '');
        setState(geocodeData.state || '');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setIsFetchingAddress(false);
    }
  };

  const detectLocation = async () => {
    setIsDetecting(true);
    try {
      const hasPermission = await GeolocationService.requestLocationPermission();
      if (hasPermission !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required to detect your address automatically.',
        );
        setIsDetecting(false);
        return;
      }

      const location = await GeolocationService.getCurrentLocation();
      if (location.pincode) {
        setPincode(location.pincode);
        if (location.address) {
          setAddress(location.address);
          setCity(location.city || '');
          setState(location.state || '');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to detect location');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = () => {
    if (!pincode.trim() || pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return;
    }

    const addressData: ProviderAddress = {
      type: addressType,
      address: address.trim(),
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      pincode: pincode.trim(),
    };

    onChange(addressData);
    setShowModal(false);
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Address',
      'Are you sure you want to remove this address?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onChange(null);
            setPincode('');
            setAddress('');
            setCity('');
            setState('');
          },
        },
      ],
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.addressButton, {backgroundColor: theme.card, borderColor: theme.border}]}
        onPress={() => setShowModal(true)}>
        {value ? (
          <View style={styles.addressDisplay}>
            <View style={styles.addressHeader}>
              <Icon
                name={value.type === 'home' ? 'home' : 'business'}
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.addressType, {color: theme.text}]}>
                {value.type === 'home' ? 'Home Address' : 'Office Address'}
              </Text>
            </View>
            <Text style={[styles.addressText, {color: theme.textSecondary}]}>
              {value.address}
            </Text>
            <Text style={[styles.pincodeText, {color: theme.textSecondary}]}>
              {value.pincode}
              {value.city && `, ${value.city}`}
              {value.state && `, ${value.state}`}
            </Text>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Icon name="add-location" size={24} color={theme.primary} />
            <Text style={[styles.placeholderText, {color: theme.textSecondary}]}>
              Add {addressType === 'home' ? 'Home' : 'Office'} Address
            </Text>
          </View>
        )}
        <Icon name="chevron-right" size={24} color={theme.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.background}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {value ? 'Edit Address' : 'Add Address'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.label, {color: theme.text}]}>Address Type *</Text>
              <View style={styles.addressTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    addressType === 'home' && styles.typeButtonSelected,
                    {borderColor: addressType === 'home' ? theme.primary : theme.border},
                  ]}
                  onPress={() => setAddressType('home')}>
                  <Icon
                    name="home"
                    size={24}
                    color={addressType === 'home' ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      {color: addressType === 'home' ? theme.primary : theme.textSecondary},
                    ]}>
                    Home
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    addressType === 'office' && styles.typeButtonSelected,
                    {borderColor: addressType === 'office' ? theme.primary : theme.border},
                  ]}
                  onPress={() => setAddressType('office')}>
                  <Icon
                    name="business"
                    size={24}
                    color={addressType === 'office' ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      {color: addressType === 'office' ? theme.primary : theme.textSecondary},
                    ]}>
                    Office
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, {color: theme.text}]}>Pincode *</Text>
              <View style={styles.pincodeContainer}>
                <TextInput
                  style={[styles.pincodeInput, {backgroundColor: theme.card, color: theme.text}]}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Enter 6-digit pincode"
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.detectButton, {backgroundColor: theme.primary}]}
                  onPress={detectLocation}
                  disabled={isDetecting}>
                  {isDetecting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Icon name="my-location" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>

              {isFetchingAddress && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
                    Fetching address...
                  </Text>
                </View>
              )}

              <Text style={[styles.label, {color: theme.text}]}>Address *</Text>
              <TextInput
                style={[styles.addressInput, {backgroundColor: theme.card, color: theme.text}]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street address, area, landmark"
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, {color: theme.text}]}>City</Text>
              <TextInput
                style={[styles.input, {backgroundColor: theme.card, color: theme.text}]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                editable={!isFetchingAddress}
              />

              <Text style={[styles.label, {color: theme.text}]}>State</Text>
              <TextInput
                style={[styles.input, {backgroundColor: theme.card, color: theme.text}]}
                value={state}
                onChangeText={setState}
                placeholder="State"
                editable={!isFetchingAddress}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              {value && (
                <TouchableOpacity
                  style={[styles.removeButton, {backgroundColor: '#FF3B30'}]}
                  onPress={handleRemove}>
                  <Icon name="delete" size={20} color="#fff" />
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.saveButton, {backgroundColor: theme.primary}]}
                onPress={handleSave}
                disabled={isLoading}>
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Address</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  addressDisplay: {
    flex: 1,
    marginRight: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressType: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    marginBottom: 4,
  },
  pincodeText: {
    fontSize: 12,
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    gap: 8,
  },
  typeButtonSelected: {
    backgroundColor: '#f0f7ff',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  pincodeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  pincodeInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  detectButton: {
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  addressInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
    flex: 1,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    flex: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProviderAddressInput;

