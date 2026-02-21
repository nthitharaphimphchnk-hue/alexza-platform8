/**
 * Minimal tests for rate limiter behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { rateLimitByIp } from "./rateLimitByIp";
import { RATE_LIMIT_IP_PER_MIN } from "../config";

function mockReq(ip = "127.0.0.1"): Partial<Request> {
  return {
    headers: { "x-forwarded-for": ip },
    socket: { remoteAddress: ip } as any,
  };
}

function mockRes(): Partial<Response> & { _statusCode: number; _jsonBody: unknown } {
  const out: any = {
    _statusCode: 0,
    _jsonBody: null,
    setHeader: vi.fn(),
    status(code: number) {
      out._statusCode = code;
      return out;
    },
    json(body: unknown) {
      out._jsonBody = body;
      return out;
    },
  };
  return out;
}

describe("rateLimitByIp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows first request and sets rate limit headers", () => {
    const req = mockReq("192.168.1.1") as Request;
    const res = mockRes() as Response & { statusCode: number; jsonBody: unknown };
    const next = vi.fn();

    rateLimitByIp(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((res as any).setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", expect.any(String));
    expect((res as any).setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", expect.any(String));
  });

  it("returns 429 when limit exceeded", () => {
    const req = mockReq("10.0.0.99") as Request;

    for (let i = 0; i < RATE_LIMIT_IP_PER_MIN; i++) {
      const res = mockRes() as Response & { statusCode: number; jsonBody: unknown };
      const next = vi.fn();
      rateLimitByIp(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    }

    const res = mockRes() as Response & { statusCode: number; jsonBody: unknown };
    const next = vi.fn();
    rateLimitByIp(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect((res as any)._statusCode).toBe(429);
    expect((res as any)._jsonBody).toMatchObject({
      ok: false,
      error: { code: "RATE_LIMIT", message: "Too many requests" },
      requestId: expect.any(String),
    });
  });
});
