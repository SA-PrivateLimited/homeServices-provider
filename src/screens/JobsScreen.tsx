/**
 * Jobs Screen
 * Provider app - View active job cards
 * Replaces DoctorAppointmentsScreen
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
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {fetchJobCardsByProvider, JobCard, subscribeToProviderJobCardStatuses} from '../services/jobCardService';

export default function JobsScreen({navigation, route}: any) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const currentUser = auth().currentUser;

  // Get initial filter from route params, default to 'all'
  const initialFilter = route?.params?.filter || 'all';

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'in-progress' | 'completed'>(initialFilter);

  useEffect(() => {
    if (currentUser) {
      loadJobCards();
      
      // Subscribe to real-time status updates
      const unsubscribe = subscribeToProviderJobCardStatuses(
        currentUser.uid,
        (jobCardId, status, updatedAt) => {
          setJobCards(prev => 
            prev.map(job => 
              job.id === jobCardId ? {...job, status} : job
            )
          );
        }
      );

      return () => unsubscribe();
    }
  }, [currentUser]);

  // Update filter when route params change
  useEffect(() => {
    if (route?.params?.filter) {
      setFilter(route.params.filter);
    }
  }, [route?.params?.filter]);

  const loadJobCards = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const jobs = await fetchJobCardsByProvider(currentUser.uid);
      setJobCards(jobs);
    } catch (error) {
      console.error('Error loading job cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobCards();
  };

  const filteredJobs = filter === 'all' 
    ? jobCards 
    : jobCards.filter(job => job.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'accepted':
        return '#007AFF';
      case 'in-progress':
        return '#34C759';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'accepted':
        return 'Accepted';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
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
            {backgroundColor: getStatusColor(item.status) + '20'},
          ]}>
          <Text
            style={[
              styles.statusText,
              {color: getStatusColor(item.status)},
            ]}>
            {getStatusText(item.status)}
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
          {formatDate(item.scheduledTime || item.createdAt)}
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
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'pending', 'accepted', 'in-progress', 'completed'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === status ? theme.primary : theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setFilter(status)}>
            <Text
              style={[
                styles.filterText,
                {
                  color: filter === status ? '#fff' : theme.text,
                },
              ]}>
              {status === 'all' ? 'All' : getStatusText(status)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="work-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, {color: theme.text}]}>
            No jobs found
          </Text>
          <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
            {filter === 'all'
              ? 'You don\'t have any jobs yet'
              : `No ${getStatusText(filter).toLowerCase()} jobs`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
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
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
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

