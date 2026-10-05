import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password.js";

describe("password utility", () => {
  it("should hash a password", async () => {
    const password = "Secret123!";

    const passwordHash = await hashPassword(password);

    expect(passwordHash).toBeTypeOf("string");
    expect(passwordHash).not.toBe(password);
  });

  it("should verify a correct password", async () => {
    const password = "Secret123!";
    const passwordHash = await hashPassword(password);

    const isValid = await verifyPassword(password, passwordHash);

    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const password = "Secret123!";
    const passwordHash = await hashPassword(password);

    const isValid = await verifyPassword("WrongPassword!", passwordHash);

    expect(isValid).toBe(false);
  });
});
