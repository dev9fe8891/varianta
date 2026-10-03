import prisma from "../lib/prisma.js";

const findVariant = async (productId, variantId) => {
  return prisma.variant.findFirstOrThrow({
    where: {
      id: variantId,
      productId,
    },
  });
};

const findManyByVariantId = async (productId, variantId) => {
  await findVariant(productId, variantId);

  return prisma.variantOptionValue.findMany({
    where: {
      variantId,
    },
    include: {
      optionValue: {
        include: {
          option: true,
        },
      },
    },
  });
};

const create = async (productId, variantId, optionValueId) => {
  await findVariant(productId, variantId);

  const optionValue = await prisma.optionValue.findFirstOrThrow({
    where: {
      id: optionValueId,
      option: {
        productId,
      },
    },
  });

  const existingOptionValue = await prisma.variantOptionValue.findFirst({
    where: {
      variantId,
      optionValue: {
        optionId: optionValue.optionId,
      },
    },
  });

  if (existingOptionValue) {
    const error = new Error(
      "Variant already has an option value from this option",
    );
    error.statusCode = 409;
    throw error;
  }

  return prisma.variantOptionValue.create({
    data: {
      variantId,
      optionValueId,
    },
    include: {
      optionValue: {
        include: {
          option: true,
        },
      },
    },
  });
};

const remove = async (productId, variantId, optionValueId) => {
  await findVariant(productId, variantId);

  return prisma.variantOptionValue.delete({
    where: {
      variantId_optionValueId: {
        variantId,
        optionValueId,
      },
    },
  });
};

export default {
  findManyByVariantId,
  create,
  remove,
};
