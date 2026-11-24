import "dotenv/config";

import app from "./app.js";
import prisma from "./lib/prisma.js";

import {
  startOrderExpirationWorker,
  stopOrderExpirationWorker,
} from "./jobs/order-expiration.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  startOrderExpirationWorker();
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`);

  stopOrderExpirationWorker();

  server.close(async () => {
    try {
      await prisma.$disconnect();

      console.log("Server shut down successfully");

      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);

      process.exit(1);
    }
  });
};

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
