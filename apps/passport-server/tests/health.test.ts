import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/index";

let server: FastifyInstance | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("GET /api/health", () => {
  it("returns ok true", async () => {
    server = buildServer({
      cookieSecure: false,
      dbPath: "./data/passport.sqlite",
      host: "127.0.0.1",
      nodeEnv: "test",
      port: 7317,
      staticDir: "./public"
    });

    const response = await server.inject({
      method: "GET",
      url: "/api/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });
});
