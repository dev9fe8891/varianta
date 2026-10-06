import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import productOptionValueRouter from "./product-option-value.routes.js";
import {
  createProductOptionSchema,
  updateProductOptionSchema,
} from "../validation/product-option.schema.js";
import {
  createProductOption,
  deleteProductOption,
  getProductOption,
  getProductOptions,
  updateProductOption,
} from "../controllers/product-option.controller.js";

const router = Router({ mergeParams: true });

router.get("/", getProductOptions);
router.get("/:optionId", getProductOption);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createProductOptionSchema),
  createProductOption,
);

router.patch(
  "/:optionId",
  requireAuth,
  requireAdmin,
  validate(updateProductOptionSchema),
  updateProductOption,
);

router.delete("/:optionId", requireAuth, requireAdmin, deleteProductOption);

router.use("/:optionId/values", productOptionValueRouter);

export default router;
