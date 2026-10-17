import express from "express";
import request from "supertest";
import { rateLimit } from "express-rate-limit";
import { describe, expect, it } from "vitest";

describe("Rate limiting", () => {
  it("returns 429 after the request limit is exceeded", async () => {
    const app = express();

    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 2,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          message: "Too many requests",
        },
      }),
    );

    app.get("/test", (req, res) => {
      res.status(200).json({ status: "ok" });
    });

    const firstResponse = await request(app).get("/test");
    const secondResponse = await request(app).get("/test");
    const thirdResponse = await request(app).get("/test");

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(thirdResponse.status).toBe(429);
    expect(thirdResponse.body).toEqual({
      message: "Too many requests",
    });
    expect(thirdResponse.headers["ratelimit-limit"]).toBe("2");
  });
});
