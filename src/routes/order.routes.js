import { Router } from "express";
import validate from "../middleware/validate.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validation/order.schema.js";
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", validate(createOrderSchema), createOrder);

router.get("/", getOrders);

router.get("/:id", getOrder);

router.patch(
  "/:id/status",
  requireAdmin,
  validate(updateOrderStatusSchema),
  updateOrderStatus,
);

export default router;
