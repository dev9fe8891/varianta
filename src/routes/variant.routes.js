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

const router = Router({ mergeParams: true });

router.get("/", getVariants);
router.get("/:variantId", getVariant);

router.post("/", validate(createVariantSchema), createVariant);

router.patch("/:variantId", validate(updateVariantSchema), updateVariant);

router.delete("/:variantId", deleteVariant);

export default router;
