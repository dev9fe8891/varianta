import { z } from "zod";

const categoryFields = {
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
};

export const createCategorySchema = z.object(categoryFields).strict();

export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    error: "At least one field is required",
  });
