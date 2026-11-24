import { describe, expect, it } from "vitest";
import { apiRequest } from "./helpers/request.js";

describe("GET /api/health", () => {
  it("returns API health status", async () => {
    const response = await apiRequest.get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
