import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "7d";

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
};

const signAccessToken = ({ id, role }) => {
  return jwt.sign(
    {
      sub: id,
      role,
    },
    getJwtSecret(),
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

export { signAccessToken, verifyAccessToken };
