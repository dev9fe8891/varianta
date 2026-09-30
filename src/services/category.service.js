import categoryData from "../data/category.data.js";

const createCategory = async (data) => {
  return categoryData.create(data);
};

const updateCategory = async (id, data) => {
  return categoryData.update(id, data);
};

const getCategories = async () => {
  return categoryData.findMany();
};

const getCategory = async (id) => {
  return categoryData.findById(id);
};

const deleteCategory = async (id) => {
  return categoryData.remove(id);
};

export {
  createCategory,
  updateCategory,
  getCategories,
  getCategory,
  deleteCategory,
};
