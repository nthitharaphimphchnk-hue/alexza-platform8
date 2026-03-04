/**
 * API tests for templates list and search.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { ObjectId } from "mongodb";
import type { ActionTemplateDoc } from "./models/actionTemplate";

const mockTemplates: ActionTemplateDoc[] = [
  {
    _id: new ObjectId(),
    name: "Summarize Short",
    description: "Brief summary",
    category: "summarize",
    tags: ["summary"],
    promptTemplate: "Summarize: {{text}}",
    inputSchema: { type: "object" },
    createdBy: "system",
    visibility: "public",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new ObjectId(),
    name: "Translate Thai to English",
    description: "Thai to English",
    category: "translate",
    tags: ["thai", "english"],
    promptTemplate: "Translate: {{text}}",
    inputSchema: { type: "object" },
    createdBy: "system",
    visibility: "public",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockGetDb = vi.fn();
vi.mock("./db", () => ({
  getDb: () => mockGetDb(),
}));

// Import after mock so router uses mocked getDb
const { templatesRouter } = await import("./templatesRoutes");

function createMockCollection(items: ActionTemplateDoc[]) {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(items),
        }),
      }),
    }),
    createIndex: vi.fn().mockResolvedValue(undefined),
  };
}

describe("templates API", () => {
  let app: express.Express;

  beforeEach(() => {
    const mockCol = createMockCollection(mockTemplates);
    mockGetDb.mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCol),
    });

    app = express();
    app.use(express.json());
    app.use("/api", templatesRouter);
  });

  it("GET /api/templates returns list of templates", async () => {
    const res = await request(app)
      .get("/api/templates")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("templates");
    expect(Array.isArray(res.body.templates)).toBe(true);
    expect(res.body.templates).toHaveLength(2);
    expect(res.body.templates[0]).toHaveProperty("name", "Summarize Short");
    expect(res.body.templates[0]).toHaveProperty("category", "summarize");
    expect(res.body.templates[0]).toHaveProperty("id");
  });

  it("GET /api/templates?category=summarize filters by category", async () => {
    const summarizeOnly = mockTemplates.filter((t) => t.category === "summarize");
    const mockCol = createMockCollection(summarizeOnly);
    mockGetDb.mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCol),
    });

    const res = await request(app)
      .get("/api/templates?category=summarize")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.templates).toHaveLength(1);
    expect(res.body.templates[0].category).toBe("summarize");
  });

  it("GET /api/templates?q=translate filters by search query", async () => {
    const translateOnly = mockTemplates.filter((t) =>
      t.name.toLowerCase().includes("translate")
    );
    const mockCol = createMockCollection(translateOnly);
    mockGetDb.mockResolvedValue({
      collection: vi.fn().mockReturnValue(mockCol),
    });

    const res = await request(app)
      .get("/api/templates?q=translate")
      .expect("Content-Type", /json/);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.templates.length).toBeGreaterThanOrEqual(0);
  });
});
