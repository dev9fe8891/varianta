import prisma from "../lib/prisma.js";

const create = async (productId, optionId, data) => {
  await prisma.productOption.findFirstOrThrow({
    where: {
      id: optionId,
      productId,
    },
  });

  return prisma.optionValue.create({
    data: {
      optionId,
      ...data,
    },
  });
};

const findManyByOptionId = async (productId, optionId) => {
  await prisma.productOption.findFirstOrThrow({
    where: {
      id: optionId,
      productId,
    },
  });

  return prisma.optionValue.findMany({
    where: {
      optionId,
    },
    orderBy: {
      position: "asc",
    },
  });
};

const findById = async (productId, optionId, valueId) => {
  return prisma.optionValue.findFirstOrThrow({
    where: {
      id: valueId,
      optionId,
      option: {
        productId,
      },
    },
  });
};

const update = async (productId, optionId, valueId, data) => {
  await findById(productId, optionId, valueId);

  return prisma.optionValue.update({
    where: {
      id: valueId,
    },
    data,
  });
};

const remove = async (productId, optionId, valueId) => {
  await findById(productId, optionId, valueId);

  return prisma.optionValue.delete({
    where: {
      id: valueId,
    },
  });
};

export default {
  create,
  findManyByOptionId,
  findById,
  update,
  remove,
};
