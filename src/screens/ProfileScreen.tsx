import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import useTranslation from '../hooks/useTranslation';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {t} = useTranslation();
  const {isDarkMode, currentUser, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(currentUser?.secondaryPhone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setSecondaryPhone(currentUser.secondaryPhone || '');
      setDateOfBirth(
        currentUser.dateOfBirth?.toLocaleDateString() || '',
      );
      setGender(currentUser.gender || '');
      setBloodGroup(currentUser.bloodGroup || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    if (!name.trim()) {
      Alert.alert(t('common.error'), t('profile.pleaseEnterName'));
      return;
    }

    setLoading(true);
    try {
      const authUser = auth().currentUser;
      const loggedInWithPhone = authUser?.phoneNumber && currentUser?.phoneVerified;
      
      const updates: any = {
        name,
        email,
        gender,
        bloodGroup,
      };
      
      // Only update phone if not logged in with phone (primary phone cannot be changed)
      if (!loggedInWithPhone) {
        updates.phone = phone;
        // If phone changed, mark as unverified
        if (phone !== currentUser?.phone) {
          updates.phoneVerified = false;
        }
      }
      
      // Update secondary phone if changed
      if (secondaryPhone !== currentUser?.secondaryPhone) {
        updates.secondaryPhone = secondaryPhone;
        updates.secondaryPhoneVerified = false; // Mark as unverified when changed
      }

      const updatedUser = await authService.updateUserProfile(
        currentUser.id,
        updates,
      );
      await setCurrentUser(updatedUser);
      setIsEditing(false);
      Alert.alert(t('common.success'), t('profile.profileUpdatedSuccess'));
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await authService.logout();
      await setCurrentUser(null);
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleChangeRole = () => {
    // SECURITY: Users cannot change their own role
    // Only admins can change user roles via Admin Panel
    Alert.alert(
      t('profile.roleChangeRestricted'),
      t('profile.roleChangeRestrictedMessage'),
      [{text: t('common.ok')}],
    );
  };

  if (!currentUser) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {backgroundColor: theme.background},
        ]}>
        <Icon name="person-circle-outline" size={80} color={theme.textSecondary} />
        <Text style={[styles.notLoggedInText, {color: theme.textSecondary}]}>
          {t('profile.pleaseLoginToViewProfile')}
        </Text>
        <TouchableOpacity
          style={[styles.button, {backgroundColor: theme.primary}]}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>{t('profile.login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[styles.avatarContainer, {backgroundColor: theme.primary}]}>
          <Text style={styles.avatarText}>
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.userName, {color: theme.text}]}>{name}</Text>
        <Text style={[styles.userEmail, {color: theme.textSecondary}]}>
          {email}
        </Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {t('profile.personalInformation')}
          </Text>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            disabled={loading}>
            <Icon
              name={isEditing ? 'close' : 'create-outline'}
              size={24}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="person-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.fullName')}
            </Text>
          </View>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>{name}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="mail-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.email')}
            </Text>
          </View>
          <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
            {email}
          </Text>
        </View>

        {/* Primary Phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={[styles.labelText, {color: theme.textSecondary}]}>
                {t('profile.primaryPhone')}
              </Text>
              {currentUser?.phoneVerified && (
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
          <View style={{flex: 1, alignItems: 'flex-end'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={[styles.infoValue, {color: phone ? theme.text : theme.textSecondary}]}>
                {phone || t('profile.notSet')}
              </Text>
              {(() => {
                const authUser = auth().currentUser;
                const loggedInWithPhone = authUser?.phoneNumber && currentUser?.phoneVerified;
                if (loggedInWithPhone) {
                  return <Icon name="lock-closed" size={16} color={theme.textSecondary} />;
                }
                return null;
              })()}
            </View>
            {currentUser?.phoneVerified && (
              <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                {t('profile.verified')} {(() => {
                  const authUser = auth().currentUser;
                  const loggedInWithPhone = authUser?.phoneNumber && currentUser?.phoneVerified;
                  return loggedInWithPhone ? `(${t('profile.loginNumberCannotBeChanged')})` : '';
                })()}
              </Text>
            )}
            {!currentUser?.phoneVerified && phone && (
              <Text style={[styles.verifiedBadge, {color: theme.textSecondary}]}>
                {t('profile.notVerified')}
              </Text>
            )}
          </View>
        </View>

        {/* Secondary Phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={[styles.labelText, {color: theme.textSecondary}]}>
                {t('profile.secondaryPhone')}
              </Text>
              {currentUser?.secondaryPhoneVerified && (
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
          {isEditing ? (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {secondaryPhone ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        flex: 1,
                      },
                    ]}
                    value={secondaryPhone}
                    onChangeText={setSecondaryPhone}
                    placeholder={t('profile.secondaryPhoneNumberPlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                  {currentUser?.secondaryPhoneVerified ? (
                    <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        navigation.navigate('PhoneVerification', {
                          mode: 'secondary',
                          phoneNumber: secondaryPhone,
                        });
                      }}
                      style={{padding: 4}}>
                      <Text style={[styles.verifyLink, {color: theme.primary}]}>
                        {t('profile.verify')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await authService.removeSecondaryPhone();
                        setSecondaryPhone('');
                        const updatedUser = await authService.getCurrentUser();
                        if (updatedUser) {
                          await setCurrentUser(updatedUser);
                        }
                        Alert.alert(t('common.success'), t('profile.secondaryPhoneRemoved'));
                      } catch (error: any) {
                        Alert.alert(t('common.error'), error.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{padding: 4}}>
                    <Icon name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PhoneVerification', {
                      mode: 'secondary',
                    });
                  }}
                  style={[styles.addButton, {borderColor: theme.primary}]}>
                  <Icon name="add-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.addButtonText, {color: theme.primary}]}>
                    {t('profile.addSecondaryPhone')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {secondaryPhone ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <Text style={[styles.infoValue, {color: theme.text}]}>
                    {secondaryPhone}
                  </Text>
                  {currentUser?.secondaryPhoneVerified ? (
                    <>
                      <Icon name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                        {t('profile.verified')}
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.verifiedBadge, {color: theme.textSecondary}]}>
                      {t('profile.notVerified')}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
                  {t('profile.notSet')}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Gender */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="male-female-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.gender')}
            </Text>
          </View>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              value={gender}
              onChangeText={setGender}
              placeholder={t('profile.genderPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {gender || t('profile.notSet')}
            </Text>
          )}
        </View>

        {/* Blood Group */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="water-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              {t('profile.bloodGroup')}
            </Text>
          </View>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder={t('profile.bloodGroupPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {bloodGroup || t('profile.notSet')}
            </Text>
          )}
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={[
              styles.button,
              {backgroundColor: theme.primary},
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSaveProfile}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('profile.saveChanges')}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          {t('profile.account')}
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={handleChangeRole}>
          <Icon name="swap-horizontal-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.primary}]}>
            {t('profile.changeRole')} {currentUser.role && `(${t('profile.currentRole')}: ${currentUser.role})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={handleLogout}>
          <Icon name="log-out-outline" size={20} color="#ff4444" />
          <Text style={[styles.actionButtonText, {color: '#ff4444'}]}>
            {t('profile.logout')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <Text style={[styles.versionText, {color: theme.textSecondary}]}>
        {t('profile.version')} 1.0.0
      </Text>
      
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoRow: {
    marginBottom: 20,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    marginLeft: 28,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginLeft: 28,
  },
  button: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  notLoggedInText: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  verifiedBadge: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  verifyLink: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ProfileScreen;
