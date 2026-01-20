/**
 * Lightweight end-to-end encryption utilities using Web Crypto API
 * Used for encrypting audio files before upload and decrypting transcription results
 */

export interface EncryptionResult {
  encryptedData: Blob;
  key: string; // base64-encoded encryption key
  iv: string; // base64-encoded initialization vector
}

export interface DecryptionParams {
  encryptedData: Blob;
  key: string;
  iv: string;
}

/**
 * Generate a random AES-256-GCM encryption key
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey to base64 string for transmission
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a base64-encoded key string back to CryptoKey
 */
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(keyString);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a file using AES-256-GCM
 */
export async function encryptFile(file: File): Promise<EncryptionResult> {
  // Generate encryption key and IV
  const key = await generateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  // Read file as array buffer
  const fileData = await file.arrayBuffer();

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileData
  );

  // Export key for transmission
  const keyString = await exportKey(key);

  return {
    encryptedData: new Blob([encryptedData], { type: 'application/octet-stream' }),
    key: keyString,
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decryptData(params: DecryptionParams): Promise<Blob> {
  // Import the key
  const key = await importKey(params.key);
  const iv = base64ToArrayBuffer(params.iv);

  // Read encrypted data
  const encryptedData = await params.encryptedData.arrayBuffer();

  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
    },
    key,
    encryptedData
  );

  return new Blob([decryptedData]);
}

/**
 * Decrypt text content from encrypted blob
 */
export async function decryptText(params: DecryptionParams): Promise<string> {
  const decryptedBlob = await decryptData(params);
  return await decryptedBlob.text();
}

// Helper functions for base64 encoding/decoding
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
