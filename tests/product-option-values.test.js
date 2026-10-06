import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { createAdminAgent } from "./helpers/auth.js";

let product;
let option;

afterEach(async () => {
  await prisma.productOption.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
});

const createCategory = async (name = "Electronics", slug = "electronics") => {
  return prisma.category.create({
    data: {
      name,
      slug,
    },
  });
};

const createProduct = async (
  categoryName = "Electronics",
  categorySlug = "electronics",
  productTitle = "Phone",
  productSlug = "phone",
) => {
  const category = await createCategory(categoryName, categorySlug);

  return prisma.product.create({
    data: {
      categoryId: category.id,
      title: productTitle,
      slug: productSlug,
      description: "A smartphone",
      basePrice: 100000,
    },
  });
};

const createProductOption = async (productId, name = "Color") => {
  return prisma.productOption.create({
    data: {
      productId,
      name,
      position: 0,
    },
  });
};

describe("POST /api/products/:productId/options/:optionId/values", () => {
  it("creates a product option value", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/options/${option.id}/values`)
      .send({
        name: "Red",
        position: 0,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        optionId: option.id,
        name: "Red",
        position: 0,
      }),
    );

    expect(response.body.id).toEqual(expect.any(String));
  });

  it("returns 409 for duplicate value name", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    await agent
      .post(`/api/products/${product.id}/options/${option.id}/values`)
      .send({
        name: "Red",
        position: 0,
      });

    const response = await agent
      .post(`/api/products/${product.id}/options/${option.id}/values`)
      .send({
        name: "Red",
        position: 1,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 400 for invalid data", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/options/${option.id}/values`)
      .send({
        name: "",
        position: -1,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for unknown fields", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/options/${option.id}/values`)
      .send({
        name: "Red",
        position: 0,
        unexpected: "value",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 404 when option does not exist", async () => {
    product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .post(
        `/api/products/${product.id}/options/00000000-0000-0000-0000-000000000000/values`,
      )
      .send({
        name: "Red",
        position: 0,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when option belongs to another product", async () => {
    product = await createProduct();

    const secondProduct = await createProduct("Books", "books", "Book", "book");

    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${secondProduct.id}/options/${option.id}/values`)
      .send({
        name: "Red",
        position: 0,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("GET /api/products/:productId/options/:optionId/values", () => {
  it("returns option values sorted by position", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    await prisma.optionValue.createMany({
      data: [
        {
          optionId: option.id,
          name: "Blue",
          position: 2,
        },
        {
          optionId: option.id,
          name: "Red",
          position: 0,
        },
        {
          optionId: option.id,
          name: "Green",
          position: 1,
        },
      ],
    });

    const agent = await createAdminAgent();

    const response = await agent.get(
      `/api/products/${product.id}/options/${option.id}/values`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    expect(response.body.map((value) => value.name)).toEqual([
      "Red",
      "Green",
      "Blue",
    ]);
  });

  it("returns 404 when option does not exist", async () => {
    product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent.get(
      `/api/products/${product.id}/options/00000000-0000-0000-0000-000000000000/values`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when option belongs to another product", async () => {
    product = await createProduct();

    const secondProduct = await createProduct("Books", "books", "Book", "book");

    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    const response = await agent.get(
      `/api/products/${secondProduct.id}/options/${option.id}/values`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("GET /api/products/:productId/options/:optionId/values/:valueId", () => {
  it("returns a product option value by id", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const value = await prisma.optionValue.create({
      data: {
        optionId: option.id,
        name: "Red",
        position: 0,
      },
    });

    const response = await request(app).get(
      `/api/products/${product.id}/options/${option.id}/values/${value.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: value.id,
        optionId: option.id,
        name: "Red",
        position: 0,
      }),
    );
  });

  it("returns 404 when value does not exist", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const response = await request(app).get(
      `/api/products/${product.id}/options/${option.id}/values/00000000-0000-0000-0000-000000000000`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when value belongs to another option", async () => {
    product = await createProduct();

    const firstOption = await createProductOption(product.id, "Color");
    const secondOption = await createProductOption(product.id, "Size");

    const value = await prisma.optionValue.create({
      data: {
        optionId: firstOption.id,
        name: "Red",
        position: 0,
      },
    });

    const response = await request(app).get(
      `/api/products/${product.id}/options/${secondOption.id}/values/${value.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("PATCH /api/products/:productId/options/:optionId/values/:valueId", () => {
  it("updates a product option value", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const value = await prisma.optionValue.create({
      data: {
        optionId: option.id,
        name: "Red",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(
        `/api/products/${product.id}/options/${option.id}/values/${value.id}`,
      )
      .send({
        name: "Dark Red",
        position: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: value.id,
        optionId: option.id,
        name: "Dark Red",
        position: 1,
      }),
    );
  });

  it("returns 409 when updating to a duplicate value name", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const firstValue = await prisma.optionValue.create({
      data: {
        optionId: option.id,
        name: "Red",
        position: 0,
      },
    });

    const secondValue = await prisma.optionValue.create({
      data: {
        optionId: option.id,
        name: "Blue",
        position: 1,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(
        `/api/products/${product.id}/options/${option.id}/values/${secondValue.id}`,
      )
      .send({
        name: firstValue.name,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 404 when value does not exist", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    const response = await agent
      .patch(
        `/api/products/${product.id}/options/${option.id}/values/00000000-0000-0000-0000-000000000000`,
      )
      .send({
        name: "Green",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 400 for unknown fields", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const value = await prisma.optionValue.create({
      data: {
        optionId: option.id,
        name: "Red",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(
        `/api/products/${product.id}/options/${option.id}/values/${value.id}`,
      )
      .send({
        unexpected: "value",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for an empty update", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const value = await prisma.optionValue.create({
      data: {
        optionId: option.id,
        name: "Red",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(
        `/api/products/${product.id}/options/${option.id}/values/${value.id}`,
      )
      .send({});

    expect(response.status).toBe(400);

    const unchangedValue = await prisma.optionValue.findUnique({
      where: {
        id: value.id,
      },
    });

    expect(unchangedValue).toEqual(value);
  });
});

describe("DELETE /api/products/:productId/options/:optionId/values/:valueId", () => {
  it("deletes a product option value", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const value = await prisma.optionValue.create({
      data: {
        optionId: option.id,
        name: "Red",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/options/${option.id}/values/${value.id}`,
    );

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const deletedValue = await prisma.optionValue.findUnique({
      where: {
        id: value.id,
      },
    });

    expect(deletedValue).toBeNull();
  });

  it("returns 404 when value does not exist", async () => {
    product = await createProduct();
    option = await createProductOption(product.id);

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/options/${option.id}/values/00000000-0000-0000-0000-000000000000`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when value belongs to another option", async () => {
    product = await createProduct();

    const firstOption = await createProductOption(product.id, "Color");
    const secondOption = await createProductOption(product.id, "Size");

    const value = await prisma.optionValue.create({
      data: {
        optionId: firstOption.id,
        name: "Red",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/options/${secondOption.id}/values/${value.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});
