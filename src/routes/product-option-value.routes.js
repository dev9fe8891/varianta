import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createProductOptionValueSchema,
  updateProductOptionValueSchema,
} from "../validation/product-option-value.schema.js";
import {
  createProductOptionValue,
  deleteProductOptionValue,
  getProductOptionValue,
  getProductOptionValues,
  updateProductOptionValue,
} from "../controllers/product-option-value.controller.js";

const router = Router({ mergeParams: true });

router.get("/", getProductOptionValues);
router.get("/:valueId", getProductOptionValue);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createProductOptionValueSchema),
  createProductOptionValue,
);

router.patch(
  "/:valueId",
  requireAuth,
  requireAdmin,
  validate(updateProductOptionValueSchema),
  updateProductOptionValue,
);

router.delete("/:valueId", requireAuth, requireAdmin, deleteProductOptionValue);

export default router;
