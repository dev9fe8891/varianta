import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

const uniqueEmail = () =>
  `auth-me-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

describe("GET /api/auth/me", () => {
  it("returns the authenticated user", async () => {
    const agent = request.agent(app);

    await agent.post("/api/auth/register").send({
      name: "Me User",
      email: uniqueEmail(),
      password: "password123",
    });

    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Me User",
      role: "User",
    });
    expect(response.body).not.toHaveProperty("passwordHash");
    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("email");
  });

  it("rejects unauthenticated requests", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("rejects an invalid access token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", "access_token=invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });
});
