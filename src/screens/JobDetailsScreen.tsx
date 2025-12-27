/**
 * Job Details Screen
 * Provider app - View and manage job card details
 * Replaces DoctorConsultationDetailScreen
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getJobCardById, updateJobCardStatus, JobCard} from '../services/jobCardService';

export default function JobDetailsScreen({navigation, route}: any) {
  const {jobCardId} = route.params;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const currentUser = auth().currentUser;

  const [jobCard, setJobCard] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadJobCard();
  }, [jobCardId]);

  const loadJobCard = async () => {
    try {
      setLoading(true);
      const job = await getJobCardById(jobCardId);
      setJobCard(job);
    } catch (error) {
      console.error('Error loading job card:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: JobCard['status']) => {
    if (!jobCard) return;

    try {
      setUpdating(true);
      await updateJobCardStatus(jobCardId, newStatus);
      setJobCard({...jobCard, status: newStatus});
      Alert.alert('Success', `Job status updated to ${newStatus}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCallCustomer = () => {
    if (jobCard?.customerPhone) {
      Linking.openURL(`tel:${jobCard.customerPhone}`);
    } else {
      Alert.alert('Phone number not available');
    }
  };

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

  const formatDate = (date: Date | any) => {
    if (!date) return 'N/A';
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!jobCard) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <Text style={[styles.errorText, {color: theme.text}]}>
          Job not found
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      showsVerticalScrollIndicator={false}>
      {/* Status Card */}
      <View style={[styles.statusCard, {backgroundColor: theme.card}]}>
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusIndicator,
              {backgroundColor: getStatusColor(jobCard.status)},
            ]}
          />
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusText, {color: theme.text}]}>
              {jobCard.status.charAt(0).toUpperCase() + jobCard.status.slice(1)}
            </Text>
            <Text style={[styles.statusSubtext, {color: theme.textSecondary}]}>
              {jobCard.status === 'pending'
                ? 'Waiting for your action'
                : jobCard.status === 'accepted'
                ? 'Job accepted'
                : jobCard.status === 'in-progress'
                ? 'Service in progress'
                : jobCard.status === 'completed'
                ? 'Service completed'
                : 'Job cancelled'}
            </Text>
          </View>
        </View>
      </View>

      {/* Customer Details */}
      <View style={[styles.card, {backgroundColor: theme.card}]}>
        <Text style={[styles.cardTitle, {color: theme.text}]}>
          Customer Details
        </Text>
        <View style={styles.customerInfo}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerInitial}>
              {jobCard.customerName?.charAt(0).toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={[styles.customerName, {color: theme.text}]}>
              {jobCard.customerName}
            </Text>
            {jobCard.customerPhone && (
              <TouchableOpacity
                style={styles.phoneButton}
                onPress={handleCallCustomer}>
                <Icon name="phone" size={16} color={theme.primary} />
                <Text style={[styles.phoneText, {color: theme.primary}]}>
                  {jobCard.customerPhone}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Service Details */}
      <View style={[styles.card, {backgroundColor: theme.card}]}>
        <Text style={[styles.cardTitle, {color: theme.text}]}>
          Service Details
        </Text>
        <View style={styles.detailRow}>
          <Icon name="build" size={20} color={theme.primary} />
          <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
            Service Type:
          </Text>
          <Text style={[styles.detailValue, {color: theme.text}]}>
            {jobCard.serviceType}
          </Text>
        </View>
        {jobCard.problem && (
          <View style={styles.detailRow}>
            <Icon name="description" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
              Problem:
            </Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {jobCard.problem}
            </Text>
          </View>
        )}
        {jobCard.scheduledTime && (
          <View style={styles.detailRow}>
            <Icon name="schedule" size={20} color={theme.primary} />
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
              Scheduled:
            </Text>
            <Text style={[styles.detailValue, {color: theme.text}]}>
              {formatDate(jobCard.scheduledTime)}
            </Text>
          </View>
        )}
      </View>

      {/* Customer Address */}
      {jobCard.customerAddress && (
        <View style={[styles.card, {backgroundColor: theme.card}]}>
          <Text style={[styles.cardTitle, {color: theme.text}]}>
            Service Address
          </Text>
          <View style={styles.addressContainer}>
            <Icon name="location-on" size={20} color={theme.primary} />
            <View style={styles.addressText}>
              <Text style={[styles.addressLine, {color: theme.text}]}>
                {jobCard.customerAddress.address}
              </Text>
              {jobCard.customerAddress.pincode && (
                <Text style={[styles.addressDetails, {color: theme.textSecondary}]}>
                  Pincode: {jobCard.customerAddress.pincode}
                </Text>
              )}
              {jobCard.customerAddress.city && (
                <Text style={[styles.addressDetails, {color: theme.textSecondary}]}>
                  {jobCard.customerAddress.city}
                  {jobCard.customerAddress.state && `, ${jobCard.customerAddress.state}`}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      {jobCard.status !== 'completed' && jobCard.status !== 'cancelled' && (
        <View style={styles.actionsContainer}>
          {jobCard.status === 'accepted' && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: theme.primary}]}
              onPress={() => handleStatusUpdate('in-progress')}
              disabled={updating}>
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="play-arrow" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Start Service</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {jobCard.status === 'in-progress' && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: '#34C759'}]}
              onPress={() => handleStatusUpdate('completed')}
              disabled={updating}>
              {updating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark as Completed</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusCard: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitial: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    minWidth: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressText: {
    flex: 1,
  },
  addressLine: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  addressDetails: {
    fontSize: 14,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});

