import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

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

    // Update in Firestore (for persistence and queries)
    await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .update({
        status,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update in Realtime Database (for real-time synchronization)
    // Update the root node to ensure providerId is available for permission checks
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: status,
        updatedAt: Date.now(),
      });
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

