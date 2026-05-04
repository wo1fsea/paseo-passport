import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { hashPassword } from "../apps/passport-server/src/auth/password";
import { createTotpUri, generateTotpSecret } from "../apps/passport-server/src/auth/totp";

interface Args {
  username: string;
  issuer: string;
  password?: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const password = args.password ?? (await promptPassword());
  const passwordHash = await hashPassword(password);
  const totpSecret = generateTotpSecret();
  const otpauthUrl = createTotpUri({
    issuer: args.issuer,
    secret: totpSecret,
    username: args.username
  });

  console.log(`PASSPORT_ADMIN_USER=${args.username}`);
  console.log(`PASSPORT_PASSWORD_HASH=${passwordHash}`);
  console.log(`PASSPORT_TOTP_SECRET=${totpSecret}`);
  console.log(`PASSPORT_TOTP_URI=${otpauthUrl}`);
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    issuer: "Paseo Passport",
    username: "admin"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];

    if (value === "--username" && next) {
      args.username = next;
      index += 1;
    } else if (value === "--issuer" && next) {
      args.issuer = next;
      index += 1;
    } else if (value === "--password" && next) {
      args.password = next;
      index += 1;
    } else {
      throw new Error(`Unknown or incomplete argument: ${value}`);
    }
  }

  return args;
}

async function promptPassword(): Promise<string> {
  const readline = createInterface({ input, output });

  try {
    const password = await readline.question("Admin password: ");
    const confirmation = await readline.question("Confirm admin password: ");

    if (password.length < 12) {
      throw new Error("Admin password must be at least 12 characters.");
    }

    if (password !== confirmation) {
      throw new Error("Admin passwords do not match.");
    }

    return password;
  } finally {
    readline.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
