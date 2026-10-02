import * as productService from "../services/product.service.js";

const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);

    res.json(product);
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getProducts();

    res.json(products);
  } catch (error) {
    next(error);
  }
};

const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProduct(req.params.id);

    res.json(product);
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export { createProduct, updateProduct, getProducts, getProduct, deleteProduct };
