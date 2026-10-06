import { Router } from "express";
import categoryRouter from "./category.routes.js";
import productRouter from "./product.routes.js";
import authRouter from "./auth.routes.js";

const router = Router();

router.use("/categories", categoryRouter);
router.use("/products", productRouter);
router.use("/auth", authRouter);

export default router;
