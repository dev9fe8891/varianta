import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { createAdminAgent, createUserAgent } from "./helpers/auth.js";

afterEach(async () => {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
});

describe("Authorization", () => {
  it("rejects unauthenticated mutation requests with 401", async () => {
    const response = await request(app).post("/api/categories").send({
      name: "Electronics",
      slug: "electronics",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("rejects regular users from admin routes with 403", async () => {
    const agent = await createUserAgent();

    const response = await agent.post("/api/categories").send({
      name: "Electronics",
      slug: "electronics",
    });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Admin access required",
    });
  });

  it("allows admins to access admin routes", async () => {
    const agent = await createAdminAgent();

    const response = await agent.post("/api/categories").send({
      name: "Electronics",
      slug: "electronics",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        name: "Electronics",
        slug: "electronics",
      }),
    );
  });

  it("allows unauthenticated access to public GET routes", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
  });
});
