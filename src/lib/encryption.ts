import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!';

/**
 * Encrypt a password for reversible storage (admin surveillance purposes)
 * WARNING: This is for admin surveillance only, never use for normal security
 */
export function encryptPassword(password: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Password encryption failed:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt a password (admin surveillance purposes)
 * WARNING: This is for admin surveillance only
 */
export function decryptPassword(encryptedPassword: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, ENCRYPTION_KEY);
    const password = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!password) {
      throw new Error('Invalid encrypted password');
    }
    
    return password;
  } catch (error) {
    console.error('Password decryption failed:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Encrypt sensitive data for admin logs
 */
export function encryptSensitiveData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Sensitive data encryption failed:', error);
    throw new Error('Data encryption failed');
  }
}

/**
 * Decrypt sensitive data from admin logs
 */
export function decryptSensitiveData(encryptedData: string): any {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!jsonString) {
      throw new Error('Invalid encrypted data');
    }
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Sensitive data decryption failed:', error);
    throw new Error('Data decryption failed');
  }
}

/**
 * Generate a random encryption key for sessions
 */
export function generateSessionKey(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

/**
 * Hash data for integrity verification
 */
export function hashData(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * Verify data integrity
 */
export function verifyDataIntegrity(data: string, hash: string): boolean {
  const computedHash = hashData(data);
  return computedHash === hash;
}
