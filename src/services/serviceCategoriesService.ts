/**
 * Service Categories Service
 * Manages service types/categories for home services
 * Uses HomeServicesBackend API for all database operations
 */

import {serviceCategoriesApi, type ServiceCategory as ServiceCategoryApi} from './api/serviceCategoriesApi';

export interface QuestionnaireQuestion {
  id: string;
  question: string; // English question (backward compatibility)
  questionHi?: string; // Hindi question (optional)
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  options?: string[]; // English options for select and multiselect types (backward compatibility)
  optionsHi?: string[]; // Hindi options for select and multiselect types (optional)
  required: boolean;
  placeholder?: string; // English placeholder (backward compatibility)
  placeholderHi?: string; // Hindi placeholder (optional)
}

export interface ServiceCategory {
  id: string;
  name: string; // English name (backward compatibility)
  nameHi?: string; // Hindi name (optional)
  icon: string; // Material icon name
  color: string; // Hex color code
  description?: string; // English description
  descriptionHi?: string; // Hindi description
  isActive: boolean;
  order: number; // Display order
  questionnaire?: QuestionnaireQuestion[]; // Questions for this service category
  requiresVehicle?: boolean; // For driver/transport services
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTIONS = {
  SERVICE_CATEGORIES: 'serviceCategories',
};

/**
 * Default service categories for home services
 */
export const DEFAULT_SERVICE_CATEGORIES: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Plumber',
    icon: 'plumbing',
    color: '#3498db',
    description: 'Plumbing repairs and installations',
    isActive: true,
    order: 1,
  },
  {
    name: 'Electrician',
    icon: 'electrical-services',
    color: '#f39c12',
    description: 'Electrical repairs and installations',
    isActive: true,
    order: 2,
  },
  {
    name: 'Carpenter',
    icon: 'carpenter',
    color: '#95a5a6',
    description: 'Carpentry and woodwork',
    isActive: true,
    order: 3,
  },
  {
    name: 'AC Repair',
    icon: 'ac-unit',
    color: '#1abc9c',
    description: 'Air conditioning repair and service',
    isActive: true,
    order: 4,
  },
  {
    name: 'Appliance Repair',
    icon: 'kitchen',
    color: '#9b59b6',
    description: 'Home appliance repairs',
    isActive: true,
    order: 5,
  },
  {
    name: 'Painter',
    icon: 'format-paint',
    color: '#e74c3c',
    description: 'Painting services',
    isActive: true,
    order: 6,
  },
  {
    name: 'Cleaning Service',
    icon: 'cleaning-services',
    color: '#16a085',
    description: 'Home and office cleaning',
    isActive: true,
    order: 7,
  },
  {
    name: 'Pest Control',
    icon: 'bug-report',
    color: '#c0392b',
    description: 'Pest control and extermination',
    isActive: true,
    order: 8,
  },
  {
    name: 'Mason',
    icon: 'construction',
    color: '#7f8c8d',
    description: 'Masonry and construction work',
    isActive: true,
    order: 9,
  },
  {
    name: 'Welder',
    icon: 'build',
    color: '#34495e',
    description: 'Welding services',
    isActive: true,
    order: 10,
  },
];

/**
 * Fetch all active service categories
 * Uses backend API
 */
export const fetchServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    const categories = await serviceCategoriesApi.getAll();
    
    // Filter active categories and map to ServiceCategory format
    const activeCategories = categories
      .filter((cat: ServiceCategoryApi) => cat.isActive !== false)
      .map((cat: ServiceCategoryApi) => {
        return {
          id: cat._id || cat.id || '',
          name: cat.name || '',
          nameHi: (cat as any).nameHi || (cat as any).nameHindi,
          icon: cat.icon || 'build',
          color: cat.color || '#3498db',
          description: cat.description,
          descriptionHi: cat.descriptionHi || (cat as any).descriptionHindi,
          isActive: cat.isActive !== false,
          order: cat.order || 0,
          questionnaire: cat.questionnaire,
          requiresVehicle: cat.requiresVehicle,
          createdAt: cat.createdAt ? (cat.createdAt instanceof Date ? cat.createdAt : new Date(cat.createdAt)) : new Date(),
          updatedAt: cat.updatedAt ? (cat.updatedAt instanceof Date ? cat.updatedAt : new Date(cat.updatedAt)) : new Date(),
        } as ServiceCategory;
      });

    // If no categories from API, return defaults as fallback
    if (activeCategories.length === 0) {
      return DEFAULT_SERVICE_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `default_${index}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    return activeCategories;
  } catch (error) {
    console.error('Error fetching service categories:', error);
    // Return defaults on error as fallback
    return DEFAULT_SERVICE_CATEGORIES.map((cat, index) => ({
      ...cat,
      id: `default_${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
};

/**
 * Initialize service categories (Admin only)
 * Note: This should be handled by the backend admin API
 * This function is kept for backward compatibility but may not work
 */
export const initializeServiceCategories = async (): Promise<void> => {
  console.warn('initializeServiceCategories: Service categories should be initialized via backend admin API');
  throw new Error('Service categories initialization should be done via backend admin API');
};

/**
 * Get service category by name
 * Uses backend API
 */
export const getServiceCategoryByName = async (
  name: string,
): Promise<ServiceCategory | null> => {
  try {
    // Fetch all categories and filter by name
    // Note: Backend should ideally provide a search/by-name endpoint
    const categories = await serviceCategoriesApi.getAll();
    const category = categories.find((cat: ServiceCategoryApi) => cat.name === name && cat.isActive !== false);
    
    if (category) {
      return {
        id: category._id || category.id || '',
        name: category.name || '',
        nameHi: (category as any).nameHi || category.nameHindi,
        icon: category.icon || 'build',
        color: category.color || '#3498db',
        description: category.description,
        descriptionHi: category.descriptionHi || category.descriptionHindi,
        isActive: category.isActive !== false,
        order: category.order || 0,
        questionnaire: category.questionnaire,
        requiresVehicle: category.requiresVehicle,
        createdAt: category.createdAt ? (category.createdAt instanceof Date ? category.createdAt : new Date(category.createdAt)) : new Date(),
        updatedAt: category.updatedAt ? (category.updatedAt instanceof Date ? category.updatedAt : new Date(category.updatedAt)) : new Date(),
      } as ServiceCategory;
    }
    
    // Check defaults as fallback
    const defaultCat = DEFAULT_SERVICE_CATEGORIES.find(cat => cat.name === name);
    if (defaultCat) {
      return {
        ...defaultCat,
        id: `default_${DEFAULT_SERVICE_CATEGORIES.indexOf(defaultCat)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching service category:', error);
    return null;
  }
};

