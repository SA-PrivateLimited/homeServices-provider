import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface NotificationIconProps {
  onPress: () => void;
  compact?: boolean;
}

const NotificationIcon: React.FC<NotificationIconProps> = ({
  onPress,
  compact,
}) => {
  const {isDarkMode, getUnreadCount, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const unreadCount = getUnreadCount(currentUser?.id);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, compact ? styles.compact : styles.spaced]}
      activeOpacity={0.7}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 4}}>
      <Icon name="notifications-outline" size={24} color={theme.text} />
      {unreadCount > 0 && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.error || '#FF3B30',
            },
          ]}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 4,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: {
    marginRight: 4,
  },
  spaced: {
    marginRight: 8,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default NotificationIcon;

