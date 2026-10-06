import userData from "../data/user.data.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const register = async ({ name, email, password }) => {
  const passwordHash = await hashPassword(password);

  return userData.create({
    name,
    email,
    passwordHash,
  });
};

const login = async ({ email, password }) => {
  const user = await userData.findByEmail(email);

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  return user;
};

const getMe = async (userId) => {
  const user = await userData.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export { register, login, getMe };
