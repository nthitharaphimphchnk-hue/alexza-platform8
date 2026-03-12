import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { requestTimeout, type TimeoutRequest } from "./request-timeout";

describe("requestTimeout middleware", () => {
  it("returns 504 JSON when handler exceeds timeout", async () => {
    const app = express();
    app.use(express.json());
    // Use a very small timeout for the test to complete quickly.
    app.use(requestTimeout("default", 50));
    app.post("/api/slow", async (_req: TimeoutRequest, res, _next) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!res.headersSent) {
        res.json({ ok: true });
      }
    });

    const res = await request(app).post("/api/slow").send({});
    expect(res.status).toBe(504);
    expect(res.body).toEqual({
      error: "request_timeout",
      message: "The request took too long to complete.",
    });
  });
});

