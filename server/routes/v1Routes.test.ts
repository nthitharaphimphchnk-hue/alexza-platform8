/**
 * Tests for API v1 routing and deprecation headers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { v1Router } from "./v1";
import { v2Router } from "./v2";

vi.mock("../db", () => ({
  getDb: vi.fn().mockRejectedValue(new Error("DB not available in test")),
}));

describe("API v1 routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use("/v1", v1Router);
  });

  it("POST /v1/run without API key returns 401", async () => {
    const res = await request(app)
      .post("/v1/run")
      .set("Content-Type", "application/json")
      .send({ input: "test" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("ok", false);
    expect(res.body).toHaveProperty("error", "UNAUTHORIZED");
  });

  it("POST /v1/run without API key includes deprecation headers", async () => {
    const res = await request(app)
      .post("/v1/run")
      .set("Content-Type", "application/json")
      .send({ input: "test" });

    expect(res.headers["x-alexza-deprecated"]).toBe("true");
    expect(res.headers["x-alexza-replacement"]).toBe("/v1/projects/:projectId/run/:actionName");
  });

  it("POST /v1/projects/:projectId/run/:actionName without API key returns 401", async () => {
    const res = await request(app)
      .post("/v1/projects/507f1f77bcf86cd799439011/run/summarize_text")
      .set("Content-Type", "application/json")
      .send({ input: { text: "test" } });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("ok", false);
    expect(res.body).toHaveProperty("error", "UNAUTHORIZED");
  });

  it("POST /v1/projects/:projectId/run/:actionName does not include deprecation headers", async () => {
    const res = await request(app)
      .post("/v1/projects/507f1f77bcf86cd799439011/run/summarize_text")
      .set("Content-Type", "application/json")
      .send({ input: { text: "test" } });

    expect(res.headers["x-alexza-deprecated"]).toBeUndefined();
  });
});

describe("API v2 routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use("/v2", v2Router);
  });

  it("GET /v2 returns placeholder", async () => {
    const res = await request(app).get("/v2");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("version", "v2");
    expect(res.body).toHaveProperty("stableVersion", "v1");
  });
});
