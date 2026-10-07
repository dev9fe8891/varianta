import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { createAdminAgent, createUserAgent } from "./helpers/auth.js";

afterEach(async () => {
  await prisma.order.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: "@example.com",
      },
    },
  });
});

const createVariant = async ({
  price = 100000,
  stock = 10,
  title = "Test Product",
  sku = `SKU-${Date.now()}-${Math.random().toString(36).slice(2)}`,
} = {}) => {
  const category = await prisma.category.create({
    data: {
      name: `Category ${Date.now()}-${Math.random()}`,
      slug: `category-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
  });

  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      title,
      slug: `product-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      basePrice: price,
    },
  });

  const variant = await prisma.variant.create({
    data: {
      productId: product.id,
      sku,
      price,
      stock,
    },
  });

  return { category, product, variant };
};

describe("POST /api/orders", () => {
  it("creates an order for an authenticated user", async () => {
    const agent = await createUserAgent();
    const { variant } = await createVariant({
      price: 250000,
      stock: 10,
    });

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 2,
        },
      ],
    });

    expect(response.status).toBe(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        userId: expect.any(String),
        status: "PENDING",
        total: 500000,
        items: [
          expect.objectContaining({
            variantId: variant.id,
            productTitle: "Test Product",
            sku: variant.sku,
            quantity: 2,
            unitPrice: 250000,
            totalPrice: 500000,
          }),
        ],
      }),
    );
  });

  it("uses the authenticated user as the order owner", async () => {
    const agent = await createUserAgent();
    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    expect(response.status).toBe(201);

    const user = await prisma.user.findFirst({
      where: {
        email: {
          contains: "@example.com",
        },
      },
    });

    expect(response.body.userId).toBe(user.id);
  });

  it("calculates the total from variant prices", async () => {
    const agent = await createUserAgent();

    const first = await createVariant({
      price: 100000,
      stock: 10,
      title: "Product One",
    });

    const second = await createVariant({
      price: 250000,
      stock: 10,
      title: "Product Two",
    });

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: first.variant.id,
          quantity: 2,
        },
        {
          variantId: second.variant.id,
          quantity: 3,
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.total).toBe(950000);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantId: first.variant.id,
          unitPrice: 100000,
          quantity: 2,
          totalPrice: 200000,
        }),
        expect.objectContaining({
          variantId: second.variant.id,
          unitPrice: 250000,
          quantity: 3,
          totalPrice: 750000,
        }),
      ]),
    );
  });

  it("snapshots product title and sku into order items", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      title: "Original Product",
      sku: "ORIGINAL-SKU",
      price: 300000,
    });

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    expect(response.status).toBe(201);

    const item = response.body.items[0];

    expect(item.productTitle).toBe("Original Product");
    expect(item.sku).toBe("ORIGINAL-SKU");
  });

  it("reduces variant stock after creating the order", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      stock: 10,
    });

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 3,
        },
      ],
    });

    expect(response.status).toBe(201);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(7);
  });

  it("returns 401 for unauthenticated users", async () => {
    const { variant } = await createVariant();

    const response = await request(app)
      .post("/api/orders")
      .send({
        items: [
          {
            variantId: variant.id,
            quantity: 1,
          },
        ],
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("returns 404 when the variant does not exist", async () => {
    const agent = await createUserAgent();

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: "00000000-0000-0000-0000-000000000000",
          quantity: 1,
        },
      ],
    });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: "Variant not found",
    });
  });

  it("returns 400 when stock is insufficient", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      stock: 2,
    });

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 3,
        },
      ],
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Insufficient stock",
    });
  });

  it("does not allow the client to set the price", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      price: 100000,
      stock: 10,
    });

    const response = await agent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 2,
        },
      ],
      price: 1,
      total: 1,
    });

    expect(response.status).toBe(400);
  });

  it("does not create the order or change stock when one item has insufficient stock", async () => {
    const userAgent = await createUserAgent();

    const category = await prisma.category.create({
      data: {
        name: "Atomicity Category",
        slug: `atomicity-category-${Date.now()}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Atomicity Product",
        slug: `atomicity-product-${Date.now()}`,
        basePrice: 1000,
      },
    });

    const availableVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `ATOMIC-AVAILABLE-${Date.now()}`,
        price: 1000,
        stock: 10,
      },
    });

    const unavailableVariant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `ATOMIC-UNAVAILABLE-${Date.now()}`,
        price: 2000,
        stock: 1,
      },
    });

    const response = await userAgent.post("/api/orders").send({
      items: [
        {
          variantId: availableVariant.id,
          quantity: 2,
        },
        {
          variantId: unavailableVariant.id,
          quantity: 2,
        },
      ],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Insufficient stock");

    const orderCount = await prisma.order.count();

    expect(orderCount).toBe(0);

    const variants = await prisma.variant.findMany({
      where: {
        id: {
          in: [availableVariant.id, unavailableVariant.id],
        },
      },
      orderBy: {
        sku: "asc",
      },
    });

    expect(
      variants.find((variant) => variant.id === availableVariant.id).stock,
    ).toBe(10);
    expect(
      variants.find((variant) => variant.id === unavailableVariant.id).stock,
    ).toBe(1);
  });

  it("rejects duplicate variant IDs in an order", async () => {
    const userAgent = await createUserAgent();

    const category = await prisma.category.create({
      data: {
        name: "Duplicate Variant Category",
        slug: `duplicate-variant-category-${Date.now()}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Duplicate Variant Product",
        slug: `duplicate-variant-product-${Date.now()}`,
        basePrice: 1000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `DUPLICATE-${Date.now()}`,
        price: 1000,
        stock: 10,
      },
    });

    const response = await userAgent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 2,
        },
        {
          variantId: variant.id,
          quantity: 3,
        },
      ],
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");

    const orderCount = await prisma.order.count();

    expect(orderCount).toBe(0);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });
});

describe("GET /api/orders", () => {
  it("returns only the authenticated user's orders", async () => {
    const userAgent = await createUserAgent();
    const otherUserAgent = await createUserAgent();

    const category = await prisma.category.create({
      data: {
        name: "Ownership Category",
        slug: `ownership-category-${Date.now()}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Ownership Product",
        slug: `ownership-product-${Date.now()}`,
        basePrice: 1000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `OWNERSHIP-${Date.now()}`,
        price: 1000,
        stock: 10,
      },
    });

    await userAgent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    await otherUserAgent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    const response = await userAgent.get("/api/orders");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it("returns 401 for unauthenticated users", async () => {
    const response = await request(app).get("/api/orders");

    expect(response.status).toBe(401);
  });
});

describe("GET /api/orders/:id", () => {
  it("returns an order owned by the authenticated user", async () => {
    const userAgent = await createUserAgent();

    const category = await prisma.category.create({
      data: {
        name: "Order Detail Category",
        slug: `order-detail-category-${Date.now()}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Order Detail Product",
        slug: `order-detail-product-${Date.now()}`,
        basePrice: 1000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `DETAIL-${Date.now()}`,
        price: 1000,
        stock: 10,
      },
    });

    const createResponse = await userAgent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    const orderId = createResponse.body.id;

    const response = await userAgent.get(`/api/orders/${orderId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(orderId);
  });

  it("returns 404 when accessing another user's order", async () => {
    const ownerAgent = await createUserAgent();
    const otherUserAgent = await createUserAgent();

    const category = await prisma.category.create({
      data: {
        name: "Private Order Category",
        slug: `private-order-category-${Date.now()}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Private Order Product",
        slug: `private-order-product-${Date.now()}`,
        basePrice: 1000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `PRIVATE-${Date.now()}`,
        price: 1000,
        stock: 10,
      },
    });

    const createResponse = await ownerAgent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    const orderId = createResponse.body.id;

    const response = await otherUserAgent.get(`/api/orders/${orderId}`);

    expect(response.status).toBe(404);
  });

  it("returns 401 for unauthenticated users", async () => {
    const response = await request(app).get("/api/orders/some-order-id");

    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/orders/:id/status", () => {
  it("allows an admin to update the order status", async () => {
    const adminAgent = await createAdminAgent();
    const userAgent = await createUserAgent();

    const category = await prisma.category.create({
      data: {
        name: "Status Category",
        slug: `status-category-${Date.now()}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "Status Product",
        slug: `status-product-${Date.now()}`,
        basePrice: 1000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `STATUS-${Date.now()}`,
        price: 1000,
        stock: 10,
      },
    });

    const createResponse = await userAgent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    const orderId = createResponse.body.id;

    const response = await adminAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("PAID");
    expect(response.body.id).toBe(orderId);
  });

  it("returns 403 for a regular user", async () => {
    const ownerAgent = await createUserAgent();
    const otherUserAgent = await createUserAgent();

    const category = await prisma.category.create({
      data: {
        name: "User Status Category",
        slug: `user-status-category-${Date.now()}`,
      },
    });

    const product = await prisma.product.create({
      data: {
        categoryId: category.id,
        title: "User Status Product",
        slug: `user-status-product-${Date.now()}`,
        basePrice: 1000,
      },
    });

    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        sku: `USER-STATUS-${Date.now()}`,
        price: 1000,
        stock: 10,
      },
    });

    const createResponse = await ownerAgent.post("/api/orders").send({
      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],
    });

    const orderId = createResponse.body.id;

    const response = await otherUserAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(403);
  });

  it("returns 401 for an unauthenticated user", async () => {
    const response = await request(app)
      .patch("/api/orders/some-order-id/status")
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(401);
  });

  it("returns 404 when the order does not exist", async () => {
    const adminAgent = await createAdminAgent();

    const response = await adminAgent
      .patch("/api/orders/00000000-0000-0000-0000-000000000000/status")
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(404);
  });

  it("rejects an invalid order status", async () => {
    const adminAgent = await createAdminAgent();

    const response = await adminAgent
      .patch("/api/orders/00000000-0000-0000-0000-000000000000/status")
      .send({
        status: "INVALID",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });
});
