import productData from "../data/product.data.js";

const createProduct = async (data) => {
  return productData.create(data);
};

const updateProduct = async (id, data) => {
  return productData.update(id, data);
};

const getProducts = async () => {
  return productData.findMany();
};

const getProduct = async (id) => {
  return productData.findById(id);
};

const deleteProduct = async (id) => {
  return productData.remove(id);
};

export { createProduct, updateProduct, getProducts, getProduct, deleteProduct };
