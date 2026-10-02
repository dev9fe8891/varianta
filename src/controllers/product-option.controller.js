import * as productOptionService from "../services/product-option.service.js";

const createProductOption = async (req, res, next) => {
  try {
    const productOption = await productOptionService.createProductOption(
      req.params.productId,
      req.body,
    );

    res.status(201).json(productOption);
  } catch (error) {
    next(error);
  }
};

const getProductOptions = async (req, res, next) => {
  try {
    const productOptions = await productOptionService.getProductOptions(
      req.params.productId,
    );

    res.json(productOptions);
  } catch (error) {
    next(error);
  }
};

const getProductOption = async (req, res, next) => {
  try {
    const productOption = await productOptionService.getProductOption(
      req.params.productId,
      req.params.optionId,
    );

    res.json(productOption);
  } catch (error) {
    next(error);
  }
};

const updateProductOption = async (req, res, next) => {
  try {
    const productOption = await productOptionService.updateProductOption(
      req.params.productId,
      req.params.optionId,
      req.body,
    );

    res.json(productOption);
  } catch (error) {
    next(error);
  }
};

const deleteProductOption = async (req, res, next) => {
  try {
    await productOptionService.deleteProductOption(
      req.params.productId,
      req.params.optionId,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export {
  createProductOption,
  getProductOptions,
  getProductOption,
  updateProductOption,
  deleteProductOption,
};
