import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from 'tweetnacl-util';

const KEY_NAME = 'clearmind_payload_key_v1';

let cachedKey: Uint8Array | null = null;

async function getOrCreateKey(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey;

  const stored = await SecureStore.getItemAsync(KEY_NAME);
  if (stored) {
    cachedKey = decodeBase64(stored);
    return cachedKey;
  }

  // First launch: generate a fresh 32-byte key from the OS CSPRNG and pin it
  // to this device only (excluded from iCloud Keychain sync).
  const fresh = await Crypto.getRandomBytesAsync(nacl.secretbox.keyLength);
  const encoded = encodeBase64(fresh);
  await SecureStore.setItemAsync(KEY_NAME, encoded, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  cachedKey = fresh;
  return cachedKey;
}

export interface EncryptedBlob {
  ct: string;
  nonce: string;
}

export async function encryptJSON(payload: unknown): Promise<EncryptedBlob> {
  const key = await getOrCreateKey();
  const nonce = await Crypto.getRandomBytesAsync(nacl.secretbox.nonceLength);
  const message = decodeUTF8(JSON.stringify(payload));
  const box = nacl.secretbox(message, nonce, key);
  return { ct: encodeBase64(box), nonce: encodeBase64(nonce) };
}

export async function decryptJSON<T>(blob: EncryptedBlob): Promise<T> {
  const key = await getOrCreateKey();
  const box = decodeBase64(blob.ct);
  const nonce = decodeBase64(blob.nonce);
  const message = nacl.secretbox.open(box, nonce, key);
  if (!message) {
    throw new Error('decrypt failed (key mismatch or tampered ciphertext)');
  }
  return JSON.parse(encodeUTF8(message)) as T;
}

// Wipes the key — encrypted entries on disk become unrecoverable.
// Call only on explicit user "wipe data" action.
export async function destroyKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAME);
  cachedKey = null;
}
