import variantData from "../data/variant.data.js";

const createVariant = async (productId, data) => {
  return variantData.create(productId, data);
};

const getVariants = async (productId) => {
  return variantData.findManyByProductId(productId);
};

const getVariant = async (productId, variantId) => {
  return variantData.findById(productId, variantId);
};

const updateVariant = async (productId, variantId, data) => {
  return variantData.update(productId, variantId, data);
};

const deleteVariant = async (productId, variantId) => {
  return variantData.remove(productId, variantId);
};

export { createVariant, getVariants, getVariant, updateVariant, deleteVariant };
