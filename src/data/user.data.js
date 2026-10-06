import prisma from "../lib/prisma.js";

const create = async (data) => {
  return prisma.user.create({
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const findByEmail = async (email) => {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
};

export default {
  create,
  findByEmail,
};
