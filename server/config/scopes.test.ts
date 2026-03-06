/**
 * Tests for API key scopes.
 */

import { describe, it, expect } from "vitest";
import { API_KEY_SCOPES, hasScope, isValidScope } from "./scopes";

describe("scopes", () => {
  describe("isValidScope", () => {
    it("accepts all defined scopes", () => {
      for (const scope of API_KEY_SCOPES) {
        expect(isValidScope(scope)).toBe(true);
      }
    });

    it("rejects invalid scopes", () => {
      expect(isValidScope("invalid")).toBe(false);
      expect(isValidScope("")).toBe(false);
      expect(isValidScope("run:action")).toBe(false);
      expect(isValidScope("read:project")).toBe(false);
    });
  });

  describe("hasScope", () => {
    it("undefined/empty scopes = full access (backward compatibility)", () => {
      expect(hasScope(undefined, "run:actions")).toBe(true);
      expect(hasScope([], "read:analytics")).toBe(true);
      expect(hasScope([], "manage:api_keys")).toBe(true);
    });

    it("wildcard * grants all scopes", () => {
      expect(hasScope(["*"], "run:actions")).toBe(true);
      expect(hasScope(["*"], "read:projects")).toBe(true);
    });

    it("key with correct scope succeeds", () => {
      expect(hasScope(["run:actions"], "run:actions")).toBe(true);
      expect(hasScope(["read:projects", "read:analytics"], "read:projects")).toBe(true);
      expect(hasScope(["read:projects", "read:analytics"], "read:analytics")).toBe(true);
    });

    it("key without scope gets false", () => {
      expect(hasScope(["read:projects"], "run:actions")).toBe(false);
      expect(hasScope(["run:actions"], "read:analytics")).toBe(false);
      expect(hasScope(["read:projects"], "manage:webhooks")).toBe(false);
    });

    it("invalid scopes in array are filtered; empty normalized = full access", () => {
      expect(hasScope(["invalid", "foo"], "run:actions")).toBe(true);
    });

    it("mixed valid and invalid scopes", () => {
      expect(hasScope(["run:actions", "invalid"], "run:actions")).toBe(true);
      expect(hasScope(["run:actions", "invalid"], "read:projects")).toBe(false);
    });
  });
});
