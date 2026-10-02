import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";

let category;

afterEach(async () => {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
});

const createCategory = async () => {
  return prisma.category.create({
    data: {
      name: "Electronics",
      slug: "electronics",
    },
  });
};

describe("POST /api/products", () => {
  it("creates a product", async () => {
    category = await createCategory();

    const response = await request(app).post("/api/products").send({
      categoryId: category.id,
      title: "Phone",
      slug: "phone",
      description: "A smartphone",
      basePrice: 100000,
      image: "phone.jpg",
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        description: "A smartphone",
        basePrice: 100000,
        image: "phone.jpg",
      }),
    );

    expect(response.body.id).toEqual(expect.any(String));
  });

  it("returns 409 for duplicate slug", async () => {
    category = await createCategory();

    await request(app).post("/api/products").send({
      categoryId: category.id,
      title: "Phone",
      slug: "phone",
      basePrice: 100000,
    });

    const response = await request(app).post("/api/products").send({
      categoryId: category.id,
      title: "Another Phone",
      slug: "phone",
      basePrice: 200000,
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 400 for invalid data", async () => {
    category = await createCategory();

    const response = await request(app).post("/api/products").send({
      categoryId: category.id,
      title: "",
      slug: "",
      basePrice: -100,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for unknown fields", async () => {
    category = await createCategory();

    const response = await request(app).post("/api/products").send({
      categoryId: category.id,
      title: "Phone",
      slug: "phone",
      basePrice: 100000,
      unexpected: "value",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 when category does not exist", async () => {
    const response = await request(app).post("/api/products").send({
      categoryId: "00000000-0000-0000-0000-000000000000",
      title: "Phone",
      slug: "phone",
      basePrice: 100000,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Related resource not found",
    });
  });
});

describe("GET /api/products", () => {
  it("returns products sorted by title", async () => {
    category = await createCategory();

    await prisma.product.createMany({
      data: [
        {
          categoryId: category.id,
          title: "Zebra Phone",
          slug: "zebra-phone",
          basePrice: 300000,
        },
        {
          categoryId: category.id,
          title: "Apple Phone",
          slug: "apple-phone",
          basePrice: 100000,
        },
        {
          categoryId: category.id,
          title: "Middle Phone",
          slug: "middle-phone",
          basePrice: 200000,
        },
      ],
    });

    const response = await request(app).get("/api/products");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    expect(response.body.map((product) => product.title)).toEqual([
      "Apple Phone",
      "Middle Phone",
      "Zebra Phone",
    ]);
  });
});

describe("GET /api/products/:id", () => {
  it("returns a product by id", async () => {
    category = await createCategory();

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        basePrice: 100000,
      },
    });

    const response = await request(app).get(`/api/products/${product.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: product.id,
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        basePrice: 100000,
      }),
    );
  });

  it("returns 404 when product does not exist", async () => {
    const response = await request(app).get(
      "/api/products/00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("PATCH /api/products/:id", () => {
  it("updates a product", async () => {
    category = await createCategory();

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        basePrice: 100000,
      },
    });

    const response = await request(app)
      .patch(`/api/products/${product.id}`)
      .send({
        title: "Updated Phone",
        basePrice: 150000,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: product.id,
        title: "Updated Phone",
        slug: "phone",
        basePrice: 150000,
      }),
    );
  });

  it("returns 409 when updating to a duplicate slug", async () => {
    category = await createCategory();

    const firstProduct = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        basePrice: 100000,
      },
    });

    const secondProduct = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Tablet",
        slug: "tablet",
        basePrice: 200000,
      },
    });

    const response = await request(app)
      .patch(`/api/products/${secondProduct.id}`)
      .send({
        slug: firstProduct.slug,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 404 when product does not exist", async () => {
    const response = await request(app)
      .patch("/api/products/00000000-0000-0000-0000-000000000000")
      .send({
        title: "Updated Phone",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 400 for an empty update", async () => {
    category = await createCategory();

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        basePrice: 100000,
      },
    });

    const response = await request(app)
      .patch(`/api/products/${product.id}`)
      .send({});

    expect(response.status).toBe(400);

    const unchangedProduct = await prisma.product.findUnique({
      where: {
        id: product.id,
      },
    });

    expect(unchangedProduct).toEqual(product);
  });
});

describe("DELETE /api/products/:id", () => {
  it("deletes a product", async () => {
    category = await createCategory();

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        basePrice: 100000,
      },
    });

    const response = await request(app).delete(`/api/products/${product.id}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const deletedProduct = await prisma.product.findUnique({
      where: {
        id: product.id,
      },
    });

    expect(deletedProduct).toBeNull();
  });

  it("returns 404 when product does not exist", async () => {
    const response = await request(app).delete(
      "/api/products/00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});
