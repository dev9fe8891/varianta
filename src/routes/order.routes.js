import { Router } from "express";

import validate from "../middleware/validate.js";
import validateQuery from "../middleware/validate-query.js";

import { requireAuth, requireAdmin } from "../middleware/auth.js";

import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validation/order.schema.js";

import { orderQuerySchema } from "../validation/order-query.schema.js";

import {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
} from "../controllers/order.controller.js";

import validateUuidParam from "../middleware/validate-uuid-param.js";

const router = Router();

router.param("id", validateUuidParam);

router.use(requireAuth);

router.post("/", validate(createOrderSchema), createOrder);

router.get("/", validateQuery(orderQuerySchema), getOrders);

router.get("/:id", getOrder);

router.post("/:id/cancel", cancelOrder);

router.patch(
  "/:id/status",
  requireAdmin,
  validate(updateOrderStatusSchema),
  updateOrderStatus,
);

export default router;
