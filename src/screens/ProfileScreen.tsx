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
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {isDarkMode, currentUser, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
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
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        name,
        email,
        phone,
        gender,
        bloodGroup,
      };

      const updatedUser = await authService.updateUserProfile(
        currentUser.id,
        updates,
      );
      await setCurrentUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
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
      Alert.alert('Error', error.message);
    }
  };

  const handleChangeRole = () => {
    // SECURITY: Users cannot change their own role
    // Only admins can change user roles via Admin Panel
    Alert.alert(
      'Role Change Restricted',
      'You cannot change your own role. Please contact an administrator if you need to change your role.',
      [{text: 'OK'}],
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
          Please login to view your profile
        </Text>
        <TouchableOpacity
          style={[styles.button, {backgroundColor: theme.primary}]}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Login</Text>
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
            Personal Information
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
              Full Name
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
              Email
            </Text>
          </View>
          <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
            {email}
          </Text>
        </View>

        {/* Phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Phone
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
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: phone ? theme.text : theme.textSecondary}]}>
              {phone || 'Not set'}
            </Text>
          )}
        </View>

        {/* Gender */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="male-female-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Gender
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
              placeholder="Male/Female/Other"
              placeholderTextColor={theme.textSecondary}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {gender || 'Not set'}
            </Text>
          )}
        </View>

        {/* Blood Group */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="water-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Blood Group
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
              placeholder="A+, B+, O+, etc."
              placeholderTextColor={theme.textSecondary}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {bloodGroup || 'Not set'}
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
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          Account
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={handleChangeRole}>
          <Icon name="swap-horizontal-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.primary}]}>
            Change Role {currentUser.role && `(Current: ${currentUser.role})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={handleLogout}>
          <Icon name="log-out-outline" size={20} color="#ff4444" />
          <Text style={[styles.actionButtonText, {color: '#ff4444'}]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <Text style={[styles.versionText, {color: theme.textSecondary}]}>
        Version 1.0.0
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
});

export default ProfileScreen;
