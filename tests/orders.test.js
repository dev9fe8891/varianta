import { afterEach, describe, expect, it } from "vitest";

import prisma from "../src/lib/prisma.js";

import { SHIPPING_COST, TAX_RATE } from "../src/config/order-pricing.js";

import orderData from "../src/data/order.data.js";

import { createAdminAgent, createUserAgent } from "./helpers/auth.js";

import { apiRequest } from "./helpers/request.js";

// --------------------------------------------------
// Cleanup
// --------------------------------------------------

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

// --------------------------------------------------
// Test Helpers
// --------------------------------------------------

const uniqueValue = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createVariant = async ({
  price = 100000,
  stock = 10,
  title = "Test Product",
  sku = `SKU-${uniqueValue()}`,
} = {}) => {
  const unique = uniqueValue();

  const category = await prisma.category.create({
    data: {
      name: `Category ${unique}`,
      slug: `category-${unique}`,
    },
  });

  const product = await prisma.product.create({
    data: {
      categoryId: category.id,
      title,
      slug: `product-${unique}`,
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

  return {
    category,
    product,
    variant,
  };
};

const createVariantWithOptions = async ({
  price = 100000,
  stock = 10,
} = {}) => {
  const result = await createVariant({
    price,
    stock,
  });

  const option = await prisma.productOption.create({
    data: {
      productId: result.product.id,
      name: "Color",
      position: 1,
    },
  });

  const optionValue = await prisma.optionValue.create({
    data: {
      optionId: option.id,
      name: "Black",
      position: 1,
    },
  });

  await prisma.variantOptionValue.create({
    data: {
      variantId: result.variant.id,
      optionValueId: optionValue.id,
    },
  });

  return {
    ...result,
    option,
    optionValue,
  };
};

const calculateOrderAmounts = (items) => {
  const subtotal = items.reduce(
    (sum, { variant, quantity }) => sum + variant.price * quantity,
    0,
  );

  const shippingCost = SHIPPING_COST;

  const tax = Math.round(subtotal * TAX_RATE);

  const total = subtotal + shippingCost + tax;

  return {
    subtotal,
    shippingCost,
    tax,
    total,
  };
};

const createOrderPayload = (
  items,
  {
    recipientName = "Test Recipient",
    shippingAddress = "123 Test Street, Test City",
  } = {},
) => {
  const amounts = calculateOrderAmounts(items);

  return {
    recipientName,
    shippingAddress,

    items: items.map(({ variant, quantity }) => ({
      variantId: variant.id,
      quantity,
      expectedUnitPrice: variant.price,
    })),

    expectedTotal: amounts.total,
  };
};

const createOrderForStatusTest = async (status = "PENDING") => {
  const adminAgent = await createAdminAgent();

  const userAgent = await createUserAgent();

  const { variant } = await createVariant();

  const createResponse = await userAgent.post("/api/orders").send(
    createOrderPayload([
      {
        variant,
        quantity: 1,
      },
    ]),
  );

  if (createResponse.status !== 201) {
    throw new Error(
      `Failed to create test order: ${JSON.stringify(createResponse.body)}`,
    );
  }

  const orderId = createResponse.body.id;

  if (status !== "PENDING") {
    await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
    });
  }

  return {
    adminAgent,
    userAgent,
    orderId,
    variant,
  };
};

// --------------------------------------------------
// POST /api/orders
// --------------------------------------------------

describe("POST /api/orders", () => {
  it("creates an order for an authenticated user", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      price: 250000,
      stock: 10,
    });

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 2,
        },
      ]),
    );

    const amounts = calculateOrderAmounts([
      {
        variant,
        quantity: 2,
      },
    ]);

    expect(response.status).toBe(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        userId: expect.any(String),
        status: "PENDING",

        recipientName: "Test Recipient",
        shippingAddress: "123 Test Street, Test City",

        subtotal: amounts.subtotal,
        shippingCost: amounts.shippingCost,
        tax: amounts.tax,
        total: amounts.total,
        expiresAt: expect.any(String),
      }),
    );

    expect(response.body.items).toHaveLength(1);

    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        variantId: variant.id,
        productTitle: "Test Product",
        sku: variant.sku,
        quantity: 2,
        unitPrice: 250000,
        totalPrice: 500000,
        variantOptions: [],
      }),
    );
  });

  it("uses the authenticated user as the order owner", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

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

  it("calculates subtotal, shipping, tax and total on the server", async () => {
    const agent = await createUserAgent();

    const first = await createVariant({
      price: 100000,
    });

    const second = await createVariant({
      price: 250000,
    });

    const items = [
      {
        variant: first.variant,
        quantity: 2,
      },
      {
        variant: second.variant,
        quantity: 3,
      },
    ];

    const response = await agent
      .post("/api/orders")
      .send(createOrderPayload(items));

    const amounts = calculateOrderAmounts(items);

    expect(response.status).toBe(201);

    expect(response.body).toEqual(expect.objectContaining(amounts));

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantId: first.variant.id,
          quantity: 2,
          unitPrice: 100000,
          totalPrice: 200000,
        }),

        expect.objectContaining({
          variantId: second.variant.id,
          quantity: 3,
          unitPrice: 250000,
          totalPrice: 750000,
        }),
      ]),
    );
  });

  it("snapshots product title and SKU into order items", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      title: "Original Product",
      sku: "ORIGINAL-SKU",
      price: 300000,
    });

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

    expect(response.status).toBe(201);

    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        productTitle: "Original Product",
        sku: "ORIGINAL-SKU",
      }),
    );
  });

  it("snapshots variant option names and values", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariantWithOptions();

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

    expect(response.status).toBe(201);

    expect(response.body.items[0].variantOptions).toEqual([
      {
        optionName: "Color",
        valueName: "Black",
      },
    ]);
  });

  it("reduces variant stock after creating the order", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      stock: 10,
    });

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 3,
        },
      ]),
    );

    expect(response.status).toBe(201);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(7);
  });

  it("creates a pending order with an expiration time", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const beforeCreate = Date.now();

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 3,
        },
      ]),
    );

    const afterCreate = Date.now();

    expect(response.status).toBe(201);

    expect(response.body.status).toBe("PENDING");

    const expiresAt = new Date(response.body.expiresAt).getTime();

    expect(expiresAt).toBeGreaterThan(beforeCreate);

    expect(expiresAt).toBeGreaterThan(afterCreate);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(7);
  });

  it("returns 401 for unauthenticated users", async () => {
    const { variant } = await createVariant();

    const response = await apiRequest.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      message: "Authentication required",
    });
  });

  it("returns missing variant IDs", async () => {
    const agent = await createUserAgent();

    const missingVariantIds = [
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ];

    const response = await agent.post("/api/orders").send({
      recipientName: "Test Recipient",
      shippingAddress: "123 Test Street, Test City",

      items: missingVariantIds.map((variantId) => ({
        variantId,
        quantity: 1,
        expectedUnitPrice: 100000,
      })),

      expectedTotal: 200000 + SHIPPING_COST + Math.round(200000 * TAX_RATE),
    });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      message: "Some variants were not found",
      details: {
        missingVariantIds,
      },
    });

    expect(await prisma.order.count()).toBe(0);
  });

  it("returns 409 when a variant price has changed", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      price: 100000,
      stock: 10,
    });

    const payload = createOrderPayload([
      {
        variant,
        quantity: 2,
      },
    ]);

    await prisma.variant.update({
      where: {
        id: variant.id,
      },
      data: {
        price: 120000,
      },
    });

    const response = await agent.post("/api/orders").send(payload);

    expect(response.status).toBe(409);

    expect(response.body).toEqual({
      message: "Product prices have changed",
      details: {
        priceChanges: [
          {
            variantId: variant.id,
            expectedUnitPrice: 100000,
            currentUnitPrice: 120000,
          },
        ],
      },
    });

    expect(await prisma.order.count()).toBe(0);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });

  it("returns 409 when expected total does not match", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      price: 100000,
      stock: 10,
    });

    const payload = createOrderPayload([
      {
        variant,
        quantity: 2,
      },
    ]);

    payload.expectedTotal += 1000;

    const response = await agent.post("/api/orders").send(payload);

    expect(response.status).toBe(409);

    expect(response.body).toEqual({
      message: "Order total has changed",
      details: {
        expectedTotal: payload.expectedTotal,
        currentTotal: 200000 + SHIPPING_COST + Math.round(200000 * TAX_RATE),
        subtotal: 200000,
        shippingCost: SHIPPING_COST,
        tax: Math.round(200000 * TAX_RATE),
      },
    });

    expect(await prisma.order.count()).toBe(0);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });

  it("returns 400 when stock is insufficient", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant({
      stock: 2,
    });

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 3,
        },
      ]),
    );

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Insufficient stock");

    expect(await prisma.order.count()).toBe(0);
  });

  it("rolls back all stock changes when one item has insufficient stock", async () => {
    const agent = await createUserAgent();

    const first = await createVariant({
      price: 100000,
      stock: 10,
    });

    const second = await createVariant({
      price: 200000,
      stock: 1,
    });

    const response = await agent.post("/api/orders").send(
      createOrderPayload([
        {
          variant: first.variant,
          quantity: 2,
        },
        {
          variant: second.variant,
          quantity: 2,
        },
      ]),
    );

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Insufficient stock");

    expect(await prisma.order.count()).toBe(0);

    const updatedFirst = await prisma.variant.findUnique({
      where: {
        id: first.variant.id,
      },
    });

    const updatedSecond = await prisma.variant.findUnique({
      where: {
        id: second.variant.id,
      },
    });

    expect(updatedFirst.stock).toBe(10);

    expect(updatedSecond.stock).toBe(1);
  });

  it("rejects duplicate variant IDs", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send({
      recipientName: "Test Recipient",
      shippingAddress: "123 Test Street, Test City",

      items: [
        {
          variantId: variant.id,
          quantity: 1,
          expectedUnitPrice: variant.price,
        },
        {
          variantId: variant.id,
          quantity: 2,
          expectedUnitPrice: variant.price,
        },
      ],

      expectedTotal: 100000,
    });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Validation failed");

    expect(await prisma.order.count()).toBe(0);
  });

  it("rejects missing expectedTotal", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send({
      recipientName: "Test Recipient",
      shippingAddress: "123 Test Street, Test City",

      items: [
        {
          variantId: variant.id,
          quantity: 1,
          expectedUnitPrice: variant.price,
        },
      ],
    });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Validation failed");
  });

  it("rejects missing expectedUnitPrice", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send({
      recipientName: "Test Recipient",
      shippingAddress: "123 Test Street, Test City",

      items: [
        {
          variantId: variant.id,
          quantity: 1,
        },
      ],

      expectedTotal: 100000,
    });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Validation failed");
  });

  it("rejects negative expectedUnitPrice", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send({
      recipientName: "Test Recipient",
      shippingAddress: "123 Test Street, Test City",

      items: [
        {
          variantId: variant.id,
          quantity: 1,
          expectedUnitPrice: -100,
        },
      ],

      expectedTotal: 100000,
    });

    expect(response.status).toBe(400);
  });

  it("rejects negative expectedTotal", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send({
      recipientName: "Test Recipient",
      shippingAddress: "123 Test Street, Test City",

      items: [
        {
          variantId: variant.id,
          quantity: 1,
          expectedUnitPrice: variant.price,
        },
      ],

      expectedTotal: -1,
    });

    expect(response.status).toBe(400);
  });

  it("rejects an empty items array", async () => {
    const agent = await createUserAgent();

    const response = await agent.post("/api/orders").send({
      items: [],
      expectedTotal: 0,
    });

    expect(response.status).toBe(400);
  });

  it("rejects additional client-supplied financial fields", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const response = await agent.post("/api/orders").send({
      ...createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),

      subtotal: 1,
      shippingCost: 1,
      tax: 1,
      total: 1,
    });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Validation failed");

    expect(await prisma.order.count()).toBe(0);
  });

  it("prevents overselling with concurrent order requests", async () => {
    const firstAgent = await createUserAgent();

    const secondAgent = await createUserAgent();

    const { variant } = await createVariant({
      price: 100000,
      stock: 1,
    });

    const payload = createOrderPayload([
      {
        variant,
        quantity: 1,
      },
    ]);

    const [firstResponse, secondResponse] = await Promise.all([
      firstAgent.post("/api/orders").send(payload),

      secondAgent.post("/api/orders").send(payload),
    ]);

    const responses = [firstResponse, secondResponse];

    expect(
      responses.filter((response) => response.status === 201),
    ).toHaveLength(1);

    expect(
      responses.some((response) => [400, 409].includes(response.status)),
    ).toBe(true);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(0);

    expect(await prisma.order.count()).toBe(1);
  });

  it("snapshots recipient name and shipping address", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const payload = createOrderPayload(
      [
        {
          variant,
          quantity: 1,
        },
      ],
      {
        recipientName: "John Doe",
        shippingAddress: "123 Main Street, London",
      },
    );

    const response = await agent.post("/api/orders").send(payload);

    expect(response.status).toBe(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        recipientName: "John Doe",
        shippingAddress: "123 Main Street, London",
      }),
    );

    const savedOrder = await prisma.order.findUnique({
      where: {
        id: response.body.id,
      },
    });

    expect(savedOrder.recipientName).toBe("John Doe");

    expect(savedOrder.shippingAddress).toBe("123 Main Street, London");
  });

  it("rejects a missing recipient name", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const { recipientName, ...payload } = createOrderPayload([
      {
        variant,
        quantity: 1,
      },
    ]);

    const response = await agent.post("/api/orders").send(payload);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Validation failed");

    expect(await prisma.order.count()).toBe(0);
  });

  it("rejects an empty shipping address", async () => {
    const agent = await createUserAgent();

    const { variant } = await createVariant();

    const payload = createOrderPayload(
      [
        {
          variant,
          quantity: 1,
        },
      ],
      {
        shippingAddress: "   ",
      },
    );

    const response = await agent.post("/api/orders").send(payload);

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Validation failed");

    expect(await prisma.order.count()).toBe(0);
  });
});

// --------------------------------------------------
// GET /api/orders
// --------------------------------------------------

describe("GET /api/orders", () => {
  it("returns only the authenticated user's orders", async () => {
    const userAgent = await createUserAgent();

    const otherUserAgent = await createUserAgent();

    const { variant } = await createVariant({
      stock: 10,
    });

    const firstResponse = await userAgent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

    const secondResponse = await otherUserAgent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

    expect(firstResponse.status).toBe(201);

    expect(secondResponse.status).toBe(201);

    const response = await userAgent.get("/api/orders");

    expect(response.status).toBe(200);

    expect(response.body).toHaveLength(1);

    expect(response.body[0].id).toBe(firstResponse.body.id);
  });

  it("returns 401 for unauthenticated users", async () => {
    const response = await apiRequest.get("/api/orders");

    expect(response.status).toBe(401);
  });
});

// --------------------------------------------------
// GET /api/orders/:id
// --------------------------------------------------

describe("GET /api/orders/:id", () => {
  it("returns an order owned by the authenticated user", async () => {
    const userAgent = await createUserAgent();

    const { variant } = await createVariant();

    const createResponse = await userAgent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

    expect(createResponse.status).toBe(201);

    const orderId = createResponse.body.id;

    const response = await userAgent.get(`/api/orders/${orderId}`);

    expect(response.status).toBe(200);

    expect(response.body.id).toBe(orderId);
  });

  it("returns 404 when accessing another user's order", async () => {
    const ownerAgent = await createUserAgent();

    const otherUserAgent = await createUserAgent();

    const { variant } = await createVariant();

    const createResponse = await ownerAgent.post("/api/orders").send(
      createOrderPayload([
        {
          variant,
          quantity: 1,
        },
      ]),
    );

    const orderId = createResponse.body.id;

    const response = await otherUserAgent.get(`/api/orders/${orderId}`);

    expect(response.status).toBe(404);
  });

  it("returns 401 for unauthenticated users", async () => {
    const response = await apiRequest.get(
      "/api/orders/00000000-0000-0000-0000-000000000001",
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid order ID format", async () => {
    const agent = await createUserAgent();

    const response = await agent.get("/api/orders/not-a-uuid");

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      message: "Invalid ID format",
    });
  });
});

// --------------------------------------------------
// POST /api/orders/:id/cancel
// --------------------------------------------------

describe("POST /api/orders/:id/cancel", () => {
  it("cancels a pending order and restores stock", async () => {
    const { userAgent, orderId, variant } = await createOrderForStatusTest();

    const response = await userAgent.post(`/api/orders/${orderId}/cancel`);

    expect(response.status).toBe(200);

    expect(response.body.status).toBe("CANCELLED");

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });

  it("does not restore stock twice when cancelling twice", async () => {
    const { userAgent, orderId, variant } = await createOrderForStatusTest();

    const firstResponse = await userAgent.post(`/api/orders/${orderId}/cancel`);

    expect(firstResponse.status).toBe(200);

    const secondResponse = await userAgent.post(
      `/api/orders/${orderId}/cancel`,
    );

    expect(secondResponse.status).toBe(409);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });

  it("does not allow another user to cancel the order", async () => {
    const { orderId } = await createOrderForStatusTest();

    const otherUserAgent = await createUserAgent();

    const response = await otherUserAgent.post(`/api/orders/${orderId}/cancel`);

    expect(response.status).toBe(404);
  });

  it("does not allow cancelling a paid order", async () => {
    const { userAgent, orderId } = await createOrderForStatusTest("PAID");

    const response = await userAgent.post(`/api/orders/${orderId}/cancel`);

    expect(response.status).toBe(409);
  });

  it("returns 401 for unauthenticated users", async () => {
    const response = await apiRequest.post(
      "/api/orders/00000000-0000-0000-0000-000000000001/cancel",
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for an invalid order ID", async () => {
    const agent = await createUserAgent();

    const response = await agent.post("/api/orders/not-a-uuid/cancel");

    expect(response.status).toBe(400);
  });
});

// --------------------------------------------------
// PATCH /api/orders/:id/status
// --------------------------------------------------

describe("PATCH /api/orders/:id/status", () => {
  it("allows an admin to update PENDING to PAID", async () => {
    const { adminAgent, orderId } = await createOrderForStatusTest();

    const response = await adminAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(200);

    expect(response.body.status).toBe("PAID");

    expect(response.body.id).toBe(orderId);
  });

  it("allows an admin to update PAID to COMPLETED", async () => {
    const { adminAgent, orderId } = await createOrderForStatusTest("PAID");

    const response = await adminAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "COMPLETED",
      });

    expect(response.status).toBe(200);

    expect(response.body.status).toBe("COMPLETED");
  });

  it("restores stock when an admin cancels a pending order", async () => {
    const { adminAgent, orderId, variant } = await createOrderForStatusTest();

    const response = await adminAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "CANCELLED",
      });

    expect(response.status).toBe(200);

    expect(response.body.status).toBe("CANCELLED");

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });

  it("returns 403 for a regular user", async () => {
    const { orderId } = await createOrderForStatusTest();

    const userAgent = await createUserAgent();

    const response = await userAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(403);
  });

  it("returns 401 for unauthenticated users", async () => {
    const response = await apiRequest
      .patch("/api/orders/00000000-0000-0000-0000-000000000001/status")
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(401);
  });

  it("returns 404 when the order does not exist", async () => {
    const adminAgent = await createAdminAgent();

    const response = await adminAgent
      .patch("/api/orders/00000000-0000-4000-8000-000000000001/status")
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(404);
  });

  it("rejects an invalid order status", async () => {
    const { adminAgent, orderId } = await createOrderForStatusTest();

    const response = await adminAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "INVALID",
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Validation failed");
  });

  it.each([
    ["PENDING", "COMPLETED"],
    ["PAID", "CANCELLED"],
    ["CANCELLED", "PAID"],
    ["COMPLETED", "PAID"],
    ["EXPIRED", "PAID"],
  ])(
    "rejects the invalid transition %s -> %s",
    async (currentStatus, targetStatus) => {
      const { adminAgent, orderId } = await createOrderForStatusTest();

      if (currentStatus !== "PENDING") {
        await prisma.order.update({
          where: {
            id: orderId,
          },
          data: {
            status: currentStatus,
          },
        });
      }

      const response = await adminAgent
        .patch(`/api/orders/${orderId}/status`)
        .send({
          status: targetStatus,
        });

      expect(response.status).toBe(409);

      const order = await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          status: true,
        },
      });

      expect(order.status).toBe(currentStatus);
    },
  );

  it("allows submitting the current status again", async () => {
    const { adminAgent, orderId } = await createOrderForStatusTest();

    const response = await adminAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "PENDING",
      });

    expect(response.status).toBe(200);

    expect(response.body.status).toBe("PENDING");
  });

  it("does not allow paying an expired pending order", async () => {
    const { adminAgent, orderId } = await createOrderForStatusTest();

    await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const response = await adminAgent
      .patch(`/api/orders/${orderId}/status`)
      .send({
        status: "PAID",
      });

    expect(response.status).toBe(409);

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        status: true,
      },
    });

    expect(order.status).toBe("PENDING");
  });
});

// --------------------------------------------------
// Order Expiration Worker
// --------------------------------------------------

describe("Order Expiration", () => {
  it("expires pending orders and restores stock", async () => {
    const { orderId, variant } = await createOrderForStatusTest();

    await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const expiredCount = await orderData.expirePendingOrders({
      now: new Date(),
      batchSize: 100,
    });

    expect(expiredCount).toBe(1);

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    expect(order.status).toBe("EXPIRED");

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });

  it("does not expire orders before expiresAt", async () => {
    const { orderId, variant } = await createOrderForStatusTest();

    const expiredCount = await orderData.expirePendingOrders({
      now: new Date(),
      batchSize: 100,
    });

    expect(expiredCount).toBe(0);

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    expect(order.status).toBe("PENDING");

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(9);
  });

  it("does not restore stock twice for an expired order", async () => {
    const { orderId, variant } = await createOrderForStatusTest();

    await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const firstCount = await orderData.expirePendingOrders({
      now: new Date(),
      batchSize: 100,
    });

    const secondCount = await orderData.expirePendingOrders({
      now: new Date(),
      batchSize: 100,
    });

    expect(firstCount).toBe(1);

    expect(secondCount).toBe(0);

    const updatedVariant = await prisma.variant.findUnique({
      where: {
        id: variant.id,
      },
    });

    expect(updatedVariant.stock).toBe(10);
  });

  it("processes expired orders in batches", async () => {
    const orders = [];

    for (let i = 0; i < 3; i++) {
      const { orderId } = await createOrderForStatusTest();

      await prisma.order.update({
        where: {
          id: orderId,
        },
        data: {
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      orders.push(orderId);
    }

    const firstCount = await orderData.expirePendingOrders({
      now: new Date(),
      batchSize: 2,
    });

    const secondCount = await orderData.expirePendingOrders({
      now: new Date(),
      batchSize: 2,
    });

    expect(firstCount).toBe(2);

    expect(secondCount).toBe(1);

    const expiredOrders = await prisma.order.count({
      where: {
        id: {
          in: orders,
        },
        status: "EXPIRED",
      },
    });

    expect(expiredOrders).toBe(3);
  });
});
