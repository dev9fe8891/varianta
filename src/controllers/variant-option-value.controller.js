import * as variantOptionValueService from "../services/variant-option-value.service.js";

const getVariantOptionValues = async (req, res, next) => {
  try {
    const optionValues = await variantOptionValueService.getVariantOptionValues(
      req.params.productId,
      req.params.variantId,
    );

    res.json(optionValues);
  } catch (error) {
    next(error);
  }
};

const addVariantOptionValue = async (req, res, next) => {
  try {
    const optionValue = await variantOptionValueService.addVariantOptionValue(
      req.params.productId,
      req.params.variantId,
      req.body.optionValueId,
    );

    res.status(201).json(optionValue);
  } catch (error) {
    next(error);
  }
};

const deleteVariantOptionValue = async (req, res, next) => {
  try {
    await variantOptionValueService.deleteVariantOptionValue(
      req.params.productId,
      req.params.variantId,
      req.params.optionValueId,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export {
  getVariantOptionValues,
  addVariantOptionValue,
  deleteVariantOptionValue,
};
