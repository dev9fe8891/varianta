import { rateLimit } from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

const createLimiter = (windowMs, message) =>
  rateLimit({
    windowMs,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    skip: () => isTest,
  });

export const loginLimiter = createLimiter(
  15 * 60 * 1000,
  "Too many login attempts. Please try again later.",
);

export const registerLimiter = createLimiter(
  60 * 60 * 1000,
  "Too many registration attempts. Please try again later.",
);
