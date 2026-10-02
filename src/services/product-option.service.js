import productOptionData from "../data/product-option.data.js";

const createProductOption = async (productId, data) => {
  return productOptionData.create(productId, data);
};

const getProductOptions = async (productId) => {
  return productOptionData.findManyByProductId(productId);
};

const getProductOption = async (productId, optionId) => {
  return productOptionData.findById(productId, optionId);
};

const updateProductOption = async (productId, optionId, data) => {
  return productOptionData.update(productId, optionId, data);
};

const deleteProductOption = async (productId, optionId) => {
  return productOptionData.remove(productId, optionId);
};

export {
  createProductOption,
  getProductOptions,
  getProductOption,
  updateProductOption,
  deleteProductOption,
};
