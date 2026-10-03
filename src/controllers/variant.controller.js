import * as variantService from "../services/variant.service.js";

const createVariant = async (req, res, next) => {
  try {
    const variant = await variantService.createVariant(
      req.params.productId,
      req.body,
    );

    res.status(201).json(variant);
  } catch (error) {
    next(error);
  }
};

const getVariants = async (req, res, next) => {
  try {
    const variants = await variantService.getVariants(req.params.productId);

    res.json(variants);
  } catch (error) {
    next(error);
  }
};

const getVariant = async (req, res, next) => {
  try {
    const variant = await variantService.getVariant(
      req.params.productId,
      req.params.variantId,
    );

    res.json(variant);
  } catch (error) {
    next(error);
  }
};

const updateVariant = async (req, res, next) => {
  try {
    const variant = await variantService.updateVariant(
      req.params.productId,
      req.params.variantId,
      req.body,
    );

    res.json(variant);
  } catch (error) {
    next(error);
  }
};

const deleteVariant = async (req, res, next) => {
  try {
    await variantService.deleteVariant(
      req.params.productId,
      req.params.variantId,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export { createVariant, getVariants, getVariant, updateVariant, deleteVariant };
