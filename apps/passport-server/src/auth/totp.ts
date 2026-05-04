import { generateSecret, generateSync, generateURI, verifySync } from "otplib";

const DEFAULT_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;

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
