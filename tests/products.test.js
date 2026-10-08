import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { createAdminAgent } from "./helpers/auth.js";

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

    const agent = await createAdminAgent();

    const response = await agent.post("/api/products").send({
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

    const agent = await createAdminAgent();

    await agent.post("/api/products").send({
      categoryId: category.id,
      title: "Phone",
      slug: "phone",
      basePrice: 100000,
    });

    const response = await agent.post("/api/products").send({
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

    const agent = await createAdminAgent();

    const response = await agent.post("/api/products").send({
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

    const agent = await createAdminAgent();

    const response = await agent.post("/api/products").send({
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
    const agent = await createAdminAgent();

    const response = await agent.post("/api/products").send({
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
  it("returns paginated products sorted by title", async () => {
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

    expect(response.body.data).toHaveLength(3);

    expect(response.body.data.map((product) => product.title)).toEqual([
      "Apple Phone",
      "Middle Phone",
      "Zebra Phone",
    ]);

    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 12,
      total: 3,
      pageCount: 1,
    });
  });

  it("filters products by search", async () => {
    category = await createCategory();

    await prisma.product.createMany({
      data: [
        {
          categoryId: category.id,
          title: "iPhone 17",
          slug: "iphone-17",
          description: "Apple smartphone",
          basePrice: 100000,
        },
        {
          categoryId: category.id,
          title: "Galaxy S26",
          slug: "galaxy-s26",
          description: "Samsung smartphone",
          basePrice: 200000,
        },
        {
          categoryId: category.id,
          title: "Desk Lamp",
          slug: "desk-lamp",
          description: "Home lighting",
          basePrice: 50000,
        },
      ],
    });

    const response = await request(app).get("/api/products").query({
      search: "SMARTPHONE",
    });

    expect(response.status).toBe(200);

    expect(response.body.data).toHaveLength(2);

    expect(response.body.data.map((product) => product.title)).toEqual([
      "Galaxy S26",
      "iPhone 17",
    ]);

    expect(response.body.pagination.total).toBe(2);
  });

  it("filters products by category", async () => {
    category = await createCategory();

    const secondCategory = await prisma.category.create({
      data: {
        name: "Furniture",
        slug: "furniture",
      },
    });

    await prisma.product.createMany({
      data: [
        {
          categoryId: category.id,
          title: "Phone",
          slug: "phone",
          basePrice: 100000,
        },
        {
          categoryId: secondCategory.id,
          title: "Chair",
          slug: "chair",
          basePrice: 200000,
        },
      ],
    });

    const response = await request(app).get("/api/products").query({
      categoryId: secondCategory.id,
    });

    expect(response.status).toBe(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("Chair");
    expect(response.body.pagination.total).toBe(1);
  });

  it("filters products by price range", async () => {
    category = await createCategory();

    await prisma.product.createMany({
      data: [
        {
          categoryId: category.id,
          title: "Cheap",
          slug: "cheap",
          basePrice: 50000,
        },
        {
          categoryId: category.id,
          title: "Middle",
          slug: "middle",
          basePrice: 150000,
        },
        {
          categoryId: category.id,
          title: "Expensive",
          slug: "expensive",
          basePrice: 300000,
        },
      ],
    });

    const response = await request(app).get("/api/products").query({
      minPrice: 100000,
      maxPrice: 200000,
    });

    expect(response.status).toBe(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("Middle");
  });

  it("sorts products by price descending", async () => {
    category = await createCategory();

    await prisma.product.createMany({
      data: [
        {
          categoryId: category.id,
          title: "Cheap",
          slug: "cheap",
          basePrice: 50000,
        },
        {
          categoryId: category.id,
          title: "Expensive",
          slug: "expensive",
          basePrice: 300000,
        },
        {
          categoryId: category.id,
          title: "Middle",
          slug: "middle",
          basePrice: 150000,
        },
      ],
    });

    const response = await request(app).get("/api/products").query({
      sort: "basePrice",
      order: "desc",
    });

    expect(response.status).toBe(200);

    expect(response.body.data.map((product) => product.basePrice)).toEqual([
      300000, 150000, 50000,
    ]);
  });

  it("paginates products", async () => {
    category = await createCategory();

    await prisma.product.createMany({
      data: [
        {
          categoryId: category.id,
          title: "Product A",
          slug: "product-a",
          basePrice: 100000,
        },
        {
          categoryId: category.id,
          title: "Product B",
          slug: "product-b",
          basePrice: 200000,
        },
        {
          categoryId: category.id,
          title: "Product C",
          slug: "product-c",
          basePrice: 300000,
        },
        {
          categoryId: category.id,
          title: "Product D",
          slug: "product-d",
          basePrice: 400000,
        },
        {
          categoryId: category.id,
          title: "Product E",
          slug: "product-e",
          basePrice: 500000,
        },
      ],
    });

    const response = await request(app).get("/api/products").query({
      page: 2,
      limit: 2,
    });

    expect(response.status).toBe(200);

    expect(response.body.data.map((product) => product.title)).toEqual([
      "Product C",
      "Product D",
    ]);

    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 2,
      total: 5,
      pageCount: 3,
    });
  });

  it("returns an empty data array when page is beyond the last page", async () => {
    category = await createCategory();

    await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Phone",
        slug: "phone",
        basePrice: 100000,
      },
    });

    const response = await request(app).get("/api/products").query({
      page: 2,
      limit: 1,
    });

    expect(response.status).toBe(200);

    expect(response.body.data).toEqual([]);

    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 1,
      pageCount: 1,
    });
  });

  it("returns 400 for invalid query parameters", async () => {
    const response = await request(app).get("/api/products").query({
      page: 0,
      limit: 101,
    });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for an unsupported sort field", async () => {
    const response = await request(app).get("/api/products").query({
      sort: "stock",
    });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 when minPrice is greater than maxPrice", async () => {
    const response = await request(app).get("/api/products").query({
      minPrice: 300000,
      maxPrice: 100000,
    });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for unknown query parameters", async () => {
    const response = await request(app).get("/api/products").query({
      unknown: "value",
    });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Validation failed",
    });
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

    const agent = await createAdminAgent();

    const response = await agent.patch(`/api/products/${product.id}`).send({
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

    const agent = await createAdminAgent();

    const response = await agent
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
    const agent = await createAdminAgent();

    const response = await agent
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

    const agent = await createAdminAgent();

    const response = await agent.patch(`/api/products/${product.id}`).send({});

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

    const agent = await createAdminAgent();

    const response = await agent.delete(`/api/products/${product.id}`);

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
    const agent = await createAdminAgent();

    const response = await agent.delete(
      "/api/products/00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});
