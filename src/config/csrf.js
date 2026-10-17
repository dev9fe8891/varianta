const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const getAllowedOrigins = () => {
  const origins = process.env.CSRF_ORIGINS;

  if (!origins) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CSRF_ORIGINS must be configured in production");
    }

    return ["http://localhost:5173", "http://localhost:3000"];
  }

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const csrfMiddleware = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.get("Origin");

  if (!origin || !getAllowedOrigins().includes(origin)) {
    return res.status(403).json({
      error: {
        message: "Invalid or missing Origin",
      },
    });
  }

  return next();
};

export default csrfMiddleware;
