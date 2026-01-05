/**
 * PIN Generator Utility
 * Generates random PINs for task verification
 */

/**
 * Generate a random 4-digit PIN
 */
export const generatePIN = (): string => {
  // Generate a random 4-digit number (1000-9999)
  const pin = Math.floor(1000 + Math.random() * 9000);
  return pin.toString();
};

/**
 * Generate a random 6-digit PIN (alternative)
 */
export const generate6DigitPIN = (): string => {
  // Generate a random 6-digit number (100000-999999)
  const pin = Math.floor(100000 + Math.random() * 900000);
  return pin.toString();
};

