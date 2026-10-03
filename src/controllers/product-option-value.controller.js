import * as productOptionValueService from "../services/product-option-value.service.js";

const createProductOptionValue = async (req, res, next) => {
  try {
    const productOptionValue =
      await productOptionValueService.createProductOptionValue(
        req.params.productId,
        req.params.optionId,
        req.body,
      );

    res.status(201).json(productOptionValue);
  } catch (error) {
    next(error);
  }
};

const getProductOptionValues = async (req, res, next) => {
  try {
    const productOptionValues =
      await productOptionValueService.getProductOptionValues(
        req.params.productId,
        req.params.optionId,
      );

    res.json(productOptionValues);
  } catch (error) {
    next(error);
  }
};

const getProductOptionValue = async (req, res, next) => {
  try {
    const productOptionValue =
      await productOptionValueService.getProductOptionValue(
        req.params.productId,
        req.params.optionId,
        req.params.valueId,
      );

    res.json(productOptionValue);
  } catch (error) {
    next(error);
  }
};

const updateProductOptionValue = async (req, res, next) => {
  try {
    const productOptionValue =
      await productOptionValueService.updateProductOptionValue(
        req.params.productId,
        req.params.optionId,
        req.params.valueId,
        req.body,
      );

    res.json(productOptionValue);
  } catch (error) {
    next(error);
  }
};

const deleteProductOptionValue = async (req, res, next) => {
  try {
    await productOptionValueService.deleteProductOptionValue(
      req.params.productId,
      req.params.optionId,
      req.params.valueId,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export {
  createProductOptionValue,
  getProductOptionValues,
  getProductOptionValue,
  updateProductOptionValue,
  deleteProductOptionValue,
};
