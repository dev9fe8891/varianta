import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

const allowedOrigin = "http://localhost:5173";
const disallowedOrigin = "https://untrusted.example";

describe("CORS", () => {
  it("allows requests from a configured origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", allowedOrigin);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not grant CORS access to an unconfigured origin", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", disallowedOrigin);

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("handles preflight requests from an allowed origin", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
    expect(response.headers["access-control-allow-headers"]).toContain(
      "content-type",
    );
  });
});
