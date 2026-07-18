import { PrivateTxDetails } from "@/hooks/usePrivacyTransfer";

// Base64 encoding/decoding helpers that work in both Browser (btoa/atob) and Node
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(bytes).toString("base64");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob !== "undefined") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } else {
    const buffer = Buffer.from(base64, "base64");
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }
}

/**
 * Encrypts transaction details using a newly generated AES-GCM key.
 * Returns a viewing key containing the encrypted data and key.
 */
export async function encryptTxDetails(details: PrivateTxDetails): Promise<string> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Cryptography API not supported in this environment");
  }

  // 1. Serialize details
  const jsonStr = JSON.stringify(details);
  const dataBytes = new TextEncoder().encode(jsonStr);

  // 2. Generate random 256-bit AES key
  const key = await cryptoObj.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  // 3. Export key to get raw bytes (32 bytes)
  const rawKey = await cryptoObj.subtle.exportKey("raw", key);
  const keyBytes = new Uint8Array(rawKey);

  // 4. Generate random 12-byte IV
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));

  // 5. Encrypt
  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    dataBytes
  );
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);

  // 6. Combine: [key_bytes (32)] + [iv_bytes (12)] + [ciphertext]
  const combined = new Uint8Array(keyBytes.length + iv.length + ciphertextBytes.length);
  combined.set(keyBytes, 0);
  combined.set(iv, keyBytes.length);
  combined.set(ciphertextBytes, keyBytes.length + iv.length);

  // 7. Base64 encode and prefix
  const base64 = arrayBufferToBase64(combined.buffer);
  
  // Make base64 url-safe to prevent issues in UIs/inputs
  const urlSafeBase64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `vkey_arc_${urlSafeBase64}`;
}

/**
 * Decrypts a viewing key and returns the transaction details.
 * Returns null if decryption fails.
 */
export async function decryptTxDetails(viewingKey: string): Promise<PrivateTxDetails | null> {
  try {
    const cryptoObj = typeof window !== "undefined" ? window.crypto : (globalThis as any).crypto;
    if (!cryptoObj || !cryptoObj.subtle) {
      throw new Error("Cryptography API not supported in this environment");
    }

    if (!viewingKey.startsWith("vkey_arc_")) {
      return null;
    }

    // 1. Decode base64
    let base64 = viewingKey.substring("vkey_arc_".length);
    // Restore base64 padding/chars
    base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }

    const combinedBuffer = base64ToArrayBuffer(base64);
    const combinedBytes = new Uint8Array(combinedBuffer);

    if (combinedBytes.length <= 44) {
      // Must be at least 32 (key) + 12 (iv) + 1 (ciphertext) bytes
      return null;
    }

    // 2. Extract key_bytes, iv_bytes, and ciphertext
    const keyBytes = combinedBytes.slice(0, 32);
    const ivBytes = combinedBytes.slice(32, 44);
    const ciphertextBytes = combinedBytes.slice(44);

    // 3. Import key
    const key = await cryptoObj.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false, // not extractable
      ["decrypt"]
    );

    // 4. Decrypt
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      key,
      ciphertextBytes
    );

    // 5. Deserialize
    const jsonStr = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonStr) as PrivateTxDetails;
  } catch (e) {
    console.error("Failed to decrypt transaction details:", e);
    return null;
  }
}
