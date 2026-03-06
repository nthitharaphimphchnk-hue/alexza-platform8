/**
 * Tests for requireApiScope middleware.
 */

import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireApiScope } from "./requireApiScope";

function mockReq(overrides?: Partial<Request>): Request {
  return {
    apiKey: undefined,
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

function mockNext(): NextFunction {
  return vi.fn();
}

describe("requireApiScope", () => {
  it("passes through when no apiKey (session auth)", () => {
    const middleware = requireApiScope("run:actions");
    const req = mockReq({ apiKey: undefined });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes through when key has required scope", () => {
    const middleware = requireApiScope("run:actions");
    const req = mockReq({
      apiKey: {
        id: "1",
        _id: {} as any,
        projectId: {} as any,
        ownerUserId: {} as any,
        keyPrefix: "axza_",
        scopes: ["run:actions"],
      },
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes through when key has undefined scopes (backward compat)", () => {
    const middleware = requireApiScope("run:actions");
    const req = mockReq({
      apiKey: {
        id: "1",
        _id: {} as any,
        projectId: {} as any,
        ownerUserId: {} as any,
        keyPrefix: "axza_",
        scopes: undefined,
      },
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 403 insufficient_scope when key lacks scope", () => {
    const middleware = requireApiScope("run:actions");
    const req = mockReq({
      apiKey: {
        id: "1",
        _id: {} as any,
        projectId: {} as any,
        ownerUserId: {} as any,
        keyPrefix: "axza_",
        scopes: ["read:projects", "read:analytics"],
      },
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "insufficient_scope" });
  });

});
