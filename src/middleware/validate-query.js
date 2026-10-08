const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
      });
    }

    req.validatedQuery = result.data;

    next();
  };
};

export default validateQuery;
