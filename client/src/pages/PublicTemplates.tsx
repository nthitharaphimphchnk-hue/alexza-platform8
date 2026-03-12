import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { showErrorToast } from "@/lib/toast";
import { useLocation } from "wouter";
import AppShell from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";

interface PublicTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  downloads: number;
  rating: number;
}

type SortOption = "popular" | "new" | "featured";

export default function PublicTemplates() {
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [sort, setSort] = useState<SortOption>("new");
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const load = async (nextSort: SortOption) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        templates: (PublicTemplate & { visibility?: string })[];
      }>(`/api/templates/public?sort=${nextSort}`);
      setTemplates(
        (res.templates || []).map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          downloads: t.downloads ?? 0,
          rating: t.rating ?? 0,
        }))
      );
    } catch (err) {
      showErrorToast(
        "Failed to load templates",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load(sort);
  }, [sort]);

  const handleUseTemplate = (tpl: PublicTemplate) => {
    setLocation("/login?next=/app/projects");
  };

  return (
    <div className="min-h-screen text-foreground">
      <AppShell
        title="Templates Gallery"
        subtitle="Browse ready-made AI templates and use them inside your projects."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Templates" }]}
        backHref="/"
        backLabel="Back to Home"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-300">
              Discover public templates for text, automation, sales, marketing, and support use cases.
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded-lg bg-[#050607] border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-sm text-white"
              >
                <option value="popular">Popular</option>
                <option value="new">New</option>
                <option value="featured">Featured</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full text-sm text-gray-400">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="col-span-full text-sm text-gray-400">
                No public templates are available yet.
              </div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#050607] p-4 flex flex-col gap-3"
                >
                  <div>
                    <div className="text-sm uppercase tracking-wide text-gray-400">
                      {tpl.category || "Template"}
                    </div>
                    <h2 className="text-lg font-semibold text-white mt-1">{tpl.name}</h2>
                  </div>
                  <p className="text-sm text-gray-300 line-clamp-3">{tpl.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
                    <span>Downloads: {tpl.downloads.toLocaleString()}</span>
                    <span>Rating: {tpl.rating.toFixed(1)}</span>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleUseTemplate(tpl)}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </AppShell>
    </div>
  );
}

