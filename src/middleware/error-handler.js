const errorHandler = (err, req, res, next) => {
  if (err.code === "P2002") {
    return res.status(409).json({
      message: "Resource already exists",
    });
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;
