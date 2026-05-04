import argon2 from "argon2";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
} as const;

export interface HashPasswordOptions {
  salt?: Buffer;
}

export async function hashPassword(
  password: string,
  options: HashPasswordOptions = {}
): Promise<string> {
  return argon2.hash(password, {
    ...ARGON2_OPTIONS,
    salt: options.salt
  });
}

export async function verifyPassword(password: string, expectedHash: string): Promise<boolean> {
  if (!expectedHash.startsWith("$argon2")) {
    return false;
  }

  try {
    return argon2.verify(expectedHash, password);
  } catch {
    return false;
  }
}
