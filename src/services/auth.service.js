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

export { register, login };
