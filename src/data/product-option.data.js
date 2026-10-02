import prisma from "../lib/prisma.js";

const create = async (productId, data) => {
  return prisma.productOption.create({
    data: {
      productId,
      ...data,
    },
  });
};

const findManyByProductId = async (productId) => {
  return prisma.productOption.findMany({
    where: {
      productId,
    },
    orderBy: {
      position: "asc",
    },
  });
};

const findById = async (productId, optionId) => {
  return prisma.productOption.findFirstOrThrow({
    where: {
      id: optionId,
      productId,
    },
  });
};

const update = async (productId, optionId, data) => {
  await findById(productId, optionId);

  return prisma.productOption.update({
    where: {
      id: optionId,
    },
    data,
  });
};

const remove = async (productId, optionId) => {
  await findById(productId, optionId);

  return prisma.productOption.delete({
    where: {
      id: optionId,
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
