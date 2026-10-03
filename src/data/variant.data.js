import prisma from "../lib/prisma.js";

const create = async (productId, data) => {
  await prisma.product.findUniqueOrThrow({
    where: {
      id: productId,
    },
  });

  return prisma.variant.create({
    data: {
      productId,
      ...data,
    },
  });
};

const findManyByProductId = async (productId) => {
  await prisma.product.findUniqueOrThrow({
    where: {
      id: productId,
    },
  });

  return prisma.variant.findMany({
    where: {
      productId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const findById = async (productId, variantId) => {
  return prisma.variant.findFirstOrThrow({
    where: {
      id: variantId,
      productId,
    },
  });
};

const update = async (productId, variantId, data) => {
  await findById(productId, variantId);

  return prisma.variant.update({
    where: {
      id: variantId,
    },
    data,
  });
};

const remove = async (productId, variantId) => {
  await findById(productId, variantId);

  return prisma.variant.delete({
    where: {
      id: variantId,
    },
  });
};

export default {
  create,
  findManyByProductId,
  findById,
  update,
  remove,
};
