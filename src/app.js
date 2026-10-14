import express from "express";
import apiRouter from "./routes/index.js";
import errorHandler from "./middleware/error-handler.js";
import { readFileSync } from "node:fs";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

const app = express();

const openApiUrl = new URL("../openapi.yaml", import.meta.url);
const openApiSource = readFileSync(openApiUrl, "utf8");
const openApiDocument = YAML.parse(openApiSource);

app.use(express.json());

app.get("/api-docs/openapi.yaml", (req, res) => {
  res.type("text/yaml").send(openApiSource);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use(errorHandler);

export default app;
