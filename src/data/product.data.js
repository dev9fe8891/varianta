import prisma from "../lib/prisma.js";

const create = async (data) => {
  return prisma.product.create({
    data,
  });
};

const update = async (id, data) => {
  return prisma.product.update({
    where: { id },
    data,
  });
};

const findMany = async ({ where, sort, order, skip, take }) => {
  const orderBy = [
    {
      [sort]: order,
    },
    {
      id: "asc",
    },
  ];

  const [products, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take,
    }),

    prisma.product.count({
      where,
    }),
  ]);

  return {
    products,
    total,
  };
};

const findById = async (id) => {
  return prisma.product.findUniqueOrThrow({
    where: { id },
  });
};

const remove = async (id) => {
  return prisma.product.delete({
    where: { id },
  });
};

export default {
  create,
  update,
  findMany,
  findById,
  remove,
};
