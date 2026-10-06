import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { setAuthCookie, clearAuthCookie } from "../src/lib/auth-cookie.js";

const app = express();

app.get("/set-cookie", (req, res) => {
  setAuthCookie(res, "test-token");
  res.status(204).send();
});

app.get("/clear-cookie", (req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
});

describe("auth cookie", () => {
  it("should set the access token cookie with expected options", async () => {
    const response = await request(app).get("/set-cookie");

    const cookie = response.headers["set-cookie"][0];

    expect(cookie).toContain("access_token=test-token");
    expect(cookie).toContain("Max-Age=604800");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("should clear the access token cookie", async () => {
    const response = await request(app).get("/clear-cookie");

    const cookie = response.headers["set-cookie"][0];

    expect(cookie).toContain("access_token=");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });
});
