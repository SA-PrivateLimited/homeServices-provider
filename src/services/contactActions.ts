/**
 * One-tap customer contact / navigation helpers
 */

import {Linking, Platform} from 'react-native';

export function digitsOnlyPhone(phone?: string | null): string {
  return String(phone || '').replace(/\D/g, '');
}

/** India-friendly: last 10 digits → 91XXXXXXXXXX for wa.me */
export function whatsAppE164(phone?: string | null): string | null {
  const digits = digitsOnlyPhone(phone);
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length > 10) return digits;
  return null;
}

export async function openCall(phone?: string | null): Promise<void> {
  const digits = digitsOnlyPhone(phone);
  if (!digits) throw new Error('No phone number');
  const url = `tel:${digits}`;
  await Linking.openURL(url);
}

export async function openWhatsApp(phone?: string | null): Promise<void> {
  const e164 = whatsAppE164(phone);
  if (!e164) throw new Error('No phone number');
  const url = `https://wa.me/${e164}`;
  await Linking.openURL(url);
}

export async function openNavigate(opts: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): Promise<void> {
  const {latitude, longitude, address} = opts;
  let url: string;
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)
  ) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  } else if (address && String(address).trim()) {
    url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      String(address).trim(),
    )}`;
  } else {
    throw new Error('No location available');
  }
  await Linking.openURL(url);
}

export function formatDistanceKm(km?: number | null): string | null {
  if (km == null || Number.isNaN(km)) return null;
  return `${km.toFixed(1)} km`;
}
