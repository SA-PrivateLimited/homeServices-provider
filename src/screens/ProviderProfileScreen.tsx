import React, {useState, useEffect, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Switch,
  Animated,
  Dimensions,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Select} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {getMyProfile, updateMyProfile} from '../services/api/providersApi';
import {getUserId} from '../services/session';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import ProviderHelpSupportModal from '../components/ProviderHelpSupportModal';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import ProviderServiceAddressFields, {
  type ProviderServiceAddressValue,
} from '../components/ProviderServiceAddressFields';
import ReviewsList from '../components/ReviewsList';
import useTranslation from '../hooks/useTranslation';

const DRAWER_WIDTH = Math.min(320, Dimensions.get('window').width * 0.82);

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

interface ProviderProfile {
  name: string;
  specialization?: string;
  specialty?: string;
  serviceType?: string;
  phone: string;
  experience: number;
  rating: number;
  profileImage?: string;
  photo?: string;
  languages?: string[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  address?: ProviderServiceAddressValue | null;
}

function resolveServiceType(provider: any): string {
  const raw = String(
    provider?.serviceType ||
      provider?.specialization ||
      provider?.specialty ||
      (Array.isArray(provider?.serviceCategories)
        ? provider.serviceCategories[0]
        : '') ||
      '',
  ).trim();
  if (!raw) return '';
  const normalized = SERVICE_TYPES.find(
    type => type.toLowerCase() === raw.toLowerCase() || type === raw,
  );
  return normalized || raw;
}

function normalizeAddress(raw: any): ProviderServiceAddressValue | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return {type: 'home', address: raw};
  }
  return {
    type: raw.type === 'office' ? 'office' : 'home',
    address: raw.address || '',
    landmark: raw.landmark || '',
    city: raw.district || raw.city || '',
    district: raw.district || raw.city || '',
    state: raw.state || '',
    stateId: raw.stateId || '',
    districtId: raw.districtId || '',
    pincode: raw.pincode || '',
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

function mapProvider(provider: any): ProviderProfile {
  const fromAddress = normalizeAddress(provider.address);
  const fromLocation = normalizeAddress(provider.location);
  const merged =
    fromAddress || fromLocation
      ? {
          ...(fromLocation || {}),
          ...(fromAddress || {}),
          landmark:
            fromAddress?.landmark ||
            fromLocation?.landmark ||
            '',
          address:
            fromAddress?.address ||
            fromLocation?.address ||
            '',
        }
      : null;

  return {
    name: provider.name || provider.displayName || '',
    specialization: provider.specialization,
    specialty: provider.specialty,
    serviceType: resolveServiceType(provider),
    phone: provider.phone || provider.phoneNumber || '',
    experience: Number(provider.experience) || 0,
    rating: Number(provider.rating) || 0,
    profileImage: provider.profileImage,
    photo: provider.photo,
    languages: provider.languages,
    approvalStatus: provider.approvalStatus,
    rejectionReason: provider.rejectionReason,
    address: merged,
  };
}

export default function ProviderProfileScreen({navigation}: any) {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarX] = useState(() => new Animated.Value(DRAWER_WIDTH));

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editServiceType, setEditServiceType] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editAddress, setEditAddress] = useState<ProviderServiceAddressValue>({
    type: 'home',
    address: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    stateId: '',
    districtId: '',
    pincode: '',
  });

  const {currentUser, setCurrentUser, isDarkMode, toggleTheme, language, setLanguage} =
    useStore();
  const userId = getUserId(currentUser);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const beginEdit = useCallback((data: ProviderProfile) => {
    setEditName(data.name || '');
    setEditServiceType(data.serviceType || '');
    setEditExperience(String(data.experience ?? 0));
    setEditAddress(
      normalizeAddress(data.address) || {
        type: 'home',
        address: '',
        landmark: '',
        city: '',
        district: '',
        state: '',
        stateId: '',
        districtId: '',
        pincode: '',
      },
    );
    setIsEditing(true);
  }, []);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    if (profile) {
      setEditName(profile.name || '');
      setEditServiceType(profile.serviceType || '');
      setEditExperience(String(profile.experience ?? 0));
      setEditAddress(
        normalizeAddress(profile.address) || {
          type: 'home',
          address: '',
          landmark: '',
          city: '',
          district: '',
          state: '',
          stateId: '',
          districtId: '',
          pincode: '',
        },
      );
    }
  }, [profile]);

  const loadProviderProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const provider = await getMyProfile();
      if (provider) {
        const mapped = mapProvider(provider);
        setProfile(mapped);
        setEditName(mapped.name);
        setEditServiceType(mapped.serviceType || '');
        setEditExperience(String(mapped.experience ?? 0));
        setEditAddress(
          normalizeAddress(mapped.address) || {
            type: 'home',
            address: '',
            landmark: '',
            city: '',
            district: '',
            state: '',
            stateId: '',
            districtId: '',
            pincode: '',
          },
        );
        setImageError(false);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error loading provider profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadProviderProfile();
  }, [loadProviderProfile]);

  useFocusEffect(
    useCallback(() => {
      if (!isEditing) {
        void loadProviderProfile();
      }
    }, [loadProviderProfile, isEditing]),
  );

  const openSidebar = () => {
    setShowSidebar(true);
    Animated.timing(sidebarX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarX, {
      toValue: DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(({finished}) => {
      if (finished) setShowSidebar(false);
    });
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    const name = editName.trim();
    if (!name) {
      Alert.alert(
        String(t('common.error') || 'Error'),
        String(t('profile.nameRequired') || 'Name is required'),
      );
      return;
    }
    if (!editServiceType.trim()) {
      Alert.alert(
        String(t('common.error') || 'Error'),
        String(t('profile.serviceTypeRequired') || 'Service type is required'),
      );
      return;
    }
    const experienceNum = parseInt(editExperience.trim(), 10);
    if (Number.isNaN(experienceNum) || experienceNum < 0 || experienceNum > 100) {
      Alert.alert(
        String(t('common.error') || 'Error'),
        String(
          t('profile.experienceInvalid') ||
            'Enter a valid experience (0–100 years)',
        ),
      );
      return;
    }

    setSaving(true);
    try {
      const addressPayload = {
        type: editAddress.type || 'home',
        address: (editAddress.address || '').trim(),
        landmark: (editAddress.landmark || '').trim() || undefined,
        city: editAddress.district || editAddress.city || undefined,
        district: editAddress.district || editAddress.city || undefined,
        state: editAddress.state || undefined,
        stateId: editAddress.stateId || undefined,
        districtId: editAddress.districtId || undefined,
        pincode: (editAddress.pincode || '').trim() || undefined,
        latitude: editAddress.latitude,
        longitude: editAddress.longitude,
      };

      const updated = await updateMyProfile({
        name,
        specialization: editServiceType.trim(),
        specialty: editServiceType.trim(),
        serviceType: editServiceType.trim(),
        experience: experienceNum,
        address: addressPayload,
        location: {
          address: addressPayload.address,
          city: addressPayload.city,
          district: addressPayload.district,
          state: addressPayload.state,
          stateId: addressPayload.stateId,
          districtId: addressPayload.districtId,
          pincode: addressPayload.pincode,
          landmark: addressPayload.landmark,
          latitude: addressPayload.latitude,
          longitude: addressPayload.longitude,
        },
      } as any);

      const mapped = mapProvider({...profile, ...updated});
      setProfile(mapped);
      setIsEditing(false);

      if (currentUser && setCurrentUser) {
        await setCurrentUser({
          ...currentUser,
          name: mapped.name,
        } as any);
      }

      Alert.alert(
        String(t('common.success') || 'Success'),
        String(t('profile.profileUpdated') || 'Profile updated successfully'),
      );
    } catch (error: any) {
      Alert.alert(
        String(t('common.error') || 'Error'),
        error?.message ||
          String(t('profile.failedToUpdate') || 'Failed to update profile'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      const {logout} = await import('../services/authService');
      const {useStore: storeApi} = await import('../store');
      await logout();
      await storeApi.getState().setCurrentUser(null);
    } catch {
      // still navigate
    }
    const parentNavigation = navigation.getParent();
    if (parentNavigation) {
      parentNavigation.reset({index: 0, routes: [{name: 'Login'}]});
    } else {
      navigation.reset({index: 0, routes: [{name: 'Login'}]});
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    danger,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, {backgroundColor: theme.card}]}
      onPress={onPress}
      disabled={!onPress && !rightComponent}
      activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <Icon
          name={icon}
          size={22}
          color={danger ? '#FF3B30' : theme.primary}
        />
        <View style={styles.settingText}>
          <Text
            style={[
              styles.settingTitle,
              {color: danger ? '#FF3B30' : theme.text},
            ]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.settingSubtitle, {color: theme.textSecondary}]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightComponent ||
        (onPress ? (
          <Icon name="chevron-forward" size={20} color={theme.textSecondary} />
        ) : null)}
    </TouchableOpacity>
  );

  const phoneDisplay =
    profile?.phone ||
    currentUser?.phone ||
    currentUser?.phoneNumber ||
    String(t('profile.notSet'));

  const specialtyDisplay =
    profile?.serviceType ||
    profile?.specialization ||
    profile?.specialty ||
    String(t('profile.notSpecified'));

  const renderAvatar = (name: string, imageUrlRaw?: string) => {
    const imageUrl = (imageUrlRaw || '').trim();
    const hasValidImage =
      imageUrl !== '' &&
      !imageError &&
      (imageUrl.startsWith('http') ||
        imageUrl.startsWith('file://') ||
        imageUrl.startsWith('content://'));

    if (hasValidImage) {
      return (
        <Image
          source={{uri: imageUrl}}
          style={styles.profileHeaderImage}
          onError={() => setImageError(true)}
          resizeMode="cover"
        />
      );
    }

    return (
      <View
        style={[
          styles.profileHeaderImage,
          styles.profileHeaderImagePlaceholder,
          {backgroundColor: theme.primary},
        ]}>
        <Text style={styles.profileHeaderInitials}>{getInitials(name)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={[styles.centerContainer, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, {backgroundColor: theme.background}]}>
      <ProviderHelpSupportModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <View
        style={[
          styles.topBar,
          {backgroundColor: theme.card, borderBottomColor: theme.border},
        ]}>
        <Text style={[styles.topBarTitle, {color: theme.text}]}>
          {String(t('common.profile') || t('profile.title') || 'Profile')}
        </Text>
        <TouchableOpacity onPress={openSidebar} style={styles.menuBtn}>
          <Icon name="menu" size={26} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.profileHeader, {backgroundColor: theme.card}]}>
          {renderAvatar(
            profile?.name || currentUser?.name || 'P',
            profile?.profileImage || profile?.photo,
          )}
          <Text style={[styles.profileHeaderName, {color: theme.text}]}>
            {profile?.name ||
              currentUser?.name ||
              String(t('profile.serviceProviderProfile'))}
          </Text>
          <Text style={[styles.profileHeaderPhone, {color: theme.primary}]}>
            {phoneDisplay}
          </Text>
          {profile ? (
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, {color: theme.textSecondary}]}>
                {specialtyDisplay}
              </Text>
              <View style={styles.ratingPill}>
                <Icon name="star" size={14} color="#F5A623" />
                <Text style={[styles.ratingText, {color: theme.text}]}>
                  {(profile.rating || 0).toFixed(1)}
                </Text>
              </View>
            </View>
          ) : null}

          {profile?.approvalStatus === 'pending' ? (
            <View style={[styles.statusBanner, styles.pendingBanner]}>
              <Icon name="hourglass-outline" size={18} color="#FF9500" />
              <Text style={styles.statusText}>
                {String(t('profile.profilePending'))}
              </Text>
            </View>
          ) : null}
          {profile?.approvalStatus === 'rejected' ? (
            <View style={[styles.statusBanner, styles.rejectedBanner]}>
              <Icon name="close-circle-outline" size={18} color="#FF3B30" />
              <Text style={styles.statusText}>
                {String(t('profile.profileRejected'))}
                {profile.rejectionReason ? `: ${profile.rejectionReason}` : ''}
              </Text>
            </View>
          ) : null}
          {profile?.approvalStatus === 'approved' ? (
            <View style={[styles.statusBanner, styles.approvedBanner]}>
              <Icon name="checkmark-circle-outline" size={18} color="#34C759" />
              <Text style={styles.statusText}>
                {String(t('profile.profileApproved'))}
              </Text>
            </View>
          ) : null}
        </View>

        {!profile ? (
          <View style={styles.section}>
            <View style={[styles.infoCard, {backgroundColor: theme.card}]}>
              <Text style={[styles.emptyLead, {color: theme.textSecondary}]}>
                {String(t('profile.setupRequiredLead'))}
              </Text>
              <TouchableOpacity
                style={[styles.primaryBtn, {backgroundColor: theme.primary}]}
                onPress={() => navigation.navigate('ProviderProfileSetup')}>
                <Icon name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {String(t('profile.setUpProfile'))}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[
                  styles.sectionTitleInline,
                  {color: theme.textSecondary},
                ]}>
                {String(t('profile.professionalDetails')).toUpperCase()}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (isEditing) {
                    void handleSaveProfile();
                  } else {
                    beginEdit(profile);
                  }
                }}
                style={styles.editBtn}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Icon
                    name={isEditing ? 'checkmark' : 'create-outline'}
                    size={22}
                    color={theme.primary}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={[styles.infoCard, {backgroundColor: theme.card}]}>
              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {String(t('profile.fullName'))}
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.fieldInput,
                    {color: theme.text, borderColor: theme.border},
                  ]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={String(t('profile.fullName'))}
                  placeholderTextColor={theme.textSecondary}
                />
              ) : (
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {profile.name || '—'}
                </Text>
              )}

              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {String(t('profile.serviceType'))}
              </Text>
              {isEditing ? (
                <Select
                  options={SERVICE_TYPES.map(s => ({value: s, label: s}))}
                  value={editServiceType}
                  onChange={setEditServiceType}
                  placeholder={String(t('profile.selectServiceType'))}
                  title={String(t('profile.selectServiceType'))}
                />
              ) : (
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {specialtyDisplay}
                </Text>
              )}

              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {String(t('profile.experience'))}
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.fieldInput,
                    {color: theme.text, borderColor: theme.border},
                  ]}
                  value={editExperience}
                  onChangeText={setEditExperience}
                  keyboardType="number-pad"
                  placeholder={String(t('profile.yearsPlaceholder'))}
                  placeholderTextColor={theme.textSecondary}
                />
              ) : (
                <Text style={[styles.fieldValue, {color: theme.text}]}>
                  {String(
                    t('profile.experienceYears', {
                      years: profile.experience,
                    }),
                  )}
                </Text>
              )}

              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {String(t('profile.primaryPhone'))}
              </Text>
              <View style={styles.lockedRow}>
                <Text style={[styles.fieldValue, {color: theme.text, flex: 1}]}>
                  {phoneDisplay}
                </Text>
                {currentUser?.phoneVerified ? (
                  <Icon
                    name="lock-closed"
                    size={16}
                    color={theme.textSecondary}
                  />
                ) : null}
              </View>
              {currentUser?.phoneVerified ? (
                <Text style={styles.verifiedHint}>
                  {String(t('profile.verifiedCannotChange'))}
                </Text>
              ) : null}

              <Text style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                {String(t('profile.yourAddress'))}
              </Text>
              {isEditing ? (
                <ProviderServiceAddressFields
                  value={editAddress}
                  onChange={setEditAddress}
                  theme={theme}
                  editable
                  showUseCurrentLocation
                  labels={{
                    address: String(t('profile.address') || 'Address'),
                    landmark: String(
                      t('profile.landmark') || 'Landmark (optional)',
                    ),
                    state: String(t('profile.state') || 'State'),
                    district: String(t('profile.district') || 'District'),
                    pincode: String(t('profile.pincode') || 'Pincode'),
                    useCurrent: String(
                      t('profile.useCurrentLocation') ||
                        'Use current location',
                    ),
                    currentLocation: String(
                      t('profile.currentLocation') || 'Current location',
                    ),
                  }}
                />
              ) : (
                <View style={styles.addressView}>
                  {typeof profile.address?.latitude === 'number' &&
                  typeof profile.address?.longitude === 'number' ? (
                    <>
                      <Text
                        style={[
                          styles.fieldLabelTight,
                          {color: theme.textSecondary},
                        ]}>
                        {String(
                          t('profile.currentLocation') || 'Current location',
                        )}
                      </Text>
                      <Text style={[styles.fieldValue, {color: theme.text}]}>
                        {profile.address.latitude.toFixed(5)},{' '}
                        {profile.address.longitude.toFixed(5)}
                      </Text>
                    </>
                  ) : null}

                  <Text
                    style={[styles.fieldLabelTight, {color: theme.textSecondary}]}>
                    {String(t('profile.address') || 'Address')}
                  </Text>
                  <Text style={[styles.fieldValue, {color: theme.text}]}>
                    {profile.address?.address || '—'}
                  </Text>

                  <Text
                    style={[styles.fieldLabelTight, {color: theme.textSecondary}]}>
                    {String(t('profile.landmark') || 'Landmark')}
                  </Text>
                  <Text style={[styles.fieldValue, {color: theme.text}]}>
                    {profile.address?.landmark || '—'}
                  </Text>

                  <Text
                    style={[styles.fieldLabelTight, {color: theme.textSecondary}]}>
                    {String(t('profile.state') || 'State')}
                  </Text>
                  <Text style={[styles.fieldValue, {color: theme.text}]}>
                    {profile.address?.state || '—'}
                  </Text>

                  <Text
                    style={[styles.fieldLabelTight, {color: theme.textSecondary}]}>
                    {String(t('profile.district') || 'District')}
                  </Text>
                  <Text style={[styles.fieldValue, {color: theme.text}]}>
                    {profile.address?.district ||
                      profile.address?.city ||
                      '—'}
                  </Text>

                  <Text
                    style={[styles.fieldLabelTight, {color: theme.textSecondary}]}>
                    {String(t('profile.pincode') || 'Pincode')}
                  </Text>
                  <Text style={[styles.fieldValue, {color: theme.text}]}>
                    {profile.address?.pincode || '—'}
                  </Text>
                </View>
              )}

              {!isEditing &&
              profile.languages &&
              profile.languages.length > 0 ? (
                <>
                  <Text
                    style={[styles.fieldLabel, {color: theme.textSecondary}]}>
                    {String(t('profile.languages'))}
                  </Text>
                  <View style={styles.chipRow}>
                    {profile.languages.map(lang => (
                      <View
                        key={lang}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: theme.primary + '14',
                            borderColor: theme.primary + '33',
                          },
                        ]}>
                        <Text style={[styles.chipText, {color: theme.primary}]}>
                          {lang}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {isEditing ? (
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, {borderColor: theme.border}]}
                    onPress={cancelEdit}
                    disabled={saving}>
                    <Text style={{color: theme.text}}>
                      {String(t('profile.cancel') || t('common.cancel') || 'Cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, {backgroundColor: theme.primary}]}
                    onPress={() => void handleSaveProfile()}
                    disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{color: '#fff', fontWeight: '600'}}>
                        {String(t('profile.save') || t('common.save') || 'Save')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {profile && userId ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
              {String(t('profile.reviews')).toUpperCase()}
            </Text>
            <View style={[styles.infoCard, {backgroundColor: theme.card}]}>
              <ReviewsList providerId={userId} showHeader={false} />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: theme.textSecondary}]}>
            {String(t('profile.account')).toUpperCase()}
          </Text>
          <SettingItem
            icon="log-out-outline"
            title={String(t('profile.logout'))}
            subtitle={String(
              t('settings.logoutSubtitle') || 'Sign out of your account',
            )}
            onPress={() => setShowLogoutModal(true)}
            danger
          />
        </View>

        <Text style={[styles.version, {color: theme.textSecondary}]}>
          {String(t('profile.version'))} 1.0.0
        </Text>
      </ScrollView>

      {showSidebar ? (
        <View style={styles.sidebarRoot} pointerEvents="box-none">
          <Pressable style={styles.sidebarBackdrop} onPress={closeSidebar} />
          <Animated.View
            style={[
              styles.sidebar,
              {
                backgroundColor: theme.card,
                transform: [{translateX: sidebarX}],
              },
            ]}>
            <View style={styles.sidebarHeader}>
              <Text style={[styles.sidebarTitle, {color: theme.text}]}>
                {String(t('settings.menu') || 'Menu')}
              </Text>
              <TouchableOpacity onPress={closeSidebar}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text
                style={[styles.sidebarSection, {color: theme.textSecondary}]}>
                {String(t('settings.appearance') || 'APPEARANCE').toUpperCase()}
              </Text>
              <SettingItem
                icon="moon"
                title={String(t('settings.darkMode') || 'Dark Mode')}
                rightComponent={
                  <Switch
                    value={isDarkMode}
                    onValueChange={toggleTheme}
                    trackColor={{false: theme.border, true: theme.primary}}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <SettingItem
                icon="language"
                title={String(t('settings.language') || 'Language')}
                subtitle={
                  language === 'en'
                    ? String(t('settings.english') || 'English')
                    : String(t('settings.hindi') || 'Hindi')
                }
                onPress={async () => {
                  if (setLanguage) {
                    await setLanguage(language === 'en' ? 'hi' : 'en');
                  }
                }}
              />

              <Text
                style={[styles.sidebarSection, {color: theme.textSecondary}]}>
                {String(t('settings.support') || 'SUPPORT').toUpperCase()}
              </Text>
              <SettingItem
                icon="person-add"
                title={String(
                  t('recommendations.shareContact') || 'Share a contact',
                )}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate('ShareContactRecommendation');
                }}
              />
              <SettingItem
                icon="help-circle"
                title={String(t('profile.helpSupport'))}
                onPress={() => {
                  closeSidebar();
                  setShowHelpModal(true);
                }}
              />

              <Text
                style={[styles.sidebarSection, {color: theme.textSecondary}]}>
                {String(
                  t('settings.information') || 'INFORMATION',
                ).toUpperCase()}
              </Text>
              <SettingItem
                icon="information-circle"
                title={String(t('profile.about'))}
                onPress={() => {
                  closeSidebar();
                  Alert.alert(
                    String(
                      t('settings.aboutHomeServices') ||
                        'HomeServices Provider',
                    ),
                    `${String(t('profile.version'))} 1.0.0\n\n${String(
                      t('settings.aboutMessage') ||
                        'Service Provider portal for HomeServices',
                    )}`,
                  );
                }}
              />
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarTitle: {fontSize: 18, fontWeight: '700'},
  menuBtn: {padding: 4},
  container: {flex: 1},
  content: {paddingVertical: 16, paddingBottom: 32},
  section: {marginBottom: 20},
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitleInline: {fontSize: 12, fontWeight: '600', letterSpacing: 1},
  editBtn: {padding: 4},
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    ...commonStyles.shadowSmall,
  },
  profileHeaderImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  profileHeaderImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeaderInitials: {fontSize: 36, fontWeight: 'bold', color: '#fff'},
  profileHeaderName: {fontSize: 22, fontWeight: 'bold', marginBottom: 4},
  profileHeaderPhone: {fontSize: 14, marginTop: 2},
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  metaText: {fontSize: 13},
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(245,166,35,0.12)',
  },
  ratingText: {fontSize: 13, fontWeight: '600'},
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 14,
    gap: 8,
    alignSelf: 'stretch',
  },
  pendingBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  rejectedBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  approvedBanner: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  infoCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    ...commonStyles.shadowSmall,
  },
  fieldLabel: {fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 4},
  fieldLabelTight: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 2,
  },
  fieldValue: {fontSize: 15, lineHeight: 22},
  addressView: {marginTop: 2},
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  lockedRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  verifiedHint: {fontSize: 12, marginTop: 2, color: '#2F855A'},
  emptyLead: {fontSize: 14, lineHeight: 20, marginBottom: 16},
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {color: '#fff', fontSize: 15, fontWeight: '600'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {fontSize: 12, fontWeight: '600'},
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 72,
    alignItems: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    ...commonStyles.shadowSmall,
  },
  settingLeft: {flexDirection: 'row', alignItems: 'center', flex: 1},
  settingText: {marginLeft: 12, flex: 1},
  settingTitle: {fontSize: 15, fontWeight: '500'},
  settingSubtitle: {fontSize: 12, marginTop: 2},
  version: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 12,
  },
  sidebarRoot: {...StyleSheet.absoluteFillObject, zIndex: 40},
  sidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sidebarTitle: {fontSize: 18, fontWeight: '700'},
  sidebarSection: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 6,
  },
});
