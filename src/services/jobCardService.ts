import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import fcmNotificationService from './fcmNotificationService';
import {generatePIN} from '../utils/pinGenerator';

export interface JobCard {
  id?: string;
  providerId: string;
  providerName: string;
  providerAddress: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  serviceType: string;
  problem?: string; // Problem description from customer
  questionnaireAnswers?: Record<string, any>; // Answers to service-specific questions
  consultationId?: string;
  bookingId?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  scheduledTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a job card when provider accepts a booking
 */
export const createJobCard = async (
  bookingData: any,
  providerAddress: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  },
): Promise<string> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get provider details - support both phone auth (UID) and Google auth (email)
    let provider: any = null;
    let providerId: string = '';
    
    // Try to find by email first (Google auth)
    if (currentUser.email) {
      const emailQuery = await firestore()
        .collection('providers')
        .where('email', '==', currentUser.email)
        .limit(1)
        .get();
      
      if (!emailQuery.empty) {
        provider = emailQuery.docs[0].data();
        providerId = emailQuery.docs[0].id;
      }
    }
    
    // If not found by email, try by UID (phone auth)
    if (!provider) {
      const uidDoc = await firestore()
        .collection('providers')
        .doc(currentUser.uid)
        .get();
      
      if (uidDoc.exists) {
        provider = uidDoc.data();
        providerId = currentUser.uid;
      }
    }

    if (!provider || !providerId) {
      throw new Error('Provider profile not found. Please complete your profile setup.');
    }

    // Get customer address from booking data or user profile
    let customerAddress = {
      address: '',
      pincode: '',
    };

    if (bookingData.customerAddress) {
      customerAddress = bookingData.customerAddress;
    } else if (bookingData.patientAddress) {
      customerAddress = bookingData.patientAddress;
    } else if (bookingData.patientId || bookingData.customerId) {
      // Try to get from user profile
      const customerId = bookingData.patientId || bookingData.customerId;
      const customerDoc = await firestore()
        .collection('users')
        .doc(customerId)
        .get();
      
      if (customerDoc.exists) {
        const location = customerDoc.data()?.location;
        if (location) {
          customerAddress = {
            address: location.address || '',
            city: location.city,
            state: location.state,
            pincode: location.pincode || '',
            latitude: location.latitude,
            longitude: location.longitude,
          };
        }
      }
    }

    // Get customer name and phone
    const customerName = bookingData.patientName || bookingData.customerName || 'Customer';
    const customerPhone = bookingData.patientPhone || bookingData.customerPhone || '';
    
    // Get problem description (could be symptoms, notes, problem, description, etc.)
    const problem = bookingData.problem ||
                    bookingData.symptoms ||
                    bookingData.notes ||
                    bookingData.description ||
                    bookingData.issue ||
                    '';

    // Get questionnaire answers if available
    // First try from bookingData (WebSocket notification), then fetch from consultation document as fallback
    let questionnaireAnswers = bookingData.questionnaireAnswers || undefined;
    
    // If not in bookingData, fetch from consultation document
    if (!questionnaireAnswers && bookingData.consultationId) {
      try {
        const consultationDoc = await firestore()
          .collection('consultations')
          .doc(bookingData.consultationId)
          .get();
        
        if (consultationDoc.exists) {
          const consultationData = consultationDoc.data();
          if (consultationData?.questionnaireAnswers) {
            questionnaireAnswers = consultationData.questionnaireAnswers;
            console.log('✅ Fetched questionnaire answers from consultation document');
          }
        }
      } catch (error) {
        console.warn('Could not fetch questionnaire answers from consultation:', error);
        // Continue without questionnaire answers - not critical
      }
    }

    // Create job card with all customer details
    const jobCardRef = firestore().collection('jobCards').doc();
    const jobCard: Omit<JobCard, 'id'> = {
      providerId,
      providerName: provider.name || currentUser.displayName || 'Provider',
      providerAddress,
      customerId: bookingData.patientId || bookingData.customerId || '',
      customerName,
      customerPhone,
      customerAddress: customerAddress as any,
      serviceType: provider.specialization || provider.specialty || 'Service',
      problem: problem || undefined, // Only include if not empty
      questionnaireAnswers, // Include questionnaire answers
      consultationId: bookingData.consultationId,
      bookingId: bookingData.bookingId || bookingData.id,
      status: 'accepted',
      scheduledTime: bookingData.scheduledTime
        ? (bookingData.scheduledTime instanceof Date
            ? bookingData.scheduledTime
            : new Date(bookingData.scheduledTime))
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await jobCardRef.set({
      ...jobCard,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
      scheduledTime: jobCard.scheduledTime
        ? firestore.Timestamp.fromDate(jobCard.scheduledTime)
        : undefined,
    });

    const jobCardId = jobCardRef.id;

    // Also create status entry in Realtime Database for real-time updates
    // Write to the root jobCard node first (for creation permission check)
    await database()
      .ref(`jobCards/${jobCardId}`)
      .set({
        providerId: providerId,
        customerId: jobCard.customerId,
        status: jobCard.status,
        updatedAt: Date.now(),
      });

    return jobCardId;
  } catch (error: any) {
    console.error('Error creating job card:', error);
    throw new Error(error.message || 'Failed to create job card');
  }
};

/**
 * Get job card by ID
 */
export const getJobCardById = async (jobCardId: string): Promise<JobCard | null> => {
  try {
    const doc = await firestore().collection('jobCards').doc(jobCardId).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      scheduledTime: doc.data()?.scheduledTime?.toDate(),
    } as JobCard;
  } catch (error) {
    console.error('Error fetching job card:', error);
    return null;
  }
};

/**
 * Get all job cards for a provider
 */
export const fetchJobCardsByProvider = async (providerId: string): Promise<JobCard[]> => {
  return getProviderJobCards(providerId);
};

export const getProviderJobCards = async (providerId: string): Promise<JobCard[]> => {
  try {
    const snapshot = await firestore()
      .collection('jobCards')
      .where('providerId', '==', providerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      scheduledTime: doc.data().scheduledTime?.toDate(),
    })) as JobCard[];
  } catch (error: any) {
    console.error('Error fetching job cards:', error);
    
    // Check if it's an index error
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.error('Missing Firestore index. Please create the index:');
      console.error('Collection: jobCards');
      console.error('Fields: providerId (Ascending) + createdAt (Descending)');
      throw new Error('Missing Firestore index. Please create index for jobCards: providerId + createdAt');
    }
    
    // Check if it's a permission error
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore rules.');
    }
    
    throw new Error(`Failed to fetch job cards: ${error.message || error.code || 'Unknown error'}`);
  }
};

/**
 * Update job card status (uses Realtime Database for real-time sync)
 */
export const updateJobCardStatus = async (
  jobCardId: string,
  status: JobCard['status'],
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card data to get customer ID and consultation ID
    const jobCardDoc = await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .get();
    
    if (!jobCardDoc.exists) {
      throw new Error('Job card not found');
    }
    
    const jobCardData = jobCardDoc.data();
    let customerId = jobCardData?.customerId;
    const consultationId = jobCardData?.consultationId || jobCardData?.bookingId;
    const providerName = jobCardData?.providerName || 'Provider';
    const serviceType = jobCardData?.serviceType || 'service';

    // If customerId is missing but consultationId exists, fetch it from consultation document
    if (!customerId && consultationId) {
      try {
        const consultationDoc = await firestore()
          .collection('consultations')
          .doc(consultationId)
          .get();
        
        if (consultationDoc.exists) {
          const consultationData = consultationDoc.data();
          customerId = consultationData?.customerId || consultationData?.patientId;
          
          // Update job card with customerId if found
          if (customerId) {
            await firestore()
              .collection('jobCards')
              .doc(jobCardId)
              .update({
                customerId,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
            console.log('✅ Fetched and saved customerId from consultation:', customerId);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch customerId from consultation:', error);
        // Continue - we'll try to send notification anyway if customerId becomes available
      }
    }

    // Generate PIN when starting task (status changes to 'in-progress')
    let taskPIN: string | undefined;
    if (status === 'in-progress') {
      taskPIN = generatePIN();
      console.log('🔐 Generated PIN for task:', taskPIN);
    }

    // Update in Firestore (for persistence and queries)
    const updateData: any = {
      status,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };
    
    if (taskPIN) {
      updateData.taskPIN = taskPIN;
      updateData.pinGeneratedAt = firestore.FieldValue.serverTimestamp();
    }
    
    await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .update(updateData);

    // Update consultation status if consultation ID exists
    if (consultationId) {
      try {
        await firestore()
          .collection('consultations')
          .doc(consultationId)
          .update({
            status,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      } catch (consultationError) {
        console.warn('Error updating consultation status:', consultationError);
        // Don't throw - job card update should still succeed
      }
    }

    // Update in Realtime Database (for real-time synchronization)
    // Update the root node to ensure providerId is available for permission checks
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: status,
        updatedAt: Date.now(),
      });

    // Send notification to customer based on status
    console.log('📋 updateJobCardStatus - Status update:', {
      status,
      customerId,
      consultationId,
      jobCardId,
      providerName,
      serviceType,
    });

    if (customerId && consultationId) {
      try {
        if (status === 'in-progress') {
          console.log('🔄 Status is in-progress, sending FCM notification with PIN');
          await fcmNotificationService.notifyCustomerServiceStarted(
            customerId,
            providerName,
            serviceType,
            consultationId,
            jobCardId,
            taskPIN,
          );
        } else if (status === 'completed') {
          console.log('✅ Status is completed, sending FCM notification');
          await fcmNotificationService.notifyCustomerServiceCompleted(
            customerId,
            providerName,
            serviceType,
            consultationId,
          );
          
          // Emit WebSocket event to customer room for real-time review prompt
          console.log('🔌 Starting WebSocket emission for service completion');
          try {
            const SOCKET_URL = __DEV__
              ? 'http://10.0.2.2:3001'
              : process.env.SOCKET_URL || 'https://your-production-server.com';
            
            const payload = {
              customerId,
              jobCardId,
              consultationId,
              providerName,
              serviceType,
            };
            
            console.log('📤 [PROVIDER] Emitting WebSocket service-completed event:', {
              ...payload,
              socketUrl: SOCKET_URL,
              timestamp: new Date().toISOString(),
            });
            
            const response = await fetch(`${SOCKET_URL}/emit-service-completed`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            });
            
            console.log('📥 [PROVIDER] WebSocket response status:', response.status);
            
            const result = await response.json();
            console.log('📥 [PROVIDER] WebSocket response data:', result);
            
            if (response.ok && result.success) {
              console.log('✅ [PROVIDER] WebSocket service-completed event emitted successfully');
              console.log('📊 [PROVIDER] Customer room size:', result.roomSize);
              if (result.roomSize === 0) {
                console.warn('⚠️ [PROVIDER] WARNING: Customer room size is 0 - customer may not be connected!');
              }
            } else {
              console.error('❌ [PROVIDER] Failed to emit WebSocket service-completed event:', {
                status: response.status,
                error: result.error || 'Unknown error',
                result,
              });
            }
          } catch (websocketError: any) {
            console.error('❌ [PROVIDER] Error emitting WebSocket service-completed event:', {
              error: websocketError.message,
              stack: websocketError.stack,
              name: websocketError.name,
            });
            // Don't throw - WebSocket failure shouldn't block status update
          }
        }
      } catch (notificationError: any) {
        console.error('❌ [PROVIDER] Error sending status notification:', {
          error: notificationError.message,
          status,
        });
        // Don't throw - notification failure shouldn't block status update
      }
    } else {
      console.warn('⚠️ [PROVIDER] Cannot send notification - missing customerId or consultationId:', {
        customerId: !!customerId,
        consultationId: !!consultationId,
      });
    }
  } catch (error) {
    console.error('Error updating job card status:', error);
    throw new Error('Failed to update job card status');
  }
};

/**
 * Subscribe to real-time job card status updates
 * Returns unsubscribe function
 */
export const subscribeToJobCardStatus = (
  jobCardId: string,
  callback: (status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const statusRef = database().ref(`jobCards/${jobCardId}/status`);

  const onStatusChange = statusRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback(data.status, data.updatedAt);
    }
  });

  // Return unsubscribe function
  return () => {
    statusRef.off('value', onStatusChange);
  };
};

/**
 * Subscribe to all job card status updates for a provider
 * Returns unsubscribe function
 */
export const subscribeToProviderJobCardStatuses = (
  providerId: string,
  callback: (jobCardId: string, status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const providerJobCardsRef = database().ref('jobCards');

  const onStatusChange = providerJobCardsRef.on('child_changed', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();
    
    if (statusData && statusData.providerId === providerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  // Also listen for new job cards
  const onJobCardAdded = providerJobCardsRef.on('child_added', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();
    
    if (statusData && statusData.providerId === providerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  // Return unsubscribe function
  return () => {
    providerJobCardsRef.off('child_changed', onStatusChange);
    providerJobCardsRef.off('child_added', onJobCardAdded);
  };
};

/**
 * Subscribe to all job card status updates for a customer
 * Returns unsubscribe function
 */
export const subscribeToCustomerJobCardStatuses = (
  customerId: string,
  callback: (jobCardId: string, status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const customerJobCardsRef = database().ref('jobCards');

  const onStatusChange = customerJobCardsRef.on('child_changed', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();
    
    if (statusData && statusData.customerId === customerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  // Also listen for new job cards
  const onJobCardAdded = customerJobCardsRef.on('child_added', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();
    
    if (statusData && statusData.customerId === customerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  // Return unsubscribe function
  return () => {
    customerJobCardsRef.off('child_changed', onStatusChange);
    customerJobCardsRef.off('child_added', onJobCardAdded);
  };
};

/**
 * Verify PIN and complete task
 */
export const verifyPINAndCompleteTask = async (
  jobCardId: string,
  enteredPIN: string,
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card to verify PIN
    const jobCardDoc = await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .get();
    
    if (!jobCardDoc.exists) {
      throw new Error('Job card not found');
    }
    
    const jobCardData = jobCardDoc.data();
    const storedPIN = jobCardData?.taskPIN;
    
    if (!storedPIN) {
      throw new Error('No PIN found for this task. Please start the task first.');
    }
    
    // Verify PIN
    if (enteredPIN !== storedPIN) {
      throw new Error('Invalid PIN. Please enter the correct PIN sent to the customer.');
    }
    
    // PIN is correct, complete the task
    await updateJobCardStatus(jobCardId, 'completed');
    
    // Clear PIN after successful completion
    await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .update({
        taskPIN: firestore.FieldValue.delete(),
        pinGeneratedAt: firestore.FieldValue.delete(),
      });
  } catch (error: any) {
    console.error('Error verifying PIN and completing task:', error);
    throw new Error(error.message || 'Failed to verify PIN and complete task');
  }
};

/**
 * Cancel task with reason
 */
export const cancelTaskWithReason = async (
  jobCardId: string,
  cancellationReason: string,
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card data
    const jobCardDoc = await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .get();
    
    if (!jobCardDoc.exists) {
      throw new Error('Job card not found');
    }
    
    const jobCardData = jobCardDoc.data();
    const customerId = jobCardData?.customerId;
    const consultationId = jobCardData?.consultationId || jobCardData?.bookingId;
    const providerName = jobCardData?.providerName || 'Provider';
    const serviceType = jobCardData?.serviceType || 'service';

    // Update job card status to cancelled with reason
    await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .update({
        status: 'cancelled',
        cancellationReason: cancellationReason.trim(),
        cancelledAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update consultation status if exists
    if (consultationId) {
      try {
        await firestore()
          .collection('consultations')
          .doc(consultationId)
          .update({
            status: 'cancelled',
            cancellationReason: cancellationReason.trim(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      } catch (consultationError) {
        console.warn('Error updating consultation status:', consultationError);
      }
    }

    // Update in Realtime Database
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: 'cancelled',
        updatedAt: Date.now(),
      });

    // Send notification to customer
    if (customerId && consultationId) {
      try {
        await fcmNotificationService.notifyCustomerServiceCancelled(
          customerId,
          providerName,
          serviceType,
          consultationId,
          cancellationReason.trim(),
        );
      } catch (notificationError) {
        console.error('Error sending cancellation notification:', notificationError);
        // Don't throw - notification failure shouldn't block cancellation
      }
    }
  } catch (error: any) {
    console.error('Error cancelling task:', error);
    throw new Error(error.message || 'Failed to cancel task');
  }
};

