import prisma from "../lib/prisma.js";

import {
  SHIPPING_COST,
  TAX_RATE,
  RESERVATION_MINUTES,
  ORDER_TRANSACTION_MAX_ATTEMPTS,
} from "../config/order-pricing.js";
import createSerializableTransactionRunner from "../lib/serializable-transaction.js";

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const runSerializableTransaction = createSerializableTransactionRunner({
  transaction: (callback, options) => prisma.$transaction(callback, options),

  maxAttempts: ORDER_TRANSACTION_MAX_ATTEMPTS,
});

const releaseOrderStock = async (tx, orderId) => {
  const items = await tx.orderItem.findMany({
    where: {
      orderId,
    },
    select: {
      variantId: true,
      quantity: true,
    },
  });

  for (const item of items) {
    await tx.variant.update({
      where: {
        id: item.variantId,
      },
      data: {
        stock: {
          increment: item.quantity,
        },
      },
    });
  }
};

const create = async (
  userId,
  { recipientName, shippingAddress, items, expectedTotal },
) => {
  return runSerializableTransaction(async (tx) => {
    // 1. Fetch variants
    const variantIds = items.map((item) => item.variantId);

    const variants = await tx.variant.findMany({
      where: {
        id: {
          in: variantIds,
        },
      },
      include: {
        product: {
          select: {
            title: true,
          },
        },
        optionValues: {
          include: {
            optionValue: {
              include: {
                option: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 2. Check missing variants
    const foundVariantIds = new Set(variants.map((variant) => variant.id));

    const missingVariantIds = variantIds.filter(
      (id) => !foundVariantIds.has(id),
    );

    if (missingVariantIds.length > 0) {
      const error = createError("Some variants were not found", 404);

      error.details = {
        missingVariantIds,
      };

      throw error;
    }

    const variantMap = new Map(
      variants.map((variant) => [variant.id, variant]),
    );

    // 3. Validate expected unit prices
    const priceChanges = [];

    for (const item of items) {
      const variant = variantMap.get(item.variantId);

      if (variant.price !== item.expectedUnitPrice) {
        priceChanges.push({
          variantId: variant.id,
          expectedUnitPrice: item.expectedUnitPrice,
          currentUnitPrice: variant.price,
        });
      }
    }

    if (priceChanges.length > 0) {
      const error = createError("Product prices have changed", 409);

      error.details = {
        priceChanges,
      };

      throw error;
    }

    // 4. Build order items and calculate subtotal
    const orderItems = [];

    let subtotal = 0;

    for (const item of items) {
      const variant = variantMap.get(item.variantId);

      const totalPrice = variant.price * item.quantity;

      if (!Number.isSafeInteger(totalPrice)) {
        throw createError("Order item amount is too large", 400);
      }

      subtotal += totalPrice;

      if (!Number.isSafeInteger(subtotal)) {
        throw createError("Order amount is too large", 400);
      }

      const variantOptions = variant.optionValues
        .map((entry) => ({
          optionName: entry.optionValue.option.name,
          valueName: entry.optionValue.name,
        }))
        .sort((a, b) => a.optionName.localeCompare(b.optionName));

      orderItems.push({
        variantId: variant.id,
        productTitle: variant.product.title,
        sku: variant.sku,
        variantOptions,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice,
      });
    }

    // 5. Calculate shipping, tax and total
    const shippingCost = SHIPPING_COST;

    const tax = Math.round(subtotal * TAX_RATE);

    const total = subtotal + shippingCost + tax;

    if (
      !Number.isSafeInteger(shippingCost) ||
      shippingCost < 0 ||
      !Number.isSafeInteger(tax) ||
      tax < 0 ||
      !Number.isSafeInteger(total) ||
      total < 0
    ) {
      throw createError("Order amount is too large or invalid", 400);
    }

    // 6. Compare expected total with calculated total
    if (total !== expectedTotal) {
      const error = createError("Order total has changed", 409);

      error.details = {
        expectedTotal,
        currentTotal: total,
        subtotal,
        shippingCost,
        tax,
      };

      throw error;
    }

    // 7. Reserve stock
    for (const item of items) {
      const result = await tx.variant.updateMany({
        where: {
          id: item.variantId,
          stock: {
            gte: item.quantity,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (result.count !== 1) {
        throw createError("Insufficient stock", 400);
      }
    }

    // 8. Calculate reservation expiration
    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);

    // 9. Create order
    return tx.order.create({
      data: {
        userId,

        recipientName,
        shippingAddress,

        subtotal,
        shippingCost,
        tax,
        total,

        expiresAt,
        status: "PENDING",

        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
      },
    });
  });
};

const findManyByUserId = async (userId) => {
  return prisma.order.findMany({
    where: {
      userId,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const findById = async (userId, orderId) => {
  return prisma.order.findFirstOrThrow({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: true,
    },
  });
};

const findStatusById = async (orderId) => {
  return prisma.order.findUnique({
    where: {
      id: orderId,
    },
    select: {
      status: true,
    },
  });
};

const findByIdForAdmin = async (orderId) => {
  return prisma.order.findUniqueOrThrow({
    where: {
      id: orderId,
    },
    include: {
      items: true,
    },
  });
};

const cancelOrder = async (userId, orderId) => {
  return runSerializableTransaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw createError("Order not found", 404);
    }

    if (order.status !== "PENDING") {
      throw createError("Only pending orders can be cancelled", 409);
    }

    const result = await tx.order.updateMany({
      where: {
        id: orderId,
        userId,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (result.count !== 1) {
      throw createError("Order status changed concurrently", 409);
    }

    await releaseOrderStock(tx, orderId);

    return tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });
  });
};

const updateStatus = async (orderId, status) => {
  return runSerializableTransaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      throw createError("Order not found", 404);
    }

    const allowedTransitions = {
      PENDING: ["PAID", "CANCELLED"],
      PAID: ["COMPLETED"],
      CANCELLED: [],
      COMPLETED: [],
      EXPIRED: [],
    };

    if (order.status === status) {
      return tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: {
          items: true,
        },
      });
    }

    if (!allowedTransitions[order.status]?.includes(status)) {
      throw createError("Invalid order status transition", 409);
    }

    const where = {
      id: orderId,
      status: order.status,
    };

    if (status === "PAID") {
      where.expiresAt = {
        gt: new Date(),
      };
    }

    const result = await tx.order.updateMany({
      where,
      data: {
        status,
      },
    });

    if (result.count !== 1) {
      throw createError("Order status changed concurrently", 409);
    }

    if (status === "CANCELLED") {
      await releaseOrderStock(tx, orderId);
    }

    return tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: true,
      },
    });
  });
};

const expirePendingOrders = async ({
  now = new Date(),
  batchSize = 100,
} = {}) => {
  return prisma.$transaction(async (tx) => {
    const expiredOrders = await tx.$queryRaw`
      SELECT "id"
      FROM "Order"
      WHERE
        "status" = 'PENDING'::"OrderStatus"
        AND "expiresAt" <= ${now}
      ORDER BY "expiresAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;

    let expiredCount = 0;

    for (const order of expiredOrders) {
      const result = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING",
          expiresAt: {
            lte: now,
          },
        },
        data: {
          status: "EXPIRED",
        },
      });

      if (result.count !== 1) {
        continue;
      }

      await releaseOrderStock(tx, order.id);

      expiredCount++;
    }

    return expiredCount;
  });
};

export default {
  create,
  findManyByUserId,
  findById,
  findStatusById,
  findByIdForAdmin,
  updateStatus,
  cancelOrder,
  expirePendingOrders,
};
