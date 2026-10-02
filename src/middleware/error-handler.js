const errorHandler = (err, req, res, next) => {
  if (err.code === "P2002") {
    return res.status(409).json({
      message: "Resource already exists",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      message: "Resource not found",
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      message: "Related resource not found",
    });
  }

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;
