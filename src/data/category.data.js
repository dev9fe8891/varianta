import prisma from "../lib/prisma.js";

const create = async (data) => {
  return prisma.category.create({
    data,
  });
};

const update = async (id, data) => {
  return prisma.category.update({
    where: { id },
    data,
  });
};

const findMany = async () => {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
};

const findById = async (id) => {
  return prisma.category.findUnique({
    where: { id },
  });
};

const remove = async (id) => {
  return prisma.category.delete({
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
