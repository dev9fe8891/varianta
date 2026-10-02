import { Router } from "express";
import validate from "../middleware/validate.js";
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
router.post("/", validate(createProductSchema), createProduct);
router.patch("/:id", validate(updateProductSchema), updateProduct);
router.delete("/:id", deleteProduct);

export default router;
