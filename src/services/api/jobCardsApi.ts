/**
 * Job Cards API Service (Provider App)
 * Handles all job card operations via backend API
 */

import {apiGet, apiPost, apiPut} from './apiClient';

export interface JobCard {
  _id?: string;
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
  problem?: string;
  consultationId?: string;
  bookingId?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  taskPIN?: string;
  pinGeneratedAt?: string | Date;
  scheduledTime?: string | Date;
  cancellationReason?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateJobCardData {
  providerId: string;
  providerName: string;
  providerAddress: JobCard['providerAddress'];
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: JobCard['customerAddress'];
  serviceType: string;
  problem?: string;
  consultationId?: string;
  bookingId?: string;
  scheduledTime?: string | Date;
  status?: JobCard['status'];
}

export interface UpdateJobCardStatusData {
  status: JobCard['status'];
  taskPIN?: string;
  pinGeneratedAt?: string | Date;
  startedAt?: string | Date;
  completedAt?: string | Date;
  cancellationReason?: string;
}

/**
 * Get all job cards for the authenticated provider
 */
export async function getProviderJobCards(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<JobCard[]> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/provider/jobCards?${queryString}` : '/provider/jobCards';

    const response = await apiGet<{data: JobCard[]; count: number} | JobCard[]>(endpoint);
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching provider job cards:', error);
    throw error;
  }
}

/**
 * Get job card by ID (provider endpoint)
 */
export async function getJobCardById(jobCardId: string): Promise<JobCard | null> {
  try {
    return await apiGet<JobCard>(`/provider/jobCards/${jobCardId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a new job card (provider endpoint)
 */
export async function createJobCard(data: CreateJobCardData): Promise<JobCard> {
  return apiPost<JobCard>('/provider/jobCards', data);
}

/**
 * Update job card status (provider endpoint)
 */
export async function updateJobCardStatus(
  jobCardId: string,
  status: JobCard['status'],
  updates?: Partial<UpdateJobCardStatusData>,
): Promise<JobCard> {
  return apiPut<JobCard>(`/provider/jobCards/${jobCardId}/status`, {
    status,
    ...updates,
  });
}

export const jobCardsApi = {
  getProviderJobCards,
  getById: getJobCardById,
  create: createJobCard,
  updateStatus: updateJobCardStatus,
};
