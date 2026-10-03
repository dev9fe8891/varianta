import { z } from "zod";

const productOptionValueFields = {
  name: z.string().trim().min(1).max(100),
  position: z.number().int().nonnegative(),
};

export const createProductOptionValueSchema = z
  .object(productOptionValueFields)
  .strict();

export const updateProductOptionValueSchema = z
  .object(productOptionValueFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0);
