import userData from "../data/user.data.js";
import { hashPassword } from "../lib/password.js";

const register = async ({ name, email, password }) => {
  const passwordHash = await hashPassword(password);

  return userData.create({
    name,
    email,
    passwordHash,
  });
};

export { register };
