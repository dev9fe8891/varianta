import productOptionValueData from "../data/product-option-value.data.js";

const createProductOptionValue = async (productId, optionId, data) => {
  return productOptionValueData.create(productId, optionId, data);
};

const getProductOptionValues = async (productId, optionId) => {
  return productOptionValueData.findManyByOptionId(productId, optionId);
};

const getProductOptionValue = async (productId, optionId, valueId) => {
  return productOptionValueData.findById(productId, optionId, valueId);
};

const updateProductOptionValue = async (productId, optionId, valueId, data) => {
  return productOptionValueData.update(productId, optionId, valueId, data);
};

const deleteProductOptionValue = async (productId, optionId, valueId) => {
  return productOptionValueData.remove(productId, optionId, valueId);
};

export {
  createProductOptionValue,
  getProductOptionValues,
  getProductOptionValue,
  updateProductOptionValue,
  deleteProductOptionValue,
};
