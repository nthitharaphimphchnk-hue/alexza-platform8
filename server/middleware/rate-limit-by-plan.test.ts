/**
 * Tests for plan-based rate limiting.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";
import { rateLimitByPlan } from "./rate-limit-by-plan";
import { RATE_LIMIT_FREE_PER_MIN, RATE_LIMIT_PRO_PER_MIN } from "../config";

const mockGetUserBillingState = vi.fn();
vi.mock("../billing", () => ({
  getUserBillingState: (userId: ObjectId) => mockGetUserBillingState(userId),
}));

const FAKE_USER_ID = new ObjectId();

function mockApiKeyAuth(keyId: string) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as express.Request & { apiKey?: unknown }).apiKey = {
      id: keyId,
    _id: new ObjectId(),
    projectId: new ObjectId(),
    ownerUserId: FAKE_USER_ID,
    keyPrefix: "axza_test",
    name: "Test Key",
  };
    next();
  };
}

describe("rate-limit-by-plan", () => {
  let app: express.Express;
  let testKeyId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testKeyId = new ObjectId().toString();
    app = express();
    app.use(express.json());
    app.use(mockApiKeyAuth(testKeyId));
    app.use(rateLimitByPlan);
    app.post("/test", (_req, res) => res.json({ ok: true }));
  });

  it("returns X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers", async () => {
    mockGetUserBillingState.mockResolvedValue({ plan: "free" });

    const res = await request(app).post("/test");

    expect(res.headers["x-ratelimit-limit"]).toBeDefined();
    expect(res.headers["x-ratelimit-remaining"]).toBeDefined();
    expect(res.headers["x-ratelimit-reset"]).toBeDefined();
  });

  it("Free plan: allows up to 30 requests per minute", async () => {
    mockGetUserBillingState.mockResolvedValue({ plan: "free" });

    for (let i = 0; i < RATE_LIMIT_FREE_PER_MIN; i++) {
      const res = await request(app).post("/test");
      expect(res.status).not.toBe(429);
    }

    const res = await request(app).post("/test");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "rate_limit_exceeded" });
  });

  it("Pro plan: allows up to 120 requests per minute", async () => {
    mockGetUserBillingState.mockResolvedValue({ plan: "pro" });

    for (let i = 0; i < RATE_LIMIT_PRO_PER_MIN; i++) {
      const res = await request(app).post("/test");
      expect(res.status).not.toBe(429);
    }

    const res = await request(app).post("/test");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "rate_limit_exceeded" });
  });

  it("Enterprise plan: allows more than Free limit", async () => {
    mockGetUserBillingState.mockResolvedValue({ plan: "enterprise" });

    for (let i = 0; i < 100; i++) {
      const res = await request(app).post("/test");
      expect(res.status).not.toBe(429);
    }
    expect(mockGetUserBillingState).toHaveBeenCalled();
  });

  it("returns 429 with error body when limit exceeded", async () => {
    mockGetUserBillingState.mockResolvedValue({ plan: "free" });

    for (let i = 0; i < RATE_LIMIT_FREE_PER_MIN + 1; i++) {
      const res = await request(app).post("/test");
      if (i < RATE_LIMIT_FREE_PER_MIN) {
        expect(res.status).not.toBe(429);
      } else {
        expect(res.status).toBe(429);
        expect(res.body).toHaveProperty("error", "rate_limit_exceeded");
      }
    }
  });

  it("X-RateLimit-Limit reflects plan limit", async () => {
    mockGetUserBillingState.mockResolvedValue({ plan: "free" });

    const res = await request(app).post("/test");

    expect(res.headers["x-ratelimit-limit"]).toBe(String(RATE_LIMIT_FREE_PER_MIN));
  });
});
