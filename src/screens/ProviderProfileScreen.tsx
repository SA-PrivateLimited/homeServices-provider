import React, {useState, useEffect} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import ProviderHelpSupportModal from '../components/ProviderHelpSupportModal';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import ProviderAddressInput from '../components/ProviderAddressInput';
import ReviewsList from '../components/ReviewsList';

interface ProviderProfile {
  name: string;
  specialization?: string; // New field name
  specialty?: string; // Legacy field name (for backward compatibility)
  email: string;
  phone: string;
  experience: number;
  qualification?: string; // Legacy field (string)
  qualifications?: string[]; // New field (array)
  consultationFee: number;
  rating: number;
  profileImage?: string; // New field name
  photo?: string; // Legacy field name
  availableDays: string[];
  languages?: string[]; // Languages spoken by provider
  startTime?: string; // Working hours start time (e.g., "09:00")
  endTime?: string; // Working hours end time (e.g., "18:00")
  slotDuration?: number; // Consultation slot duration in minutes
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export default function ProviderProfileScreen({navigation}: any) {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [providerAddress, setProviderAddress] = useState<any>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const currentUser = auth().currentUser;
  const {currentUser: storeUser, isDarkMode, toggleTheme} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribeUid: (() => void) | null = null;
    let unsubscribeEmail: (() => void) | null = null;
    let profileFound = false;

    const loadProfile = (providerData: ProviderProfile) => {
      // Always update profile to ensure fresh data after edits
      // The onSnapshot will fire when data changes, so we should always update
      setProfile(providerData);
      // Load provider address
      if ((providerData as any).address) {
        setProviderAddress((providerData as any).address);
      }
      // Reset image error when profile updates
      setImageError(false);
      setLoading(false);
      profileFound = true;
    };

    // Check by UID first (phone auth or if saved with UID as doc ID)
    unsubscribeUid = firestore()
      .collection('providers')
      .doc(currentUser.uid)
      .onSnapshot(
        docSnapshot => {
          if (docSnapshot.exists) {
            const providerData = docSnapshot.data() as ProviderProfile;
            loadProfile(providerData);
            // Unsubscribe from email listener if UID found
            if (unsubscribeEmail) {
              unsubscribeEmail();
              unsubscribeEmail = null;
            }
          } else {
            // If not found by UID, check by email (Google auth)
            if (currentUser.email && !unsubscribeEmail) {
              unsubscribeEmail = firestore()
                .collection('providers')
                .where('email', '==', currentUser.email)
                .limit(1)
                .onSnapshot(
                  emailSnapshot => {
                    if (!emailSnapshot.empty && !profileFound) {
                      const providerData = emailSnapshot.docs[0].data() as ProviderProfile;
                      loadProfile(providerData);
                    } else if (emailSnapshot.empty && !profileFound) {
                      setLoading(false);
                    }
                  },
                  error => {
                    if (!profileFound) {
                      setLoading(false);
                    }
                  },
                );
            } else if (!currentUser.email && !profileFound) {
              // No email, no profile found
              setLoading(false);
            }
          }
        },
        error => {
          // If UID check fails, try email as fallback
          if (currentUser.email && !unsubscribeEmail) {
            unsubscribeEmail = firestore()
              .collection('providers')
              .where('email', '==', currentUser.email)
              .limit(1)
              .onSnapshot(
                emailSnapshot => {
                  if (!emailSnapshot.empty && !profileFound) {
                    const providerData = emailSnapshot.docs[0].data() as ProviderProfile;
                    loadProfile(providerData);
                  } else if (!profileFound) {
                    setLoading(false);
                  }
                },
                emailError => {
                  if (!profileFound) {
                    setLoading(false);
                  }
                },
              );
          } else if (!profileFound) {
            setLoading(false);
          }
        },
      );

    return () => {
      if (unsubscribeUid) unsubscribeUid();
      if (unsubscribeEmail) unsubscribeEmail();
    };
  }, [currentUser]);

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await auth().signOut();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
      // Even if logout fails, navigate to login
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <>
        <ProviderHelpSupportModal
          visible={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      <ScrollView style={[styles.container, {backgroundColor: theme.background}]}>
        {/* Profile Setup Header */}
        <View style={[styles.header, {backgroundColor: theme.card}]}>
          <View style={[styles.profileImagePlaceholder, {backgroundColor: theme.primary + '20', borderColor: theme.primary}]}>
            <Icon name="build" size={64} color={theme.primary} />
          </View>
          <Text style={[styles.name, {color: theme.text}]}>Service Provider Profile</Text>
          <Text style={[styles.specialty, {color: theme.textSecondary}]}>
            Profile Not Set Up
          </Text>
          <Text style={[styles.errorText, {color: theme.textSecondary, fontSize: 14, marginTop: 10, textAlign: 'center', paddingHorizontal: 20}]}>
            You need to set up your service provider profile before you can receive service requests. Your profile will be reviewed by an administrator.
          </Text>
        </View>

        {/* Setup Button Section */}
        <View style={[styles.section, styles.professionalSection, {backgroundColor: theme.card}]}>
          <TouchableOpacity
            style={[styles.setupButton, {backgroundColor: theme.primary}]}
            onPress={() => navigation.navigate('ProviderProfileSetup')}>
            <Icon name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.setupButtonText}>Set Up Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            APPEARANCE
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, {backgroundColor: theme.card}]}
            disabled>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={22} color={theme.primary} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>
                  Dark Mode
                </Text>
                <Text style={[styles.settingSubtitle, {color: theme.textSecondary}]}>
                  {isDarkMode ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{false: theme.border, true: theme.primary}}
              thumbColor="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            ACCOUNT
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, {backgroundColor: theme.card}]}
            onPress={() => setShowHelpModal(true)}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color={theme.text} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>
                  Help & Support
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, {backgroundColor: theme.card}]}
            onPress={() =>
              Alert.alert(
                'HomeServices Provider',
                'Version 1.0.0\n\nService Provider portal for HomeServices system',
              )
            }>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle-outline" size={22} color={theme.text} />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>
                  About
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, {backgroundColor: theme.card}]}
            onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, {color: '#FF3B30'}]}>
                  Logout
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, {color: theme.textSecondary}]}>Version 1.0.0</Text>
      </ScrollView>
      </>
    );
  }

  return (
    <>
      <ProviderHelpSupportModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    <ScrollView style={[styles.container, {backgroundColor: theme.background}]}>
      <View style={[styles.header, {backgroundColor: theme.card}]}>
        {(() => {
          const imageUrl = (profile.profileImage || profile.photo || '').trim();
          const hasValidImage = imageUrl !== '' && !imageError && 
            (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
             imageUrl.startsWith('file://') || imageUrl.startsWith('content://'));
          
          if (hasValidImage) {
            return (
              <Image
                source={{uri: imageUrl}}
                style={styles.profileImage}
                onError={() => setImageError(true)}
                resizeMode="cover"
              />
            );
          }
          
          return (
          <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              {profile.name && profile.name.trim() !== '' ? (
                <Text style={styles.initialsText}>
                  {profile.name.trim().charAt(0).toUpperCase()}
                </Text>
              ) : (
            <Icon name="person" size={50} color="#007AFF" />
              )}
          </View>
          );
        })()}
        <Text style={[styles.name, {color: theme.text}]}>{profile.name}</Text>
        <Text style={[styles.specialty, {color: theme.primary}]}>
          {profile.specialization || profile.specialty || 'Not specified'}
        </Text>
        <View style={styles.ratingContainer}>
          <Icon name="star" size={20} color="#FFD700" />
          <Text style={styles.rating}>{profile.rating.toFixed(1)}</Text>
        </View>
        
        {/* Approval Status Banner */}
        {profile.approvalStatus === 'pending' && (
          <View style={[styles.statusBanner, styles.pendingBanner]}>
            <Icon name="hourglass-empty" size={20} color="#FF9500" />
            <Text style={styles.statusText}>Profile pending admin approval</Text>
          </View>
        )}
        {profile.approvalStatus === 'rejected' && (
          <View style={[styles.statusBanner, styles.rejectedBanner]}>
            <Icon name="cancel" size={20} color="#FF3B30" />
            <Text style={styles.statusText}>
              Profile rejected{profile.rejectionReason ? `: ${profile.rejectionReason}` : ''}
            </Text>
          </View>
        )}
        {profile.approvalStatus === 'approved' && (
          <View style={[styles.statusBanner, styles.approvedBanner]}>
            <Icon name="check-circle" size={20} color="#34C759" />
            <Text style={styles.statusText}>Profile approved</Text>
          </View>
        )}
      </View>

      <View style={[styles.section, styles.professionalSection, {backgroundColor: theme.card}]}>
        <TouchableOpacity
          style={[styles.editButton, {backgroundColor: theme.primary}]}
          onPress={() => navigation.navigate('ProviderProfileSetup')}>
          <Icon name="edit" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, styles.professionalSection, {backgroundColor: theme.card}]}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>PROFESSIONAL DETAILS</Text>
        <View style={styles.infoRow}>
          <Icon name="work" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>Experience</Text>
            <Text style={[styles.infoValue, {color: theme.text}]}>{profile.experience} years</Text>
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.professionalSection, {backgroundColor: theme.card}]}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>CONTACT INFORMATION</Text>
        <View style={styles.infoRow}>
          <Icon name="email" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>Email</Text>
            <Text style={[styles.infoValue, {color: theme.text}]}>{profile.email}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color={theme.primary} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>Phone</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
              <Text style={[styles.infoValue, {color: theme.text}]}>{profile.phone || 'Not set'}</Text>
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate('PhoneVerification', {
                    mode: 'change',
                  });
                }}
                style={{padding: 8, marginLeft: 10}}>
                <Ionicons name="create-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.section, styles.professionalSection, {backgroundColor: theme.card}]}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>YOUR ADDRESS</Text>
        <ProviderAddressInput
          value={providerAddress}
          onChange={async (address) => {
            setProviderAddress(address);
            setSavingAddress(true);
            try {
              const currentUser = auth().currentUser;
              if (currentUser) {
                // Check by UID first
                let providerDoc = await firestore()
                  .collection('providers')
                  .doc(currentUser.uid)
                  .get();
                
                // If not found by UID, check by email
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
                
                if (providerDoc.exists) {
                  await firestore()
                    .collection('providers')
                    .doc(providerDoc.id)
                    .update({
                      address: address,
                      updatedAt: firestore.FieldValue.serverTimestamp(),
                    });
                  Alert.alert('Success', 'Address updated successfully');
                }
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to update address');
            } finally {
              setSavingAddress(false);
            }
          }}
        />
      </View>


      {profile.languages && profile.languages.length > 0 && (
        <View style={[styles.section, styles.professionalSection, {backgroundColor: theme.card}]}>
          <View style={styles.languagesHeader}>
            <Ionicons name="language" size={18} color={theme.primary} />
            <Text style={[styles.languagesHeaderTitle, {color: theme.textSecondary}]}>LANGUAGES</Text>
          </View>
          <View style={styles.languagesContainer}>
            {profile.languages.map(language => (
              <View key={language} style={styles.languageChip}>
                <Icon name="translate" size={14} color="#007AFF" />
                <Text style={styles.languageText}>{language}</Text>
            </View>
          ))}
          </View>
        </View>
      )}

      {/* Reviews Section */}
      {profile && currentUser && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            REVIEWS
          </Text>
          <ReviewsList providerId={currentUser.uid} showHeader={false} />
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          APPEARANCE
        </Text>
        <TouchableOpacity
          style={[styles.settingItem, {backgroundColor: theme.card}]}
          disabled>
          <View style={styles.settingLeft}>
            <Ionicons name="moon" size={22} color={theme.primary} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, {color: theme.text}]}>
                Dark Mode
              </Text>
              <Text style={[styles.settingSubtitle, {color: theme.textSecondary}]}>
                {isDarkMode ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{false: theme.border, true: theme.primary}}
            thumbColor="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
          ACCOUNT
        </Text>
        <TouchableOpacity
          style={[styles.settingItem, {backgroundColor: theme.card}]}
          onPress={() => setShowHelpModal(true)}>
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={22} color={theme.text} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, {color: theme.text}]}>
                Help & Support
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, {backgroundColor: theme.card}]}
          onPress={() =>
            Alert.alert(
              'HomeServices Provider',
              'Version 1.0.0\n\nService Provider portal for HomeServices system',
            )
          }>
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle-outline" size={22} color={theme.text} />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, {color: theme.text}]}>
                About
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingItem, {backgroundColor: theme.card}]}
          onPress={handleLogout}>
          <View style={styles.settingLeft}>
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, {color: '#FF3B30'}]}>
              Logout
            </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, {color: theme.textSecondary}]}>Version 1.0.0</Text>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  header: {
    padding: 30,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  profileImagePlaceholder: {
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  specialty: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    ...commonStyles.shadowSmall,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  professionalSection: {
    marginTop: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingHorizontal: 0,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
    paddingRight: 20,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  languagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  languagesHeaderTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginLeft: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dayChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#007AFF20',
    shadowColor: '#007AFF',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dayText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  timeCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  timeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeCardContent: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#007AFF30',
  },
  languageText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#999',
    marginTop: 15,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    ...commonStyles.shadowMedium,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  pendingBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  rejectedBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  approvedBanner: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfoContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
    maxWidth: 400,
  },
  userInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  userInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  version: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    padding: 20,
  },
});

