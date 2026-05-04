import crypto from "node:crypto";
import { generateSecret, generateSync, generateURI, verifySync } from "otplib";

const DEFAULT_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;
const AES_GCM_NONCE_BYTES = 12;

export interface EncryptedTotpSecret {
  encrypted: string;
  nonce: string;
  tag: string;
}

export function generateTotpSecret(byteLength = 20): string {
  return generateSecret({
    length: byteLength
  });
}

export function createTotpUri(options: {
  issuer: string;
  username: string;
  secret: string;
}): string {
  return generateURI({
    issuer: options.issuer,
    label: options.username,
    secret: options.secret,
    digits: DEFAULT_DIGITS,
    period: DEFAULT_STEP_SECONDS
  });
}

export function generateTotp(secret: string, now = new Date()): string {
  return generateSync({
    secret,
    digits: DEFAULT_DIGITS,
    epoch: Math.floor(now.getTime() / 1000),
    period: DEFAULT_STEP_SECONDS
  });
}

export function verifyTotp(
  token: string,
  secret: string,
  now = new Date(),
  window = 1
): boolean {
  if (!/^\d{6}$/.test(token)) {
    return false;
  }

  try {
    const result = verifySync({
      secret,
      token,
      digits: DEFAULT_DIGITS,
      epoch: Math.floor(now.getTime() / 1000),
      epochTolerance: window * DEFAULT_STEP_SECONDS,
      period: DEFAULT_STEP_SECONDS
    });

    return result.valid;
  } catch {
    return false;
  }
}

export function encryptTotpSecret(secret: string, dataKey: string): EncryptedTotpSecret {
  const nonce = crypto.randomBytes(AES_GCM_NONCE_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveEncryptionKey(dataKey), nonce);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);

  return {
    encrypted: encrypted.toString("base64url"),
    nonce: nonce.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url")
  };
}

export function decryptTotpSecret(
  encryptedSecret: EncryptedTotpSecret,
  dataKey: string
): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    deriveEncryptionKey(dataKey),
    Buffer.from(encryptedSecret.nonce, "base64url")
  );
  decipher.setAuthTag(Buffer.from(encryptedSecret.tag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedSecret.encrypted, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function deriveEncryptionKey(dataKey: string): Buffer {
  if (!dataKey) {
    throw new Error("PASSPORT_DATA_KEY is required to encrypt TOTP enrollment.");
  }

  return crypto.createHash("sha256").update(dataKey, "utf8").digest();
}
