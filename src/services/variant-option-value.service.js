import variantOptionValueData from "../data/variant-option-value.data.js";

const getVariantOptionValues = async (productId, variantId) => {
  return variantOptionValueData.findManyByVariantId(productId, variantId);
};

const addVariantOptionValue = async (productId, variantId, optionValueId) => {
  return variantOptionValueData.create(productId, variantId, optionValueId);
};

const deleteVariantOptionValue = async (
  productId,
  variantId,
  optionValueId,
) => {
  return variantOptionValueData.remove(productId, variantId, optionValueId);
};

export {
  getVariantOptionValues,
  addVariantOptionValue,
  deleteVariantOptionValue,
};
