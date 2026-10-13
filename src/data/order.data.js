import prisma from "../lib/prisma.js";

const create = async (userId, items) => {
  return prisma.$transaction(async (tx) => {
    const variantIds = [...new Set(items.map((item) => item.variantId))];

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
      },
    });

    if (variants.length !== variantIds.length) {
      const error = new Error("Variant not found");
      error.statusCode = 404;
      throw error;
    }

    const variantMap = new Map(
      variants.map((variant) => [variant.id, variant]),
    );

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const variant = variantMap.get(item.variantId);
      const totalPrice = variant.price * item.quantity;

      orderItems.push({
        variantId: variant.id,
        productTitle: variant.product.title,
        sku: variant.sku,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice,
      });

      total += totalPrice;
    }

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
        const error = new Error("Insufficient stock");
        error.statusCode = 400;
        throw error;
      }
    }

    return tx.order.create({
      data: {
        userId,
        total,
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

const updateStatus = async (orderId, currentStatus, status) => {
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: currentStatus,
    },
    data: {
      status,
    },
  });

  if (result.count === 0) {
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
      },
    });

    if (!order) {
      const error = new Error("Order not found");
      error.statusCode = 404;
      throw error;
    }

    const error = new Error("Order status changed concurrently");
    error.statusCode = 409;
    throw error;
  }

  return findByIdForAdmin(orderId);
};

export default {
  create,
  findManyByUserId,
  findById,
  findStatusById,
  findByIdForAdmin,
  updateStatus,
};
