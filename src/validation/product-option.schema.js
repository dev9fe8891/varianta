import { z } from "zod";

const productOptionFields = {
  name: z.string().trim().min(1).max(100),
  position: z.number().int().nonnegative(),
};

export const createProductOptionSchema = z.object(productOptionFields).strict();

export const updateProductOptionSchema = z
  .object(productOptionFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0);
