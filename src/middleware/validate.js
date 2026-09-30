const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const error = new Error("Validation failed");
    error.statusCode = 400;

    return next(error);
  }

  req.body = result.data;

  next();
};

export default validate;
