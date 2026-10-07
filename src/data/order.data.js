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

const updateStatus = async (orderId, status) => {
  return prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status,
    },
    include: {
      items: true,
    },
  });
};

export default {
  create,
  findManyByUserId,
  findById,
  updateStatus,
};
