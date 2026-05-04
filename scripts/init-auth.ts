import { createPassportDb } from "../apps/passport-server/src/db";

interface ResetArgs {
  dbPath: string;
}

export interface EmergencyResetOptions {
  dbPath: string;
  now?: Date;
}

export interface EmergencyResetResult {
  enrollmentCleared: boolean;
  sessionsRevoked: number;
  message: string;
}

export function emergencyResetTotp(options: EmergencyResetOptions): EmergencyResetResult {
  const db = createPassportDb({ path: options.dbPath });
  const now = options.now ?? new Date();

  try {
    const enrollmentCleared = db.clearTotpEnrollment();
    const sessionsRevoked = db.revokeAllSessions(now);

    return {
      enrollmentCleared,
      sessionsRevoked,
      message: `TOTP enrollment reset. Revoked ${sessionsRevoked} active session(s).`
    };
  } finally {
    db.close();
  }
}

function parseArgs(argv: string[]): ResetArgs {
  if (argv[0] !== "reset-totp") {
    throw new Error("Usage: tsx scripts/init-auth.ts reset-totp --db <passport.sqlite>");
  }

  let dbPath = "";
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--db" && next) {
      dbPath = next;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${value}`);
    }
  }

  if (!dbPath) {
    throw new Error("Usage: tsx scripts/init-auth.ts reset-totp --db <passport.sqlite>");
  }

  return { dbPath };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = emergencyResetTotp({
      dbPath: args.dbPath
    });
    console.log(result.message);
  } catch (error: unknown) {
    console.error(error);
    process.exit(1);
  }
}
