import argon2 from "argon2";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

afterEach(async () => {
  await prisma.user.deleteMany();
});

describe("POST /api/auth/register", () => {
  it("registers a user", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "arash@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: "Arash",
        email: "arash@example.com",
        role: "User",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );

    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("creates the user in the database", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "arash@example.com",
      password: "password123",
    });

    const user = await prisma.user.findUnique({
      where: {
        email: "arash@example.com",
      },
    });

    expect(user).not.toBeNull();
    expect(user.name).toBe("Arash");
    expect(user.email).toBe("arash@example.com");
    expect(user.role).toBe("User");
  });

  it("stores a hashed password", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "arash@example.com",
      password: "password123",
    });

    const user = await prisma.user.findUnique({
      where: {
        email: "arash@example.com",
      },
    });

    expect(user.passwordHash).not.toBe("password123");
    await expect(argon2.verify(user.passwordHash, "password123")).resolves.toBe(
      true,
    );
  });

  it("sets the access token cookie", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "arash@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);

    const cookies = response.headers["set-cookie"];

    expect(cookies).toBeDefined();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^access_token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  it("returns 409 for duplicate email", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "arash@example.com",
      password: "password123",
    });

    const response = await request(app).post("/api/auth/register").send({
      name: "Another User",
      email: "arash@example.com",
      password: "another123",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 400 for an empty name", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "",
      email: "arash@example.com",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for an invalid email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "invalid-email",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for a password shorter than 8 characters", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "arash@example.com",
      password: "1234567",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for an unknown field", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Arash",
      email: "arash@example.com",
      password: "password123",
      role: "Admin",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("trims the name and email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "  Arash  ",
      email: "  arash@example.com  ",
      password: "password123",
    });

    expect(response.status).toBe(201);

    expect(response.body.name).toBe("Arash");
    expect(response.body.email).toBe("arash@example.com");
  });
});
