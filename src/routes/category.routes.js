import { Router } from "express";
import validate from "../middleware/validate.js";
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
router.post("/", validate(createCategorySchema), createCategory);
router.patch("/:id", validate(updateCategorySchema), updateCategory);
router.delete("/:id", deleteCategory);

export default router;
