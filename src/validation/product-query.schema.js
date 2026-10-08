import { z } from "zod";

const optionalNumber = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.coerce.number().int().nonnegative().optional(),
);

const optionalSearch = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed === "" ? undefined : trimmed;
}, z.string().min(1).max(200).optional());

export const productQuerySchema = z
  .object({
    search: optionalSearch,

    categoryId: z.string().uuid().optional(),

    minPrice: optionalNumber,

    maxPrice: optionalNumber,

    sort: z.enum(["title", "basePrice", "createdAt"]).default("title"),

    order: z.enum(["asc", "desc"]).default("asc"),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(12),
  })
  .strict()
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    },
  );
