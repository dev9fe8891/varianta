import { z } from "zod";

const productFields = {
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(100),
  description: z.string().trim().max(5000).nullable().optional(),
  basePrice: z.number().int().nonnegative(),
  image: z.string().trim().max(2048).nullable().optional(),
};

export const createProductSchema = z.object(productFields).strict();

export const updateProductSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0);
