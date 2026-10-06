import { Router } from "express";
import productOptionRouter from "./product-option.routes.js";
import variantRouter from "./variant.routes.js";
import validate from "../middleware/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createProductSchema,
  updateProductSchema,
} from "../validation/product.schema.js";
import {
  createProduct,
  deleteProduct,
  getProducts,
  getProduct,
  updateProduct,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProduct);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createProductSchema),
  createProduct,
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(updateProductSchema),
  updateProduct,
);

router.delete("/:id", requireAuth, requireAdmin, deleteProduct);

router.use("/:productId/options", productOptionRouter);
router.use("/:productId/variants", variantRouter);

export default router;
