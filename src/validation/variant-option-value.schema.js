import { z } from "zod";

export const createVariantOptionValueSchema = z
  .object({
    optionValueId: z.string().uuid(),
  })
  .strict();
