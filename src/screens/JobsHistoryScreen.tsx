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
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getUserId} from '../services/session';
import {fetchJobCardsByProvider, JobCard} from '../services/jobCardService';
import useTranslation from '../hooks/useTranslation';
import EmptyState from '../components/EmptyState';
import {
  formatJobStatusDate,
  getJobStatusColor,
  getJobStatusTitle,
  normalizeJobStatusKey,
} from '../utils/jobStatus';

export default function JobsHistoryScreen({navigation}: any) {
  const {t} = useTranslation();
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const userId = getUserId(currentUser);

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadJobCards();
    }
  }, [userId]);

  const loadJobCards = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const jobs = await fetchJobCardsByProvider(userId);
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
    const d = date instanceof Date ? date : date.toDate?.() ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const statusDateLabel = (item: JobCard) => {
    const key = normalizeJobStatusKey(item.status);
    const formatted = formatDate(item.updatedAt || item.createdAt);
    if (formatted === 'N/A') return '';
    if (key === 'cancelled') {
      return t('jobs.cancelledOn', {date: formatted}) || `Cancelled on ${formatted}`;
    }
    if (key === 'completed') {
      return t('jobs.completedOn', {date: formatted}) || `Completed on ${formatted}`;
    }
    return formatJobStatusDate(item.status, item.updatedAt || item.createdAt);
  };

  const handleCallCustomer = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert(t('common.error'), t('jobs.customerPhoneNotAvailable'));
      return;
    }

    const phone = phoneNumber.replace(/[^\d+]/g, ''); // Remove non-digit characters except +
    const phoneUrl = `tel:${phone}`;

    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert(t('common.error'), t('jobs.unableToMakeCall'));
        }
      })
      .catch(err => {
        console.error('Error opening phone dialer:', err);
        Alert.alert(t('common.error'), t('jobs.failedToOpenDialer'));
      });
  };

  const renderJobCard = ({item}: {item: JobCard}) => {
    const statusColor = getJobStatusColor(item.status);
    const dateLine = statusDateLabel(item);
    return (
    <TouchableOpacity
      style={[styles.jobCard, {backgroundColor: theme.card}]}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${item.customerName || 'Customer'}, ${item.serviceType || 'Job'}, ${getJobStatusTitle(item.status)}. ${t('jobs.viewJobDetails')}`}
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
              {item.customerName || t('jobs.customerName')}
            </Text>
            <Text style={[styles.serviceType, {color: theme.textSecondary}]}>
              {item.serviceType}
            </Text>
            {item.customerPhone && (
              <View style={styles.customerPhoneRow}>
                <Text style={[styles.customerPhone, {color: theme.textSecondary}]}>
                  {item.customerPhone}
                </Text>
                <TouchableOpacity
                  style={[styles.callButton, {backgroundColor: theme.primary}]}
                  accessibilityRole="button"
                  accessibilityLabel={String(t('jobs.callCustomer'))}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCallCustomer(item.customerPhone);
                  }}>
                  <Icon name="phone" size={14} color="#fff" />
                  <Text style={styles.callButtonText}>{t('jobs.callCustomer')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View style={styles.statusColumn}>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: statusColor + '20'},
            ]}>
            <Text style={[styles.statusText, {color: statusColor}]}>
              {item.status === 'completed'
                ? t('jobCards.completed')
                : t('jobCards.cancelled')}
            </Text>
          </View>
          <Icon name="chevron-right" size={22} color={theme.textSecondary} />
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
            numberOfLines={2}>
            {item.customerAddress.address}
            {item.customerAddress.pincode && `, ${item.customerAddress.pincode}`}
          </Text>
        </View>
      )}

      {dateLine ? (
        <View style={styles.dateRow}>
          <Icon name="calendar-today" size={16} color={theme.textSecondary} />
          <Text style={[styles.dateText, {color: theme.textSecondary}]}>
            {dateLine}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loaderContainer, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary, marginTop: 16}]}>
          {t('jobs.loadingJobHistory')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <Text style={[styles.pageSub, {color: theme.textSecondary}]}>
        {t('jobs.pastJobsDescription')}
      </Text>
      {jobCards.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={String(t('jobs.noJobHistory'))}
          message={String(t('jobs.completedJobsWillAppearHere'))}
        />
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
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  pageSub: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
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
  customerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  customerPhone: {
    fontSize: 12,
    flex: 1,
  },
  callButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusColumn: {
    alignItems: 'flex-end',
    gap: 8,
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
    alignItems: 'flex-start',
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
});

