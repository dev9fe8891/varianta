import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

afterEach(async () => {
  await prisma.user.deleteMany();
});

describe("POST /api/auth/login", () => {
  const user = {
    name: "Arash",
    email: "arash@example.com",
    password: "password123",
  };

  it("logs in a user", async () => {
    await request(app).post("/api/auth/register").send(user);

    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: user.name,
        email: user.email,
        role: "User",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
    );

    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("passwordHash");
  });

  it("sets the access token cookie", async () => {
    await request(app).post("/api/auth/register").send(user);

    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(200);

    const cookies = response.headers["set-cookie"];

    expect(cookies).toBeDefined();
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatch(/^access_token=/);
    expect(cookies[0]).toMatch(/HttpOnly/i);
  });

  it("returns 401 for an unknown email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "unknown@example.com",
      password: "password123",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid email or password",
    });
  });

  it("returns 401 for an incorrect password", async () => {
    await request(app).post("/api/auth/register").send(user);

    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "wrongpassword",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Invalid email or password",
    });
  });

  it("returns 400 for an invalid email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "invalid-email",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for a password shorter than 8 characters", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "arash@example.com",
      password: "1234567",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for an unknown field", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "arash@example.com",
      password: "password123",
      role: "Admin",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("trims the email", async () => {
    await request(app).post("/api/auth/register").send(user);

    const response = await request(app).post("/api/auth/login").send({
      email: "  arash@example.com  ",
      password: user.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.email).toBe(user.email);
  });
});
