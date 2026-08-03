/**
 * Service Requests API Service (Provider App)
 * Handles service request operations for providers via backend API
 */

import {apiGet, apiPut} from './apiClient';

export interface ServiceRequest {
  _id?: string;
  id?: string;
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
  problem?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'rejected';
  urgency?: 'immediate' | 'scheduled';
  scheduledTime?: string | Date;
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerSpecialization?: string;
  providerRating?: number;
  providerImage?: string;
  providerAddress?: any;
  consultationId?: string;
  questionnaireAnswers?: any;
  photos?: string[];
  cancellationReason?: string;
  rejectionReason?: string;
  rejectedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Get service request by ID (provider endpoint)
 */
export async function getServiceRequestById(serviceRequestId: string): Promise<ServiceRequest | null> {
  try {
    return await apiGet<ServiceRequest>(`/provider/serviceRequests/${serviceRequestId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Accept a service request (provider endpoint)
 */
export async function acceptServiceRequest(
  serviceRequestId: string,
  providerDetails?: {
    providerName?: string;
    providerPhone?: string;
    providerEmail?: string;
    providerSpecialization?: string;
    providerRating?: number;
    providerImage?: string;
    providerAddress?: any;
  },
): Promise<ServiceRequest> {
  try {
    console.log('📡 [API] Calling accept endpoint:', {
      endpoint: `/provider/serviceRequests/${serviceRequestId}/accept`,
      providerDetails,
    });
    
    const response = await apiPut<ServiceRequest>(`/provider/serviceRequests/${serviceRequestId}/accept`, providerDetails || {});
    
    console.log('✅ [API] Accept response received:', {
      serviceRequestId: response?._id || response?.id,
      status: response?.status,
    });
    
    return response;
  } catch (error: any) {
    console.error('❌ [API] Accept endpoint error:', {
      error: error.message,
      serviceRequestId,
      endpoint: `/provider/serviceRequests/${serviceRequestId}/accept`,
    });
    throw error;
  }
}

/**
 * Reject a service request (provider endpoint)
 */
export async function rejectServiceRequest(
  serviceRequestId: string,
  rejectionReason?: string,
): Promise<ServiceRequest> {
  return apiPut<ServiceRequest>(`/provider/serviceRequests/${serviceRequestId}/reject`, {
    rejectionReason: rejectionReason || 'Provider rejected the service request',
  });
}

/**
 * Get pending service requests assigned specifically to this provider
 */
export async function getMyPendingServiceRequests(): Promise<ServiceRequest[]> {
  try {
    const response = await apiGet<ServiceRequest[]>('/provider/serviceRequests/pending');
    return Array.isArray(response) ? response : [];
  } catch (error: any) {
    console.warn('Failed to fetch pending service requests:', error?.message);
    return [];
  }
}

export const serviceRequestsApi = {
  getById: getServiceRequestById,
  getMyPending: getMyPendingServiceRequests,
  accept: acceptServiceRequest,
  reject: rejectServiceRequest,
};
