import { Router } from "express";
import categoryRouter from "./category.routes.js";
import productRouter from "./product.routes.js";

const router = Router();

router.use("/categories", categoryRouter);
router.use("/products", productRouter);

export default router;
