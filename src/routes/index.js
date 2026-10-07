import { Router } from "express";
import categoryRouter from "./category.routes.js";
import productRouter from "./product.routes.js";
import authRouter from "./auth.routes.js";
import orderRouter from "./order.routes.js";

const router = Router();

router.use("/categories", categoryRouter);
router.use("/products", productRouter);
router.use("/auth", authRouter);
router.use("/orders", orderRouter);

export default router;
