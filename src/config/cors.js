import cors from "cors";

const getAllowedOrigins = () => {
  const origins = process.env.CORS_ORIGINS;

  if (!origins) {
    if (process.env.NODE_ENV === "production") {
      return [];
    }

    return ["http://localhost:5173"];
  }

  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const corsOptions = {
  origin(origin, callback) {
    // Requests without Origin, such as some server-to-server clients,
    // are not blocked by CORS.
    if (!origin || getAllowedOrigins().includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
