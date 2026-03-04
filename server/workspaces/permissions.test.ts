/**
 * Unit tests for workspace RBAC permissions.
 */

import { describe, it, expect } from "vitest";
import {
  hasPermission,
  canManageWorkspace,
  canManageProjects,
  canManageKeys,
  canManageActions,
  canRunActions,
  canViewAnalytics,
  canManageBilling,
  canManageMembers,
} from "./permissions";
import type { WorkspaceRole } from "./types";

describe("workspace permissions", () => {
  it("owner has all permissions", () => {
    expect(canManageWorkspace("owner")).toBe(true);
    expect(canManageProjects("owner")).toBe(true);
    expect(canManageKeys("owner")).toBe(true);
    expect(canManageActions("owner")).toBe(true);
    expect(canRunActions("owner")).toBe(true);
    expect(canViewAnalytics("owner")).toBe(true);
    expect(canManageBilling("owner")).toBe(true);
    expect(canManageMembers("owner")).toBe(true);
  });

  it("admin has all permissions except cannot transfer ownership", () => {
    expect(canManageWorkspace("admin")).toBe(true);
    expect(canManageProjects("admin")).toBe(true);
    expect(canManageKeys("admin")).toBe(true);
    expect(canManageActions("admin")).toBe(true);
    expect(canRunActions("admin")).toBe(true);
    expect(canViewAnalytics("admin")).toBe(true);
    expect(canManageBilling("admin")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
  });

  it("developer can manage actions and run, view analytics, but not manage workspace/keys/billing", () => {
    expect(canManageWorkspace("developer")).toBe(false);
    expect(canManageProjects("developer")).toBe(false);
    expect(canManageKeys("developer")).toBe(false);
    expect(canManageActions("developer")).toBe(true);
    expect(canRunActions("developer")).toBe(true);
    expect(canViewAnalytics("developer")).toBe(true);
    expect(canManageBilling("developer")).toBe(false);
    expect(canManageMembers("developer")).toBe(false);
  });

  it("viewer has read-only access", () => {
    expect(canManageWorkspace("viewer")).toBe(false);
    expect(canManageProjects("viewer")).toBe(false);
    expect(canManageKeys("viewer")).toBe(false);
    expect(canManageActions("viewer")).toBe(false);
    expect(canRunActions("viewer")).toBe(false);
    expect(canViewAnalytics("viewer")).toBe(true);
    expect(canManageBilling("viewer")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
  });

  it("hasPermission returns correct values for specific permissions", () => {
    expect(hasPermission("viewer", "projects:manage")).toBe(false);
    expect(hasPermission("developer", "members:manage")).toBe(false);
    expect(hasPermission("developer", "actions:run")).toBe(true);
  });
});
