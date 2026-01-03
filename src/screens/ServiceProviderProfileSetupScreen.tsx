import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';
import {useStore} from '../store';
import ProviderAddressInput from '../components/ProviderAddressInput';

// Service Provider Types (replacing doctor specialties)
const SERVICE_TYPES = [
  'Carpenter',
  'Electrician',
  'Plumber',
  'Painter',
  'Mason',
  'Welder',
  'AC Repair',
  'Appliance Repair',
  'Cleaning Service',
  'Gardener',
  'Roofer',
  'Flooring',
  'Tiles & Marble',
  'Interior Designer',
  'Other',
];

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];

export default function ServiceProviderProfileSetupScreen({navigation}: any) {
  const {currentUser} = useStore();
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false);
  
  // Document upload states
  const [idProof, setIdProof] = useState<string | null>(null);
  const [addressProof, setAddressProof] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
  // Provider address state
  const [providerAddress, setProviderAddress] = useState<{
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        navigation.goBack();
        return;
      }

      // Check in 'providers' collection - try UID first (phone auth)
      let providerDoc = await firestore()
        .collection('providers')
        .doc(user.uid)
        .get();
      
      // If not found by UID, try email (Google auth)
      if (!providerDoc.exists && user.email) {
        const emailQuery = await firestore()
          .collection('providers')
          .where('email', '==', user.email)
          .limit(1)
          .get();
        if (!emailQuery.empty) {
          providerDoc = emailQuery.docs[0];
        }
      }

      if (providerDoc.exists) {
        const profile: any = {id: providerDoc.id, ...providerDoc.data()};
        setExistingProfile(profile);
        setName(profile.name || '');
        
        // Load service type (specialization)
        let savedServiceType = (profile.specialization || profile.specialty || '').trim();
        
        if (savedServiceType) {
          const normalized = SERVICE_TYPES.find(type => 
            type.toLowerCase() === savedServiceType.toLowerCase() ||
            type === savedServiceType
          );
          if (normalized) {
            savedServiceType = normalized;
          }
        }
        
        setServiceType(savedServiceType);
        setEmail(profile.email || user.email || '');
        setPhone(profile.phone || user.phoneNumber || '');
        setExperience(profile.experience?.toString() || '');
        setLanguages(profile.languages || []);
        const existingImage = profile.profileImage || profile.photo;
        
        // Load existing documents
        if (profile.documents) {
          setIdProof(profile.documents.idProof || null);
          setAddressProof(profile.documents.addressProof || null);
          setCertificate(profile.documents.certificate || null);
        }
        
        // Load existing provider address
        if (profile.address) {
          setProviderAddress(profile.address);
        }
        if (existingImage && typeof existingImage === 'string' && existingImage.trim() !== '' && 
            (existingImage.startsWith('http://') || existingImage.startsWith('https://') || 
             existingImage.startsWith('file://') || existingImage.startsWith('content://'))) {
          setProfileImage(existingImage.trim());
        } else {
          setProfileImage(null);
        }
        setImageError(false);
      } else {
        // Set default values from current user
        setName(user.displayName || '');
        setEmail(user.email || '');
        setPhone(user.phoneNumber || '');
      }
    } catch (error) {
    } finally {
      setChecking(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets[0].uri) {
        setProfileImage(response.assets[0].uri);
        setImageError(false);
      }
    });
  };

  const handleImageError = () => {
    setImageError(true);
    setProfileImage(null);
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const filename = `provider_profiles/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const uploadDocument = async (uri: string, docType: string): Promise<string> => {
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `provider_documents/${docType}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const pickDocument = (docType: 'idProof' | 'addressProof' | 'certificate') => {
    // Check if document is verified - prevent upload if verified (unless profile is rejected)
    const isVerified = existingProfile?.documents?.[`${docType}Verified` as keyof typeof existingProfile.documents] as boolean;
    const isRejected = existingProfile?.approvalStatus === 'rejected';
    
    // If document is verified by admin, cannot update/delete (unless profile is rejected)
    if (isVerified && !isRejected) {
      Alert.alert(
        'Cannot Upload Document',
        `This document has been verified by admin. You cannot replace verified documents. Please contact admin if you need to update this document.`,
        [{text: 'OK'}],
      );
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      async response => {
        if (response.assets && response.assets[0].uri) {
          const uri = response.assets[0].uri;
          setUploadingDoc(docType);
          try {
            const downloadURL = await uploadDocument(uri, docType);
            if (docType === 'idProof') {
              setIdProof(downloadURL);
            } else if (docType === 'addressProof') {
              setAddressProof(downloadURL);
            } else if (docType === 'certificate') {
              setCertificate(downloadURL);
            }
            Alert.alert('Success', 'Document uploaded successfully');
          } catch (error: any) {
            console.error('Document upload error:', error.code, error.message);
            let errorMessage = 'Failed to upload document. Please try again.';
            
            if (error.code === 'storage/unauthorized') {
              errorMessage = 'Permission denied. Please ensure you are logged in and try again.';
            } else if (error.code === 'storage/canceled') {
              errorMessage = 'Upload canceled. Please try again.';
            } else if (error.code === 'storage/unknown') {
              errorMessage = 'Unknown error occurred. Please check your internet connection and try again.';
            } else if (error.code === 'storage/invalid-format') {
              errorMessage = 'Invalid file format. Please upload an image (JPG, PNG) or PDF.';
            } else if (error.code === 'storage/file-not-found') {
              errorMessage = 'File not found. Please select the document again.';
            } else if (error.code === 'storage/quota-exceeded') {
              errorMessage = 'Storage quota exceeded. Please contact support.';
            } else if (error.message) {
              errorMessage = `Upload failed: ${error.message}`;
            }
            
            Alert.alert('Error', errorMessage);
          } finally {
            setUploadingDoc(null);
          }
        }
      },
    );
  };

  const removeDocument = (docType: 'idProof' | 'addressProof' | 'certificate') => {
    // Check if document is verified - prevent deletion if verified (unless profile is rejected)
    const isVerified = existingProfile?.documents?.[`${docType}Verified` as keyof typeof existingProfile.documents] as boolean;
    const isRejected = existingProfile?.approvalStatus === 'rejected';
    
    // If document is verified by admin, cannot update/delete (unless profile is rejected)
    if (isVerified && !isRejected) {
      Alert.alert(
        'Cannot Remove Document',
        'This document has been verified by admin. You cannot remove verified documents. Please contact admin if you need to update this document.',
        [{text: 'OK'}],
      );
      return;
    }

    // Check if provider is approved - prevent deletion if approved
    if (existingProfile?.approvalStatus === 'approved') {
      Alert.alert(
        'Cannot Remove Document',
        'You cannot remove documents once your profile has been approved. Please contact admin if you need to update your documents.',
        [{text: 'OK'}],
      );
      return;
    }

    Alert.alert(
      'Remove Document',
      'Are you sure you want to remove this document?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (docType === 'idProof') {
              setIdProof(null);
            } else if (docType === 'addressProof') {
              setAddressProof(null);
            } else if (docType === 'certificate') {
              setCertificate(null);
            }
          },
        },
      ],
    );
  };

  const generateAvailabilitySlots = async (
    providerId: string,
    days: string[],
    start: string,
    end: string,
    duration: number,
  ) => {
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30); // Generate for next 30 days

      const dayMap: {[key: string]: number} = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 0,
      };

      const selectedDayNumbers = days.map(day => dayMap[day]);

      for (let date = new Date(today); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        if (selectedDayNumbers.includes(dayOfWeek)) {
          const [startH, startM] = start.split(':').map(Number);
          const [endH, endM] = end.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;

          for (let slotStart = startMinutes; slotStart + duration <= endMinutes; slotStart += duration) {
            const slotDate = new Date(date);
            slotDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);

            const slotId = `${providerId}_${slotDate.toISOString()}`;
            await firestore()
              .collection('availability')
              .doc(slotId)
              .set({
                providerId,
                date: firestore.Timestamp.fromDate(slotDate),
                startTime: firestore.Timestamp.fromDate(slotDate),
                endTime: firestore.Timestamp.fromDate(
                  new Date(slotDate.getTime() + duration * 60000),
                ),
                available: true,
                booked: false,
              });
          }
        }
      }
    } catch (error) {
      // Don't throw - availability generation failure shouldn't block profile save
    }
  };

  const handleSubmit = async () => {
    // Validate name
    if (!name || name.trim().length === 0) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters long');
      return;
    }

    // Validate service type
    if (!serviceType || serviceType.trim().length === 0) {
      Alert.alert('Error', 'Please select a service type');
      return;
    }

    // Validate email
    if (!email || email.trim().length === 0) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Validate phone
    if (!phone || phone.trim().length === 0) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    // Remove spaces, dashes, and plus signs for validation
    const phoneDigits = phone.replace(/[\s\-+]/g, '');
    if (phoneDigits.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits)');
      return;
    }

    // Validate experience
    if (!experience || experience.trim().length === 0) {
      Alert.alert('Error', 'Please enter your years of experience');
      return;
    }
    const experienceNum = parseInt(experience.trim(), 10);
    if (isNaN(experienceNum) || experienceNum < 0) {
      Alert.alert('Error', 'Please enter a valid number of years of experience');
      return;
    }
    if (experienceNum > 100) {
      Alert.alert('Error', 'Please enter a realistic number of years of experience');
      return;
    }

    // Validate languages
    if (languages.length === 0) {
      Alert.alert('Error', 'Please select at least one language');
      return;
    }

    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      let imageUrl = existingProfile?.profileImage || existingProfile?.photo || '';
      
      // Upload image if it's a local file
      if (profileImage && (profileImage.startsWith('file://') || profileImage.startsWith('content://'))) {
        try {
          imageUrl = await uploadImage(profileImage);
        } catch (uploadError: any) {
          if (uploadError.code === 'storage/file-not-found') {
            Alert.alert(
              'Image Upload Failed',
              'The selected image file could not be found. Please select the image again.',
            );
            setLoading(false);
            return;
          }
          Alert.alert('Warning', 'Failed to upload image. Profile will be saved without updating the image.');
        }
      } else if (profileImage && (profileImage.startsWith('http://') || profileImage.startsWith('https://'))) {
        imageUrl = profileImage;
      }

      // Use user UID as document ID for consistency
      const providerId = user.uid;

      const providerData: any = {
        name,
        specialization: serviceType,
        specialty: serviceType, // Legacy field
        email,
        phone,
        experience: parseInt(experience, 10),
        languages,
        profileImage: imageUrl,
        address: providerAddress,
        documents: {
          idProof: idProof || null,
          addressProof: addressProof || null,
          certificate: certificate || null,
        },
        rating: existingProfile?.rating || 0,
        totalConsultations: existingProfile?.totalConsultations || 0,
        verified: false,
        approvalStatus: existingProfile?.approvalStatus || 'pending',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Add createdAt only for new profiles
      if (!existingProfile) {
        providerData.createdAt = firestore.FieldValue.serverTimestamp();
      }

      // Use set with merge to handle both create and update
      await firestore().collection('providers').doc(providerId).set(providerData, {merge: true});

      setLoading(false);
      Alert.alert(
        'Success',
        existingProfile
          ? 'Profile updated successfully!'
          : 'Profile created successfully! Your profile will be reviewed by an administrator.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Service Provider Profile</Text>
        <Text style={styles.subtitle}>
          {existingProfile ? 'Update your profile' : 'Complete your profile to start receiving service requests'}
        </Text>

        {/* Profile Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.8}>
          {profileImage && profileImage.trim() !== '' && !imageError ? (
            <View style={styles.imageContainer}>
              <Image
                source={{uri: profileImage}}
                style={styles.photo}
                onError={handleImageError}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Icon name="edit" size={20} color="#fff" />
                <Text style={styles.editText}>Change Photo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              {name && name.trim() !== '' ? (
                <>
                  <Text style={styles.initialsText}>
                    {name.trim().charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.plusIconContainer}>
                    <Icon name="add" size={20} color="#fff" />
                  </View>
                </>
              ) : (
                <>
                  <Icon name="person" size={48} color="#007AFF" />
                  <View style={styles.plusIconContainer}>
                    <Icon name="add" size={20} color="#fff" />
                  </View>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="John Doe"
        />

        <Text style={styles.label}>Service Type *</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowServiceTypeDropdown(true)}>
          <Text style={[styles.dropdownButtonText, !serviceType && styles.dropdownPlaceholder]}>
            {serviceType || 'Select Service Type'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color="#666" />
        </TouchableOpacity>

        <Modal
          visible={showServiceTypeDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowServiceTypeDropdown(false)}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowServiceTypeDropdown(false)}>
            <View style={styles.dropdownModal}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Select Service Type</Text>
                <TouchableOpacity onPress={() => setShowServiceTypeDropdown(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={SERVICE_TYPES}
                keyExtractor={item => item}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      serviceType === item && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setServiceType(item);
                      setShowServiceTypeDropdown(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownItemText,
                        serviceType === item && styles.dropdownItemTextSelected,
                      ]}>
                      {item}
                    </Text>
                    {serviceType === item && (
                      <Icon name="check" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="provider@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Experience (years) *</Text>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          placeholder="5"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Your Address *</Text>
        <Text style={styles.subLabel}>
          Add your home or office address to accept service requests
        </Text>
        <ProviderAddressInput
          value={providerAddress}
          onChange={setProviderAddress}
        />

        <Text style={styles.label}>Languages *</Text>
        <View style={styles.languagesContainer}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageChip,
                languages.includes(lang) && styles.languageChipSelected,
              ]}
              onPress={() => toggleLanguage(lang)}>
              <Text
                style={[
                  styles.languageText,
                  languages.includes(lang) && styles.languageTextSelected,
                ]}>
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Verification Documents</Text>
        <Text style={styles.subLabel}>
          Upload documents to verify your identity and credentials
        </Text>

        {/* ID Proof */}
        <View style={styles.documentSection}>
          <View style={styles.documentLabelRow}>
            <Text style={styles.documentLabel}>ID Proof (Aadhaar/PAN/Driving License) *</Text>
            {existingProfile?.documents?.idProofVerified && (
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={16} color="#4CAF50" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
          {idProof ? (
            <View style={styles.documentPreview}>
              <Image source={{uri: idProof}} style={styles.documentImage} />
              {existingProfile?.approvalStatus !== 'approved' && !existingProfile?.documents?.idProofVerified && (
                <>
                  <TouchableOpacity
                    style={styles.removeDocumentButton}
                    onPress={() => removeDocument('idProof')}>
                    <Icon name="delete" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                  {existingProfile?.approvalStatus === 'rejected' && (
                    <TouchableOpacity
                      style={styles.replaceDocumentButton}
                      onPress={() => pickDocument('idProof')}
                      disabled={uploadingDoc === 'idProof'}>
                      {uploadingDoc === 'idProof' ? (
                        <ActivityIndicator color="#007AFF" size="small" />
                      ) : (
                        <Icon name="cloud-upload" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadButton, uploadingDoc === 'idProof' && styles.uploadButtonDisabled]}
              onPress={() => pickDocument('idProof')}
              disabled={uploadingDoc === 'idProof' || (existingProfile?.documents?.idProofVerified && existingProfile?.approvalStatus !== 'rejected')}>
              {uploadingDoc === 'idProof' ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <>
                  <Icon name="cloud-upload" size={24} color="#007AFF" />
                  <Text style={styles.uploadButtonText}>
                    {existingProfile?.documents?.idProofVerified && existingProfile?.approvalStatus !== 'rejected' 
                      ? 'Document Verified' 
                      : 'Upload ID Proof'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Address Proof */}
        <View style={styles.documentSection}>
          <View style={styles.documentLabelRow}>
            <Text style={styles.documentLabel}>Address Proof (Utility Bill/Rental Agreement) *</Text>
            {existingProfile?.documents?.addressProofVerified && (
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={16} color="#4CAF50" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
          {addressProof ? (
            <View style={styles.documentPreview}>
              <Image source={{uri: addressProof}} style={styles.documentImage} />
              {existingProfile?.approvalStatus !== 'approved' && !existingProfile?.documents?.addressProofVerified && (
                <>
                  <TouchableOpacity
                    style={styles.removeDocumentButton}
                    onPress={() => removeDocument('addressProof')}>
                    <Icon name="delete" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                  {existingProfile?.approvalStatus === 'rejected' && (
                    <TouchableOpacity
                      style={styles.replaceDocumentButton}
                      onPress={() => pickDocument('addressProof')}
                      disabled={uploadingDoc === 'addressProof'}>
                      {uploadingDoc === 'addressProof' ? (
                        <ActivityIndicator color="#007AFF" size="small" />
                      ) : (
                        <Icon name="cloud-upload" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadButton, uploadingDoc === 'addressProof' && styles.uploadButtonDisabled]}
              onPress={() => pickDocument('addressProof')}
              disabled={uploadingDoc === 'addressProof' || (existingProfile?.documents?.addressProofVerified && existingProfile?.approvalStatus !== 'rejected')}>
              {uploadingDoc === 'addressProof' ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <>
                  <Icon name="cloud-upload" size={24} color="#007AFF" />
                  <Text style={styles.uploadButtonText}>
                    {existingProfile?.documents?.addressProofVerified && existingProfile?.approvalStatus !== 'rejected' 
                      ? 'Document Verified' 
                      : 'Upload Address Proof'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Certificate (Optional) */}
        <View style={styles.documentSection}>
          <View style={styles.documentLabelRow}>
            <Text style={styles.documentLabel}>Professional Certificate (Optional)</Text>
            {existingProfile?.documents?.certificateVerified && (
              <View style={styles.verifiedBadge}>
                <Icon name="verified" size={16} color="#4CAF50" />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.optionalText}>Upload any relevant certificates or licenses</Text>
          {certificate ? (
            <View style={styles.documentPreview}>
              <Image source={{uri: certificate}} style={styles.documentImage} />
              {existingProfile?.approvalStatus !== 'approved' && !existingProfile?.documents?.certificateVerified && (
                <>
                  <TouchableOpacity
                    style={styles.removeDocumentButton}
                    onPress={() => removeDocument('certificate')}>
                    <Icon name="delete" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                  {existingProfile?.approvalStatus === 'rejected' && (
                    <TouchableOpacity
                      style={styles.replaceDocumentButton}
                      onPress={() => pickDocument('certificate')}
                      disabled={uploadingDoc === 'certificate'}>
                      {uploadingDoc === 'certificate' ? (
                        <ActivityIndicator color="#007AFF" size="small" />
                      ) : (
                        <Icon name="cloud-upload" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.uploadButton, uploadingDoc === 'certificate' && styles.uploadButtonDisabled]}
              onPress={() => pickDocument('certificate')}
              disabled={uploadingDoc === 'certificate' || (existingProfile?.documents?.certificateVerified && existingProfile?.approvalStatus !== 'rejected')}>
              {uploadingDoc === 'certificate' ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <>
                  <Icon name="cloud-upload" size={24} color="#007AFF" />
                  <Text style={styles.uploadButtonText}>
                    {existingProfile?.documents?.certificateVerified && existingProfile?.approvalStatus !== 'rejected' 
                      ? 'Document Verified' 
                      : 'Upload Certificate'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingProfile ? 'Update Profile' : 'Create Profile'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageContainer: {
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    alignItems: 'center',
  },
  editText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  initialsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  languageChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  languageChipSelected: {
    backgroundColor: '#007AFF',
  },
  languageText: {
    fontSize: 14,
    color: '#333',
  },
  languageTextSelected: {
    color: '#fff',
  },
  subLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    marginTop: -8,
  },
  documentSection: {
    marginBottom: 20,
    marginTop: 8,
  },
  documentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  optionalText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    backgroundColor: '#f8f9ff',
    gap: 8,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  documentPreview: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  documentImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    backgroundColor: '#f5f5f5',
  },
  removeDocumentButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  replaceDocumentButton: {
    position: 'absolute',
    top: 8,
    right: 48,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

