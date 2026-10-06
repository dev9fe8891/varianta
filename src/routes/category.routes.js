import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validation/category.schema.js";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategory,
  updateCategory,
} from "../controllers/category.controller.js";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategory);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  validate(createCategorySchema),
  createCategory,
);

router.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  validate(updateCategorySchema),
  updateCategory,
);

router.delete("/:id", requireAuth, requireAdmin, deleteCategory);

export default router;
