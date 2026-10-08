import productData from "../data/product.data.js";

const createProduct = async (data) => {
  return productData.create(data);
};

const updateProduct = async (id, data) => {
  return productData.update(id, data);
};

const getProducts = async (query) => {
  const { search, categoryId, minPrice, maxPrice, sort, order, page, limit } =
    query;

  const where = {};

  if (search !== undefined) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (categoryId !== undefined) {
    where.categoryId = categoryId;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.basePrice = {};

    if (minPrice !== undefined) {
      where.basePrice.gte = minPrice;
    }

    if (maxPrice !== undefined) {
      where.basePrice.lte = maxPrice;
    }
  }

  const skip = (page - 1) * limit;

  const { products, total } = await productData.findMany({
    where,
    sort,
    order,
    skip,
    take: limit,
  });

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.ceil(total / limit),
    },
  };
};

const getProduct = async (id) => {
  return productData.findById(id);
};

const deleteProduct = async (id) => {
  return productData.remove(id);
};

export { createProduct, updateProduct, getProducts, getProduct, deleteProduct };
