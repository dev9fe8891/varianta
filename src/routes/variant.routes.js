import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createVariantSchema,
  updateVariantSchema,
} from "../validation/variant.schema.js";
import {
  createVariant,
  deleteVariant,
  getVariant,
  getVariants,
  updateVariant,
} from "../controllers/variant.controller.js";
import {
  getVariantOptionValues,
  addVariantOptionValue,
  deleteVariantOptionValue,
} from "../controllers/variant-option-value.controller.js";
import { createVariantOptionValueSchema } from "../validation/variant-option-value.schema.js";

const router = Router({ mergeParams: true });

router.get("/", getVariants);
router.get("/:variantId", getVariant);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createVariantSchema),
  createVariant,
);

router.patch(
  "/:variantId",
  requireAuth,
  requireAdmin,
  validate(updateVariantSchema),
  updateVariant,
);

router.delete("/:variantId", requireAuth, requireAdmin, deleteVariant);

router.get("/:variantId/option-values", getVariantOptionValues);

router.post(
  "/:variantId/option-values",
  requireAuth,
  requireAdmin,
  validate(createVariantOptionValueSchema),
  addVariantOptionValue,
);

router.delete(
  "/:variantId/option-values/:optionValueId",
  requireAuth,
  requireAdmin,
  deleteVariantOptionValue,
);

export default router;
