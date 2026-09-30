import express from "express";
import apiRouter from "./routes/index.js";

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

export default app;
