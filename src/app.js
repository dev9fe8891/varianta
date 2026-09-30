import express from "express";
import apiRouter from "./routes/index.js";
import errorHandler from "./middleware/error-handler.js";

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use(errorHandler);

export default app;
