import {apiGet} from './apiClient';

export type ProductFeatures = {
  allowJobCardComments: boolean;
};

const DEFAULTS: ProductFeatures = {
  allowJobCardComments: true,
};

let cached: {at: number; value: ProductFeatures} | null = null;
const TTL_MS = 30 * 1000;

export async function getProductFeatures(): Promise<ProductFeatures> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const data = await apiGet<ProductFeatures>('/settings/features', {
      skipAuth: true,
    });
    const value: ProductFeatures = {
      allowJobCardComments: data?.allowJobCardComments !== false,
    };
    cached = {at: Date.now(), value};
    return value;
  } catch {
    return cached?.value || DEFAULTS;
  }
}
