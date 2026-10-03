import { z } from "zod";

const variantFields = {
  sku: z.string().trim().min(1).max(100),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
};

export const createVariantSchema = z.object(variantFields).strict();

export const updateVariantSchema = z
  .object(variantFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0);
