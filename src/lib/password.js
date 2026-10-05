import argon2 from "argon2";

const hashPassword = async (password) => {
  return argon2.hash(password);
};

const verifyPassword = async (password, passwordHash) => {
  return argon2.verify(passwordHash, password);
};

export { hashPassword, verifyPassword };
