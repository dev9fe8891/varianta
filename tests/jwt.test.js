import { describe, expect, it } from "vitest";
import { signAccessToken, verifyAccessToken } from "../src/lib/jwt.js";

describe("JWT utility", () => {
  it("should sign an access token with the expected payload", () => {
    const token = signAccessToken({
      id: "user-123",
      role: "User",
    });

    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("user-123");
    expect(payload.role).toBe("User");
  });

  it("should reject an invalid token", () => {
    expect(() => {
      verifyAccessToken("invalid-token");
    }).toThrow();
  });
});
