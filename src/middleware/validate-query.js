const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const error = new Error("Validation failed");
      error.statusCode = 400;

      return next(error);
    }

    req.validatedQuery = result.data;

    next();
  };
};

export default validateQuery;
