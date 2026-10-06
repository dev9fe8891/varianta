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

const createProduct = async () => {
  category = await createCategory();

  return prisma.product.create({
    data: {
      categoryId: category.id,
      title: "Phone",
      slug: "phone",
      basePrice: 100000,
    },
  });
};

describe("POST /api/products/:productId/variants", () => {
  it("creates a variant", async () => {
    const product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants`)
      .send({
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      }),
    );

    expect(response.body.id).toEqual(expect.any(String));
  });

  it("returns 409 for duplicate sku", async () => {
    const product = await createProduct();

    await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants`)
      .send({
        sku: "PHONE-BLACK-128",
        price: 130000,
        stock: 5,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 400 for invalid data", async () => {
    const product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants`)
      .send({
        sku: "",
        price: -100,
        stock: -5,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for unknown fields", async () => {
    const product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants`)
      .send({
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
        unexpected: "value",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 404 when product does not exist", async () => {
    const agent = await createAdminAgent();

    const response = await agent
      .post("/api/products/00000000-0000-0000-0000-000000000000/variants")
      .send({
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("GET /api/products/:productId/variants", () => {
  it("returns variants sorted by creation time", async () => {
    const product = await createProduct();

    const firstVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const secondVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-WHITE-128",
        price: 125000,
        stock: 8,
      },
    });

    const response = await request(app).get(
      `/api/products/${product.id}/variants`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    expect(response.body.map((variant) => variant.id)).toEqual([
      firstVariant.id,
      secondVariant.id,
    ]);
  });

  it("returns 404 when product does not exist", async () => {
    const response = await request(app).get(
      "/api/products/00000000-0000-0000-0000-000000000000/variants",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("GET /api/products/:productId/variants/:variantId", () => {
  it("returns a variant by id", async () => {
    const product = await createProduct();

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const response = await request(app).get(
      `/api/products/${product.id}/variants/${variant.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: variant.id,
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      }),
    );
  });

  it("returns 404 when variant does not exist", async () => {
    const product = await createProduct();

    const response = await request(app).get(
      `/api/products/${product.id}/variants/00000000-0000-0000-0000-000000000000`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when variant belongs to another product", async () => {
    const firstProduct = await createProduct();

    const secondProduct = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Tablet",
        slug: "tablet",
        basePrice: 200000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: secondProduct.id,
        sku: "TABLET-128",
        price: 220000,
        stock: 5,
      },
    });

    const response = await request(app).get(
      `/api/products/${firstProduct.id}/variants/${variant.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("PATCH /api/products/:productId/variants/:variantId", () => {
  it("updates a variant", async () => {
    const product = await createProduct();

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/variants/${variant.id}`)
      .send({
        price: 130000,
        stock: 15,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: variant.id,
        sku: "PHONE-BLACK-128",
        price: 130000,
        stock: 15,
      }),
    );
  });

  it("returns 409 when updating to a duplicate sku", async () => {
    const product = await createProduct();

    const firstVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const secondVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-WHITE-128",
        price: 125000,
        stock: 8,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/variants/${secondVariant.id}`)
      .send({
        sku: firstVariant.sku,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 404 when variant does not exist", async () => {
    const product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .patch(
        `/api/products/${product.id}/variants/00000000-0000-0000-0000-000000000000`,
      )
      .send({
        price: 130000,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 400 for an empty update", async () => {
    const product = await createProduct();

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/variants/${variant.id}`)
      .send({});

    expect(response.status).toBe(400);

    const unchangedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(unchangedVariant).toEqual(variant);
  });

  it("returns 400 for unknown fields", async () => {
    const product = await createProduct();

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/variants/${variant.id}`)
      .send({
        price: 130000,
        unexpected: "value",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });
});

describe("DELETE /api/products/:productId/variants/:variantId", () => {
  it("deletes a variant", async () => {
    const product = await createProduct();

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: "PHONE-BLACK-128",
        price: 120000,
        stock: 10,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/variants/${variant.id}`,
    );

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const deletedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(deletedVariant).toBeNull();
  });

  it("returns 404 when variant does not exist", async () => {
    const product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/variants/00000000-0000-0000-0000-000000000000`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when variant belongs to another product", async () => {
    const firstProduct = await createProduct();

    const secondProduct = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Tablet",
        slug: "tablet",
        basePrice: 200000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: secondProduct.id,
        sku: "TABLET-128",
        price: 220000,
        stock: 5,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${firstProduct.id}/variants/${variant.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});
