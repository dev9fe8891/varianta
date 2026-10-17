import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

const allowedOrigin = "http://localhost:5173";
const disallowedOrigin = "https://untrusted.example";

describe("CSRF protection", () => {
  it("allows a state-changing request from an allowed origin", async () => {
    const response = await request(app)
      .post("/api/health")
      .set("Origin", allowedOrigin);

    // The CSRF middleware allows it to continue.
    // The endpoint itself does not support POST.
    expect(response.status).toBe(404);
  });

  it("rejects a state-changing request from a disallowed origin", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", disallowedOrigin);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe("Invalid or missing Origin");
  });

  it("rejects a state-changing request without an Origin", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe("Invalid or missing Origin");
  });

  it("allows GET requests without an Origin", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
  });

  it("allows CORS preflight requests from an allowed origin", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
  });
});
