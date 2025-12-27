/**
 * Jobs History Screen
 * Provider app - View completed job cards
 * Replaces DoctorConsultationsScreen
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {fetchJobCardsByProvider, JobCard} from '../services/jobCardService';

export default function JobsHistoryScreen({navigation}: any) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const currentUser = auth().currentUser;

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadJobCards();
    }
  }, [currentUser]);

  const loadJobCards = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const jobs = await fetchJobCardsByProvider(currentUser.uid);
      // Filter only completed and cancelled jobs
      const historyJobs = jobs.filter(
        job => job.status === 'completed' || job.status === 'cancelled'
      );
      setJobCards(historyJobs);
    } catch (error) {
      console.error('Error loading job history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobCards();
  };

  const formatDate = (date: Date | any) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderJobCard = ({item}: {item: JobCard}) => (
    <TouchableOpacity
      style={[styles.jobCard, {backgroundColor: theme.card}]}
      onPress={() => {
        navigation.navigate('JobDetails', {jobCardId: item.id});
      }}>
      <View style={styles.jobCardHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerInitial}>
              {item.customerName?.charAt(0).toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={[styles.customerName, {color: theme.text}]}>
              {item.customerName}
            </Text>
            <Text style={[styles.serviceType, {color: theme.textSecondary}]}>
              {item.serviceType}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'completed' ? '#34C75920' : '#FF3B3020',
            },
          ]}>
          <Text
            style={[
              styles.statusText,
              {
                color: item.status === 'completed' ? '#34C759' : '#FF3B30',
              },
            ]}>
            {item.status === 'completed' ? 'Completed' : 'Cancelled'}
          </Text>
        </View>
      </View>

      {item.problem && (
        <Text style={[styles.problemText, {color: theme.text}]} numberOfLines={2}>
          {item.problem}
        </Text>
      )}

      {item.customerAddress && (
        <View style={styles.addressRow}>
          <Icon name="location-on" size={16} color={theme.textSecondary} />
          <Text
            style={[styles.addressText, {color: theme.textSecondary}]}
            numberOfLines={1}>
            {item.customerAddress.address}
            {item.customerAddress.pincode && `, ${item.customerAddress.pincode}`}
          </Text>
        </View>
      )}

      <View style={styles.dateRow}>
        <Icon name="calendar-today" size={16} color={theme.textSecondary} />
        <Text style={[styles.dateText, {color: theme.textSecondary}]}>
          Completed: {formatDate(item.updatedAt || item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {jobCards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="history" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, {color: theme.text}]}>
            No job history
          </Text>
          <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
            Your completed jobs will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobCards}
          renderItem={renderJobCard}
          keyExtractor={item => item.id || ''}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  jobCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceType: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  problemText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

