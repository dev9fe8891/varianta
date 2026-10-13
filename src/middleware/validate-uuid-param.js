import { z } from "zod";

const uuidSchema = z.string().uuid();

const validateUuidParam = (req, res, next, value) => {
  const result = uuidSchema.safeParse(value);

  if (!result.success) {
    const error = new Error("Invalid ID format");
    error.statusCode = 400;

    return next(error);
  }

  next();
};

export default validateUuidParam;
