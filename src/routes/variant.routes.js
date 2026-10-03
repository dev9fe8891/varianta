import { Router } from "express";
import validate from "../middleware/validate.js";
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

router.post("/", validate(createVariantSchema), createVariant);

router.patch("/:variantId", validate(updateVariantSchema), updateVariant);

router.delete("/:variantId", deleteVariant);

router.get("/:variantId/option-values", getVariantOptionValues);

router.post(
  "/:variantId/option-values",
  validate(createVariantOptionValueSchema),
  addVariantOptionValue,
);

router.delete(
  "/:variantId/option-values/:optionValueId",
  deleteVariantOptionValue,
);

export default router;
