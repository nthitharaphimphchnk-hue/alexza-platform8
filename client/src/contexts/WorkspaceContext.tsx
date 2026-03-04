"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "./AuthContext";

const WORKSPACE_STORAGE_KEY = "alexza_current_workspace_id";

export interface Workspace {
  id: string;
  name: string;
  ownerUserId: string;
  role: string;
  createdAt: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace | null) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ ok: boolean; workspaces: Workspace[] }>("/api/workspaces");
      const list = res?.workspaces ?? [];
      setWorkspaces(list);

      const savedId = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      const matched = list.find((w) => w.id === savedId);
      if (matched) {
        setCurrentWorkspaceState(matched);
      } else if (list.length > 0) {
        setCurrentWorkspaceState(list[0]);
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, list[0].id);
      } else {
        setCurrentWorkspaceState(null);
      }
    } catch {
      setWorkspaces([]);
      setCurrentWorkspaceState(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchWorkspaces();
  }, [fetchWorkspaces]);

  const setCurrentWorkspace = useCallback((ws: Workspace | null) => {
    setCurrentWorkspaceState(ws);
    if (ws) {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, ws.id);
    } else {
      window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        isLoading,
        refetch: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
