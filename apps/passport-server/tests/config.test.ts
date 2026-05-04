import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

const BASE_ENV = {
  PASSPORT_SESSION_SECRET: "session-secret-with-enough-entropy",
  PASSPORT_DATA_KEY: "0123456789abcdef0123456789abcdef"
};

describe("loadConfig", () => {
  it("does not require username, password hash, or static TOTP secret env vars", () => {
    const config = loadConfig(BASE_ENV);

    expect(config.operatorName).toBe("operator");
    expect(config.sessionSecret).toBe(BASE_ENV.PASSPORT_SESSION_SECRET);
    expect(config.dataKey).toBe(BASE_ENV.PASSPORT_DATA_KEY);
  });

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

  it("fails closed for persistent databases without PASSPORT_DATA_KEY", () => {
    expect(() =>
      loadConfig({
        PASSPORT_DB_PATH: "./data/passport.sqlite",
        PASSPORT_SESSION_SECRET: "session-secret-with-enough-entropy"
      })
    ).toThrow(/PASSPORT_DATA_KEY/);
  });

  it("allows missing PASSPORT_DATA_KEY for in-memory tests", () => {
    const config = loadConfig({
      PASSPORT_DB_PATH: ":memory:",
      PASSPORT_SESSION_SECRET: "session-secret-with-enough-entropy"
    });

    expect(config.dataKey).toBe("");
  });
});
