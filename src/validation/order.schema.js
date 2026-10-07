import { z } from "zod";

const orderItemSchema = z
  .object({
    variantId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })
  .strict();

export const createOrderSchema = z
  .object({
    items: z.array(orderItemSchema).min(1),
  })
  .strict()
  .refine(
    (data) => {
      const variantIds = data.items.map((item) => item.variantId);

      return new Set(variantIds).size === variantIds.length;
    },
    {
      message: "Duplicate variantId is not allowed",
      path: ["items"],
    },
  );

export const updateOrderStatusSchema = z
  .object({
    status: z.enum(["PENDING", "PAID", "CANCELLED", "COMPLETED"]),
  })
  .strict();
