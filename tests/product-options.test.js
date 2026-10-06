import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { createAdminAgent } from "./helpers/auth.js";

let product;

afterEach(async () => {
  await prisma.productOption.deleteMany();
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
  const category = await createCategory();

  return prisma.product.create({
    data: {
      categoryId: category.id,
      title: "Phone",
      slug: "phone",
      description: "A smartphone",
      basePrice: 100000,
    },
  });
};

describe("POST /api/products/:productId/options", () => {
  it("creates a product option", async () => {
    product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/options`)
      .send({
        name: "Color",
        position: 0,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        productId: product.id,
        name: "Color",
        position: 0,
      }),
    );

    expect(response.body.id).toEqual(expect.any(String));
  });

  it("returns 409 for duplicate option name", async () => {
    product = await createProduct();

    const agent = await createAdminAgent();

    await agent.post(`/api/products/${product.id}/options`).send({
      name: "Color",
      position: 0,
    });

    const response = await agent
      .post(`/api/products/${product.id}/options`)
      .send({
        name: "Color",
        position: 1,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 400 for invalid data", async () => {
    product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/options`)
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

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/options`)
      .send({
        name: "Color",
        position: 0,
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
      .post("/api/products/00000000-0000-0000-0000-000000000000/options")
      .send({
        name: "Color",
        position: 0,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("allows the same option name for different products", async () => {
    product = await createProduct();

    const secondCategory = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const secondProduct = await prisma.product.create({
      data: {
        categoryId: secondCategory.id,
        title: "Book",
        slug: "book",
        basePrice: 10000,
      },
    });

    await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${secondProduct.id}/options`)
      .send({
        name: "Color",
        position: 0,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        productId: secondProduct.id,
        name: "Color",
        position: 0,
      }),
    );
  });
});

describe("GET /api/products/:productId/options", () => {
  it("returns product options sorted by position", async () => {
    product = await createProduct();

    await prisma.productOption.createMany({
      data: [
        {
          productId: product.id,
          name: "Material",
          position: 2,
        },
        {
          productId: product.id,
          name: "Color",
          position: 0,
        },
        {
          productId: product.id,
          name: "Size",
          position: 1,
        },
      ],
    });

    const response = await request(app).get(
      `/api/products/${product.id}/options`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    expect(response.body.map((option) => option.name)).toEqual([
      "Color",
      "Size",
      "Material",
    ]);
  });

  it("returns 404 when product does not exist", async () => {
    const response = await request(app).get(
      "/api/products/00000000-0000-0000-0000-000000000000/options",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("GET /api/products/:productId/options/:optionId", () => {
  it("returns a product option by id", async () => {
    product = await createProduct();

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const response = await request(app).get(
      `/api/products/${product.id}/options/${option.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: option.id,
        productId: product.id,
        name: "Color",
        position: 0,
      }),
    );
  });

  it("returns 404 when option does not exist", async () => {
    product = await createProduct();

    const response = await request(app).get(
      `/api/products/${product.id}/options/00000000-0000-0000-0000-000000000000`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when option belongs to another product", async () => {
    product = await createProduct();

    const secondCategory = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const secondProduct = await prisma.product.create({
      data: {
        categoryId: secondCategory.id,
        title: "Book",
        slug: "book",
        basePrice: 10000,
      },
    });

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const response = await request(app).get(
      `/api/products/${secondProduct.id}/options/${option.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("PATCH /api/products/:productId/options/:optionId", () => {
  it("updates a product option", async () => {
    product = await createProduct();

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/options/${option.id}`)
      .send({
        name: "Material",
        position: 1,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: option.id,
        productId: product.id,
        name: "Material",
        position: 1,
      }),
    );

    const updatedOption = await prisma.productOption.findUnique({
      where: {
        id: option.id,
      },
    });

    expect(updatedOption.name).toBe("Material");
    expect(updatedOption.position).toBe(1);
  });

  it("returns 409 when updating to a duplicate option name", async () => {
    product = await createProduct();

    const firstOption = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const secondOption = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Size",
        position: 1,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/options/${secondOption.id}`)
      .send({
        name: firstOption.name,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Resource already exists",
    });
  });

  it("returns 404 when option does not exist", async () => {
    product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent
      .patch(
        `/api/products/${product.id}/options/00000000-0000-0000-0000-000000000000`,
      )
      .send({
        name: "Material",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 400 for unknown fields", async () => {
    product = await createProduct();

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/options/${option.id}`)
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

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .patch(`/api/products/${product.id}/options/${option.id}`)
      .send({});

    expect(response.status).toBe(400);

    const unchangedOption = await prisma.productOption.findUnique({
      where: {
        id: option.id,
      },
    });

    expect(unchangedOption).toEqual(option);
  });
});

describe("DELETE /api/products/:productId/options/:optionId", () => {
  it("deletes a product option", async () => {
    product = await createProduct();

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/options/${option.id}`,
    );

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const deletedOption = await prisma.productOption.findUnique({
      where: {
        id: option.id,
      },
    });

    expect(deletedOption).toBeNull();
  });

  it("returns 404 when option does not exist", async () => {
    product = await createProduct();

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/options/00000000-0000-0000-0000-000000000000`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when option belongs to another product", async () => {
    product = await createProduct();

    const secondCategory = await prisma.category.create({
      data: {
        name: "Books",
        slug: "books",
      },
    });

    const secondProduct = await prisma.product.create({
      data: {
        categoryId: secondCategory.id,
        title: "Book",
        slug: "book",
        basePrice: 10000,
      },
    });

    const option = await prisma.productOption.create({
      data: {
        productId: product.id,
        name: "Color",
        position: 0,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${secondProduct.id}/options/${option.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});
