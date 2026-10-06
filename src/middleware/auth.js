import { COOKIE_NAME } from "../lib/auth-cookie.js";
import { verifyAccessToken } from "../lib/jwt.js";

const getAccessToken = (req) => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split("=");

    if (name === COOKIE_NAME) {
      return valueParts.join("=");
    }
  }

  return null;
};

const verifyAuthToken = (token) => {
  return verifyAccessToken(token);
};

const attachUser = (req, payload, next) => {
  req.user = {
    id: payload.sub,
    role: payload.role,
  };

  next();
};

const requireAuth = (req, res, next) => {
  const token = getAccessToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  try {
    const payload = verifyAuthToken(token);

    attachUser(req, payload, next);
  } catch {
    return res.status(401).json({
      message: "Authentication required",
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "Admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

export {
  getAccessToken,
  verifyAuthToken,
  attachUser,
  requireAuth,
  requireAdmin,
};
