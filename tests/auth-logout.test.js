import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("POST /api/auth/logout", () => {
  it("logs out a user without authentication", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
  });

  it("clears the access token cookie", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(204);

    const cookies = response.headers["set-cookie"];

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^access_token=/);
    expect(cookies[0]).toMatch(/Expires=Thu, 01 Jan 1970/i);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });
});
