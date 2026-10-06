import { register as registerUser } from "../services/auth.service.js";
import { signAccessToken } from "../lib/jwt.js";
import { setAuthCookie } from "../lib/auth-cookie.js";

const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    const token = signAccessToken({
      id: user.id,
      role: user.role,
    });

    setAuthCookie(res, token);

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export { register };
