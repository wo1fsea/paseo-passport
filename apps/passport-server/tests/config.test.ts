import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const BASE_ENV = {
  PASSPORT_ADMIN_USER: "admin",
  PASSPORT_PASSWORD_HASH: "password-hash",
  PASSPORT_SESSION_SECRET: "session-secret-with-enough-entropy",
  PASSPORT_TOTP_SECRET: "totp-secret"
};

describe("loadConfig", () => {
  it("defaults PASSPORT_LOCAL_AUTH_BYPASS to false", () => {
    const config = loadConfig(BASE_ENV);

    expect(config.localAuthBypass).toBe(false);
  });

  it("parses PASSPORT_LOCAL_AUTH_BYPASS=false", () => {
    const config = loadConfig({
      ...BASE_ENV,
      PASSPORT_LOCAL_AUTH_BYPASS: "false"
    });

    expect(config.localAuthBypass).toBe(false);
  });

  it("parses PASSPORT_LOCAL_AUTH_BYPASS=true", () => {
    const config = loadConfig({
      ...BASE_ENV,
      PASSPORT_LOCAL_AUTH_BYPASS: "true"
    });

    expect(config.localAuthBypass).toBe(true);
  });
});
