import prisma from "../../src/lib/prisma.js";
import { apiRequest } from "./request.js";

const createAdminAgent = async () => {
  const agent = apiRequest.agent();

  const email = `admin-test-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;

  const password = "password123";

  await agent.post("/api/auth/register").send({
    name: "Admin Test User",
    email,
    password,
  });

  await prisma.user.update({
    where: { email },
    data: { role: "Admin" },
  });

  await agent.post("/api/auth/login").send({
    email,
    password,
  });

  return agent;
};

const createUserAgent = async () => {
  const agent = apiRequest.agent();

  const email = `user-test-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;

  await agent.post("/api/auth/register").send({
    name: "Regular Test User",
    email,
    password: "password123",
  });

  return agent;
};

export { createAdminAgent, createUserAgent };
