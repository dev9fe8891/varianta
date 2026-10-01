import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

afterEach(async () => {
  await prisma.category.deleteMany();
});

describe("POST /api/categories", () => {
  it("creates a category", async () => {
    const response = await request(app).post("/api/categories").send({
      name: "Electronics",
      slug: "electronics",
    });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Electronics");
    expect(response.body.slug).toBe("electronics");
    expect(response.body.id).toEqual(expect.any(String));

    const category = await prisma.category.findUnique({
      where: {
        slug: "electronics",
      },
    });

    expect(category).not.toBeNull();
    expect(category.name).toBe("Electronics");
  });

  it("returns 409 for duplicate slug", async () => {
    await request(app).post("/api/categories").send({
      name: "Electronics",
      slug: "electronics",
    });

    const response = await request(app).post("/api/categories").send({
      name: "Books",
      slug: "electronics",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 400 for invalid data", async () => {
    const response = await request(app).post("/api/categories").send({
      name: "",
      slug: "",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for unknown fields", async () => {
    const response = await request(app).post("/api/categories").send({
      name: "Books",
      slug: "books",
      unexpected: "value",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });
});

describe("GET /api/categories", () => {
  it("returns categories sorted by name", async () => {
    await prisma.category.createMany({
      data: [
        {
          name: "Zebra",
          slug: "zebra",
        },
        {
          name: "Apple",
          slug: "apple",
        },
        {
          name: "Middle",
          slug: "middle",
        },
      ],
    });

    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    expect(response.body.map((category) => category.name)).toEqual([
      "Apple",
      "Middle",
      "Zebra",
    ]);
  });
});

describe("GET /api/categories/:id", () => {
  it("returns a category by id", async () => {
    const category = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const response = await request(app).get(`/api/categories/${category.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: category.id,
        name: "Books",
        slug: "books",
      }),
    );
  });

  it("returns 404 when category does not exist", async () => {
    const response = await request(app).get(
      "/api/categories/00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Category not found",
    });
  });
});

describe("PATCH /api/categories/:id", () => {
  it("updates a category", async () => {
    const category = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const response = await request(app)
      .patch(`/api/categories/${category.id}`)
      .send({
        name: "Programming Books",
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: category.id,
        name: "Programming Books",
        slug: "books",
      }),
    );

    const updatedCategory = await prisma.category.findUnique({
      where: {
        id: category.id,
      },
    });

    expect(updatedCategory.name).toBe("Programming Books");
    expect(updatedCategory.slug).toBe("books");
  });

  it("returns 409 when updating to a duplicate slug", async () => {
    const firstCategory = await prisma.category.create({
      data: {
        name: "Electronics",
        slug: "electronics",
      },
    });

    const secondCategory = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const response = await request(app)
      .patch(`/api/categories/${secondCategory.id}`)
      .send({
        slug: firstCategory.slug,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 404 when category does not exist", async () => {
    const response = await request(app)
      .patch("/api/categories/00000000-0000-0000-0000-000000000000")
      .send({
        name: "Programming Books",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Category not found",
    });
  });

  it("returns 400 for unknown fields", async () => {
    const category = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const response = await request(app)
      .patch(`/api/categories/${category.id}`)
      .send({
        unexpected: "value",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });
});

describe("DELETE /api/categories/:id", () => {
  it("deletes a category", async () => {
    const category = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const response = await request(app).delete(
      `/api/categories/${category.id}`,
    );

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const deletedCategory = await prisma.category.findUnique({
      where: {
        id: category.id,
      },
    });

    expect(deletedCategory).toBeNull();
  });

  it("returns 404 when category does not exist", async () => {
    const response = await request(app).delete(
      "/api/categories/00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Category not found",
    });
  });
});
