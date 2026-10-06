import {
  register as registerUser,
  login as loginUser,
} from "../services/auth.service.js";
import { signAccessToken } from "../lib/jwt.js";
import { setAuthCookie, clearAuthCookie } from "../lib/auth-cookie.js";

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

const login = async (req, res, next) => {
  try {
    const user = await loginUser(req.body);

    const token = signAccessToken({
      id: user.id,
      role: user.role,
    });

    setAuthCookie(res, token);

    const { passwordHash, ...safeUser } = user;

    res.status(200).json(safeUser);
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(204).send();
};

export { register, login, logout };
