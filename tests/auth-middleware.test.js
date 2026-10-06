import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import {
  getAccessToken,
  verifyAuthToken,
  attachUser,
  requireAuth,
} from "../src/middleware/auth.js";
import { signAccessToken } from "../src/lib/jwt.js";

const app = express();

app.get("/protected", requireAuth, (req, res) => {
  res.json({
    user: req.user,
  });
});

describe("auth middleware", () => {
  it("should extract the access token from the cookie header", () => {
    const req = {
      headers: {
        cookie: "foo=bar; access_token=test-token; another=value",
      },
    };

    expect(getAccessToken(req)).toBe("test-token");
  });

  it("should return null when the cookie header is missing", () => {
    const req = {
      headers: {},
    };

    expect(getAccessToken(req)).toBeNull();
  });

  it("should return null when the access token cookie is missing", () => {
    const req = {
      headers: {
        cookie: "foo=bar; another=value",
      },
    };

    expect(getAccessToken(req)).toBeNull();
  });

  it("should verify a valid access token", () => {
    const token = signAccessToken({
      id: "user-123",
      role: "User",
    });

    const payload = verifyAuthToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.role).toBe("User");
  });

  it("should reject an invalid access token", () => {
    expect(() => {
      verifyAuthToken("invalid-token");
    }).toThrow();
  });

  it("should attach authenticated user to the request", () => {
    const req = {};
    const next = vi.fn();

    const payload = {
      sub: "user-123",
      role: "User",
    };

    attachUser(req, payload, next);

    expect(req.user).toEqual({
      id: "user-123",
      role: "User",
    });

    expect(next).toHaveBeenCalledOnce();
  });

  it("should return 401 when access token is missing", () => {
    const req = {
      headers: {},
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when access token is invalid", () => {
    const req = {
      headers: {
        cookie: "access_token=invalid-token",
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should attach user and call next when access token is valid", () => {
    const token = signAccessToken({
      id: "user-123",
      role: "User",
    });

    const req = {
      headers: {
        cookie: `access_token=${token}`,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    requireAuth(req, res, next);

    expect(req.user).toEqual({
      id: "user-123",
      role: "User",
    });

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should reject an unauthenticated request", async () => {
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("should allow an authenticated request", async () => {
    const token = signAccessToken({
      id: "user-123",
      role: "User",
    });

    const response = await request(app)
      .get("/protected")
      .set("Cookie", `access_token=${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user: {
        id: "user-123",
        role: "User",
      },
    });
  });
});
