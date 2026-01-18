/**
 * Review Service (Provider App)
 * Uses backend API for review operations
 * Reviews are visible to both customer and provider
 * Providers cannot edit reviews
 */

import auth from '@react-native-firebase/auth';
import {reviewsApi, Review as ApiReview} from './api/reviewsApi';
import {jobCardsApi} from './api/jobCardsApi';

export interface Review {
  id?: string;
  _id?: string;
  jobCardId: string;
  serviceRequestId?: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  serviceType: string;
  rating: number; // 1-5 stars
  comment?: string;
  photos?: string[];
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/**
 * Convert API review to local Review type
 */
const convertReview = (review: ApiReview): Review => ({
  id: review._id || review.id,
  _id: review._id,
  jobCardId: review.jobCardId,
  serviceRequestId: review.serviceRequestId,
  customerId: review.customerId,
  customerName: review.customerName,
  providerId: review.providerId,
  providerName: review.providerName,
  serviceType: review.serviceType,
  rating: review.rating,
  comment: review.comment,
  photos: review.photos,
  createdAt: review.createdAt ? new Date(review.createdAt as string) : new Date(),
  updatedAt: review.updatedAt ? new Date(review.updatedAt as string) : undefined,
});

/**
 * Create a review for a completed job
 * Only customers can create reviews
 */
export const createReview = async (
  jobCardId: string,
  rating: number,
  comment?: string,
  photos?: string[],
): Promise<string> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card details via API
    const jobCard = await jobCardsApi.getById(jobCardId);

    if (!jobCard) {
      throw new Error('Job card not found');
    }

    // Verify the job is completed
    if (jobCard.status !== 'completed') {
      throw new Error('Can only review completed jobs');
    }

    // Verify the current user is the customer
    if (jobCard.customerId !== currentUser.uid) {
      throw new Error('Only the customer can create a review');
    }

    // Check if review already exists
    const existingReview = await getJobCardReview(jobCardId);
    if (existingReview) {
      throw new Error('Review already exists for this job');
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Create review via API
    const review = await reviewsApi.create({
      providerId: jobCard.providerId,
      jobCardId,
      rating,
      comment: comment?.trim(),
      photos: photos && photos.length > 0 ? photos : undefined,
    });

    return review._id || review.id || '';
  } catch (error: any) {
    console.error('Error creating review:', error);
    throw new Error(error.message || 'Failed to create review');
  }
};

/**
 * Get reviews for a provider via API
 */
export const getProviderReviews = async (
  providerId: string,
): Promise<Review[]> => {
  try {
    const reviews = await reviewsApi.getProviderReviews(providerId);
    return reviews.map(convertReview).sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error: any) {
    console.error('Error fetching provider reviews:', error);
    throw new Error(`Failed to fetch reviews: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Get reviews for a customer via API
 */
export const getCustomerReviews = async (
  customerId: string,
): Promise<Review[]> => {
  try {
    const reviews = await reviewsApi.getCustomerReviews(customerId);
    return reviews.map(convertReview).sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    throw new Error('Failed to fetch reviews');
  }
};

/**
 * Get review for a specific job card via API
 */
export const getJobCardReview = async (
  jobCardId: string,
): Promise<Review | null> => {
  try {
    const review = await reviewsApi.getJobCardReview(jobCardId);
    return review ? convertReview(review) : null;
  } catch (error) {
    console.error('Error fetching job card review:', error);
    return null;
  }
};

/**
 * Check if customer can review a job via API
 */
export const canCustomerReview = async (
  jobCardId: string,
): Promise<boolean> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return false;
    }

    // Get job card via API
    const jobCard = await jobCardsApi.getById(jobCardId);

    if (!jobCard) {
      return false;
    }

    // Check if job is completed
    if (jobCard.status !== 'completed') {
      return false;
    }

    // Check if customer matches
    if (jobCard.customerId !== currentUser.uid) {
      return false;
    }

    // Check if review already exists
    const existingReview = await getJobCardReview(jobCardId);
    return !existingReview;
  } catch (error) {
    console.error('Error checking if customer can review:', error);
    return false;
  }
};
