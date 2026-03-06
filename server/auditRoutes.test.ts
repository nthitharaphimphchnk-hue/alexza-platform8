/**
 * API tests for audit-logs pagination and filters.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";
import type { AuditLogDoc } from "./models/auditLog";

const mockLogs: AuditLogDoc[] = [
  {
    _id: new ObjectId(),
    ownerUserId: new ObjectId(),
    actorUserId: new ObjectId(),
    actorEmail: "user@example.com",
    workspaceId: null,
    projectId: null,
    actionType: "auth.user.created",
    resourceType: "user",
    resourceId: "abc123",
    metadata: {},
    ip: "127.0.0.1",
    userAgent: "test",
    status: "success",
    createdAt: new Date(),
  },
];

const mockGetDb = vi.fn();
const mockReqUser = {
  _id: new ObjectId(),
  id: "user1",
  email: "user@example.com",
  name: "User",
};

vi.mock("./db", () => ({
  getDb: () => mockGetDb(),
}));

vi.mock("./middleware/requireAuth", () => ({
  requireAuth: (req: unknown, _res: unknown, next: () => void) => {
    (req as { user?: unknown }).user = mockReqUser;
    next();
  },
}));

vi.mock("./workspaces/projectAccess", () => ({
  getWorkspaceIdsForUser: vi.fn().mockResolvedValue([]),
  ensureProjectAccess: vi.fn().mockResolvedValue(true),
}));

vi.mock("./workspaces/workspaces.routes", () => ({
  getMemberRole: vi.fn().mockResolvedValue(null),
}));

const { auditRoutes } = await import("./auditRoutes");

describe("audit-logs API", () => {
  let app: express.Express;

  beforeEach(() => {
    const mockCol = {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue(mockLogs),
            }),
          }),
        }),
      }),
      countDocuments: vi.fn().mockResolvedValue(1),
    };
    mockGetDb.mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCol),
    });

    app = express();
    app.use(express.json());
    app.use("/api", auditRoutes);
  });

  it("GET /api/audit-logs returns paginated items", async () => {
    const res = await request(app)
      .get("/api/audit-logs")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("pageSize");
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("GET /api/audit-logs accepts page and pageSize", async () => {
    const res = await request(app)
      .get("/api/audit-logs?page=2&pageSize=25")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(25);
  });

  it("GET /api/audit-logs accepts filters", async () => {
    const res = await request(app)
      .get("/api/audit-logs?actionType=auth.user.created&resourceType=user&status=success")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
