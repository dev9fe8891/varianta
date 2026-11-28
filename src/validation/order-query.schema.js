import { z } from "zod";

export const orderQuerySchema = z
  .object({
    sort: z.enum(["createdAt", "total", "status"]).default("createdAt"),

    order: z.enum(["asc", "desc"]).default("desc"),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(12),
  })
  .strict();
