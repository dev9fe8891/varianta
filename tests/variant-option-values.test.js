import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { createAdminAgent } from "./helpers/auth.js";

let category;
let product;
let variant;
let colorOption;
let sizeOption;

afterEach(async () => {
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
  category = await createCategory(categoryName, categorySlug);

  return prisma.product.create({
    data: {
      categoryId: category.id,
      title: productTitle,
      slug: productSlug,
      basePrice: 100000,
    },
  });
};

const createVariant = async (productId, sku = "PHONE-RED-M") => {
  return prisma.variant.create({
    data: {
      productId,
      sku,
      price: 120000,
      stock: 10,
    },
  });
};

const createProductOption = async (productId, name, position = 0) => {
  return prisma.productOption.create({
    data: {
      productId,
      name,
      position,
    },
  });
};

const createOptionValue = async (optionId, name, position = 0) => {
  return prisma.optionValue.create({
    data: {
      optionId,
      name,
      position,
    },
  });
};

describe("GET /api/products/:productId/variants/:variantId/option-values", () => {
  it("returns option values assigned to a variant", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");
    sizeOption = await createProductOption(product.id, "Size", 1);

    const redValue = await createOptionValue(colorOption.id, "Red");
    const mediumValue = await createOptionValue(sizeOption.id, "M");

    await prisma.variantOptionValue.createMany({
      data: [
        {
          variantId: variant.id,
          optionValueId: redValue.id,
        },
        {
          variantId: variant.id,
          optionValueId: mediumValue.id,
        },
      ],
    });

    const response = await request(app).get(
      `/api/products/${product.id}/variants/${variant.id}/option-values`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantId: variant.id,
          optionValueId: redValue.id,
          optionValue: expect.objectContaining({
            id: redValue.id,
            name: "Red",
            option: expect.objectContaining({
              id: colorOption.id,
              name: "Color",
            }),
          }),
        }),
        expect.objectContaining({
          variantId: variant.id,
          optionValueId: mediumValue.id,
          optionValue: expect.objectContaining({
            id: mediumValue.id,
            name: "M",
            option: expect.objectContaining({
              id: sizeOption.id,
              name: "Size",
            }),
          }),
        }),
      ]),
    );
  });

  it("returns an empty array when variant has no option values", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    const response = await request(app).get(
      `/api/products/${product.id}/variants/${variant.id}/option-values`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("returns 404 when variant does not exist", async () => {
    product = await createProduct();

    const response = await request(app).get(
      `/api/products/${product.id}/variants/00000000-0000-0000-0000-000000000000/option-values`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when variant belongs to another product", async () => {
    product = await createProduct();

    const secondProduct = await createProduct("Books", "books", "Book", "book");

    variant = await createVariant(secondProduct.id, "BOOK-001");

    const response = await request(app).get(
      `/api/products/${product.id}/variants/${variant.id}/option-values`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("POST /api/products/:productId/variants/:variantId/option-values", () => {
  it("assigns an option value to a variant", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: redValue.id,
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        variantId: variant.id,
        optionValueId: redValue.id,
        optionValue: expect.objectContaining({
          id: redValue.id,
          name: "Red",
          option: expect.objectContaining({
            id: colorOption.id,
            name: "Color",
          }),
        }),
      }),
    );
  });

  it("returns 409 when variant already has an option value from the same option", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");

    const redValue = await createOptionValue(colorOption.id, "Red");
    const blueValue = await createOptionValue(colorOption.id, "Blue", 1);

    await prisma.variantOptionValue.create({
      data: {
        variantId: variant.id,
        optionValueId: redValue.id,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: blueValue.id,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Variant already has an option value from this option",
    });
  });

  it("returns 409 when assigning the same option value twice", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    await prisma.variantOptionValue.create({
      data: {
        variantId: variant.id,
        optionValueId: redValue.id,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: redValue.id,
      });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      message: "Variant already has an option value from this option",
    });
  });

  it("allows option values from different options", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");
    sizeOption = await createProductOption(product.id, "Size", 1);

    const redValue = await createOptionValue(colorOption.id, "Red");
    const mediumValue = await createOptionValue(sizeOption.id, "M");

    const agent = await createAdminAgent();

    const firstResponse = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: redValue.id,
      });

    const secondResponse = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: mediumValue.id,
      });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    const relationships = await prisma.variantOptionValue.findMany({
      where: {
        variantId: variant.id,
      },
    });

    expect(relationships).toHaveLength(2);
  });

  it("returns 400 for invalid data", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: "invalid-id",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 400 for unknown fields", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: redValue.id,
        unexpected: "value",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Validation failed",
    });
  });

  it("returns 404 when variant does not exist", async () => {
    product = await createProduct();

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent
      .post(
        `/api/products/${product.id}/variants/00000000-0000-0000-0000-000000000000/option-values`,
      )
      .send({
        optionValueId: redValue.id,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when variant belongs to another product", async () => {
    product = await createProduct();

    const secondProduct = await createProduct("Books", "books", "Book", "book");

    variant = await createVariant(secondProduct.id, "BOOK-001");

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: redValue.id,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when option value does not exist", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: "00000000-0000-0000-0000-000000000000",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when option value belongs to another product", async () => {
    product = await createProduct();

    const secondProduct = await createProduct("Books", "books", "Book", "book");

    variant = await createVariant(product.id);

    colorOption = await createProductOption(secondProduct.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent
      .post(`/api/products/${product.id}/variants/${variant.id}/option-values`)
      .send({
        optionValueId: redValue.id,
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});

describe("DELETE /api/products/:productId/variants/:variantId/option-values/:optionValueId", () => {
  it("removes an option value from a variant", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    await prisma.variantOptionValue.create({
      data: {
        variantId: variant.id,
        optionValueId: redValue.id,
      },
    });

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/variants/${variant.id}/option-values/${redValue.id}`,
    );

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const relationship = await prisma.variantOptionValue.findUnique({
      where: {
        variantId_optionValueId: {
          variantId: variant.id,
          optionValueId: redValue.id,
        },
      },
    });

    expect(relationship).toBeNull();
  });

  it("returns 404 when relationship does not exist", async () => {
    product = await createProduct();
    variant = await createVariant(product.id);

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/variants/${variant.id}/option-values/${redValue.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when variant does not exist", async () => {
    product = await createProduct();

    colorOption = await createProductOption(product.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/variants/00000000-0000-0000-0000-000000000000/option-values/${redValue.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });

  it("returns 404 when variant belongs to another product", async () => {
    product = await createProduct();

    const secondProduct = await createProduct("Books", "books", "Book", "book");

    variant = await createVariant(secondProduct.id, "BOOK-001");

    colorOption = await createProductOption(secondProduct.id, "Color");
    const redValue = await createOptionValue(colorOption.id, "Red");

    const agent = await createAdminAgent();

    const response = await agent.delete(
      `/api/products/${product.id}/variants/${variant.id}/option-values/${redValue.id}`,
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Resource not found",
    });
  });
});
