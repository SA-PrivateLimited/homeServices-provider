/**
 * Service Categories API Service
 * Handles service category operations via backend API
 */

import {apiGet} from './apiClient';

export interface QuestionnaireItem {
  id: string;
  question: string;
  questionHi?: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  options?: string[];
  required?: boolean;
}

export interface ServiceCategory {
  _id?: string;
  id?: string;
  name: string;
  nameHindi?: string;
  description?: string;
  descriptionHindi?: string;
  icon?: string;
  color?: string;
  enabled?: boolean;
  isActive?: boolean;
  questionnaire?: QuestionnaireItem[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * Get all service categories
 */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  try {
    const response = await apiGet<{data: ServiceCategory[]; count: number}>('/serviceCategories');
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching service categories:', error);
    throw error;
  }
}

/**
 * Get service category by ID
 */
export async function getServiceCategoryById(categoryId: string): Promise<ServiceCategory | null> {
  try {
    return await apiGet<ServiceCategory>(`/serviceCategories/${categoryId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get service category by name
 */
export async function getServiceCategoryByName(name: string): Promise<ServiceCategory | null> {
  try {
    const categories = await getServiceCategories();
    return categories.find(c => c.name === name) || null;
  } catch (error) {
    console.error('Error fetching service category by name:', error);
    return null;
  }
}

export const serviceCategoriesApi = {
  getAll: getServiceCategories,
  getById: getServiceCategoryById,
  getByName: getServiceCategoryByName,
};
