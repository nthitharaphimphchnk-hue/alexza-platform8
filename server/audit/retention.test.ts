/**
 * Tests for audit log retention policy.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import {
  getRetentionDaysForPlan,
  runAuditLogRetentionCleanup,
  stopAuditRetentionScheduler,
} from "./retention";

const freeUserId = new ObjectId();
const proUserId = new ObjectId();
const enterpriseUserId = new ObjectId();

const mockDeleteMany = vi.fn();
const mockUsersFind = vi.fn();

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: vi.fn((name: string) => {
      if (name === "users") {
        return {
          find: vi.fn().mockReturnValue({
            project: vi.fn().mockReturnValue({
              toArray: mockUsersFind,
            }),
          }),
        };
      }
      if (name === "audit_logs") {
        return { deleteMany: mockDeleteMany };
      }
      return {};
    }),
  }),
}));

describe("getRetentionDaysForPlan", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("returns defaults when env not set", () => {
    delete process.env.AUDIT_LOG_RETENTION_FREE;
    delete process.env.AUDIT_LOG_RETENTION_PRO;
    delete process.env.AUDIT_LOG_RETENTION_ENTERPRISE;
    expect(getRetentionDaysForPlan("free")).toBe(30);
    expect(getRetentionDaysForPlan("pro")).toBe(90);
    expect(getRetentionDaysForPlan("enterprise")).toBe(365);
  });

  it("reads from env when set", () => {
    process.env.AUDIT_LOG_RETENTION_FREE = "14";
    process.env.AUDIT_LOG_RETENTION_PRO = "60";
    process.env.AUDIT_LOG_RETENTION_ENTERPRISE = "730";
    expect(getRetentionDaysForPlan("free")).toBe(14);
    expect(getRetentionDaysForPlan("pro")).toBe(60);
    expect(getRetentionDaysForPlan("enterprise")).toBe(730);
  });

  it("falls back to default for invalid env", () => {
    process.env.AUDIT_LOG_RETENTION_FREE = "invalid";
    expect(getRetentionDaysForPlan("free")).toBe(30);
  });
});

describe("runAuditLogRetentionCleanup", () => {
  beforeEach(() => {
    stopAuditRetentionScheduler();
    mockDeleteMany.mockReset().mockResolvedValue({ deletedCount: 0 });
    mockUsersFind.mockReset();
    mockUsersFind
      .mockResolvedValueOnce([{ _id: freeUserId }])
      .mockResolvedValueOnce([{ _id: proUserId }])
      .mockResolvedValueOnce([{ _id: enterpriseUserId }]);
  });

  it("deletes logs older than retention cutoff", async () => {
    mockDeleteMany.mockResolvedValue({ deletedCount: 5 });

    const results = await runAuditLogRetentionCleanup();

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.plan)).toEqual(["free", "pro", "enterprise"]);
    expect(mockDeleteMany).toHaveBeenCalledTimes(3);
    for (const call of mockDeleteMany.mock.calls) {
      const filter = call[0];
      expect(filter).toHaveProperty("ownerUserId");
      expect(filter).toHaveProperty("createdAt");
      expect(filter.createdAt).toHaveProperty("$lt");
      expect(filter.createdAt.$lt).toBeInstanceOf(Date);
      expect(filter.createdAt.$lt.getTime()).toBeLessThan(Date.now());
    }
  });

  it("never deletes logs newer than cutoff - filter uses createdAt $lt", async () => {
    await runAuditLogRetentionCleanup();
    const now = new Date();
    for (const call of mockDeleteMany.mock.calls) {
      const filter = call[0];
      expect(filter.createdAt.$lt).toBeInstanceOf(Date);
      const cutoff = filter.createdAt.$lt as Date;
      expect(cutoff.getTime()).toBeLessThan(now.getTime());
    }
  });

  it("returns results per plan", async () => {
    mockDeleteMany
      .mockResolvedValueOnce({ deletedCount: 10 })
      .mockResolvedValueOnce({ deletedCount: 2 })
      .mockResolvedValueOnce({ deletedCount: 0 });

    const results = await runAuditLogRetentionCleanup();

    expect(results[0]).toMatchObject({ plan: "free", deletedCount: 10, userCount: 1 });
    expect(results[1]).toMatchObject({ plan: "pro", deletedCount: 2, userCount: 1 });
    expect(results[2]).toMatchObject({ plan: "enterprise", deletedCount: 0, userCount: 1 });
  });
});
