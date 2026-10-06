import request from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/lib/prisma.js";

const createAdminAgent = async () => {
  const agent = request.agent(app);

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
  const agent = request.agent(app);

  await agent.post("/api/auth/register").send({
    name: "Regular Test User",
    email: `user-test-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}@example.com`,
    password: "password123",
  });

  return agent;
};

export { createAdminAgent, createUserAgent };
