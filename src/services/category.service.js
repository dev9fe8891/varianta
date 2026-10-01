import categoryData from "../data/category.data.js";

const categoryNotFoundError = () => {
  const error = new Error("Category not found");
  error.statusCode = 404;

  return error;
};

const createCategory = async (data) => {
  return categoryData.create(data);
};

const updateCategory = async (id, data) => {
  try {
    return await categoryData.update(id, data);
  } catch (error) {
    if (error.code === "P2025") {
      throw categoryNotFoundError();
    }

    throw error;
  }
};

const getCategories = async () => {
  return categoryData.findMany();
};

const getCategory = async (id) => {
  const category = await categoryData.findById(id);

  if (!category) {
    throw categoryNotFoundError();
  }

  return category;
};

const deleteCategory = async (id) => {
  try {
    return await categoryData.remove(id);
  } catch (error) {
    if (error.code === "P2025") {
      throw categoryNotFoundError();
    }

    throw error;
  }
};

export {
  createCategory,
  updateCategory,
  getCategories,
  getCategory,
  deleteCategory,
};
