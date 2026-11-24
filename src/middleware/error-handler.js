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

  console.error("Unhandled API Error:", err);

  const response = {
    message:
      statusCode >= 500
        ? "Internal Server Error"
        : err.message || "Request failed",
  };

  if (err.details) {
    response.details = err.details;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
