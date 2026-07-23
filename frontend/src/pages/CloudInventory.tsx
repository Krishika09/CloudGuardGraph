import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { ResourceIcon, RESOURCE_TYPE_LABEL } from "@/components/shared/ResourceIcon";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { CloudResource, ResourceType } from "@/types/domain";

export function CloudInventory() {
  const { activeScanId } = useActiveScan();
  const [params] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<ResourceType | null>(null);
  const [publicOnly, setPublicOnly] = useState(false);
  const [selected, setSelected] = useState<CloudResource | null>(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["inventory", activeScanId],
    queryFn: () => api.inventory(activeScanId!),
    enabled: !!activeScanId,
  });

  const byType = useMemo(() => {
    const map = new Map<ResourceType, CloudResource[]>();
    resources.forEach((r) => {
      if (!map.has(r.type)) map.set(r.type, []);
      map.get(r.type)!.push(r);
    });
    return map;
  }, [resources]);

  const filtered = useMemo(
    () =>
      resources.filter((r) => {
        if (typeFilter && r.type !== typeFilter) return false;
        if (publicOnly && !r.isPublic) return false;
        return true;
      }),
    [resources, typeFilter, publicOnly],
  );

  useEffect(() => {
    const resourceParam = params.get("resource");
    if (resourceParam && resources.length) {
      const match = resources.find((r) => r.id === resourceParam);
      if (match) setSelected(match);
    }
  }, [params, resources]);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <PageHeader
        title="Cloud Inventory"
        description="Ground-truth register of every resource the Parser extracted, before any security judgment is applied."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          <button
            onClick={() => setTypeFilter(null)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm",
              !typeFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            All resources <span className="font-mono text-xs">{resources.length}</span>
          </button>
          {Array.from(byType.entries()).map(([type, list]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm",
                typeFilter === type ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <span className="flex items-center gap-2">
                <ResourceIcon type={type} /> {RESOURCE_TYPE_LABEL[type]}
              </span>
              <span className="font-mono text-xs">{list.length}</span>
            </button>
          ))}
          <label className="mt-2 flex items-center gap-2 border-t border-border px-3 pt-3 text-xs text-muted-foreground">
            <input type="checkbox" checked={publicOnly} onChange={(e) => setPublicOnly(e.target.checked)} />
            Public only
          </label>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState title="No resources match these filters" />
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Exposure</th>
                  <th className="p-3 font-medium">Findings</th>
                  <th className="p-3 font-medium">Connections</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-accent/30"
                  >
                    <td className="p-3">
                      <span className="flex items-center gap-2 font-mono text-xs">
                        <ResourceIcon type={r.type} /> {r.name}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={cn("text-xs", r.isPublic ? "text-critical" : "text-muted-foreground")}>
                        {r.isPublic ? "Public" : "Private"}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.worstSeverity ? <SeverityBadge severity={r.worstSeverity} /> : <span className="text-xs text-muted-foreground">—</span>}
                      {r.findingsCount > 0 && <span className="ml-1.5 font-mono text-xs text-muted-foreground">×{r.findingsCount}</span>}
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{r.connections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader className="border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <ResourceIcon type={selected.type} /> {selected.name}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    {RESOURCE_TYPE_LABEL[selected.type]}
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Exposure</div>
                    {selected.isPublic ? "Public" : "Private"}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Attributes</div>
                  <div className="rounded-md border border-border bg-secondary/30 p-3 font-mono text-xs">
                    {Object.entries(selected.attributes).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 py-0.5">
                        <span className="text-muted-foreground">{k}</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {selected.sourceSnippet && (
                  <details className="rounded-md border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">
                      View source snippet
                    </summary>
                    <pre className="scrollbar-thin overflow-x-auto border-t border-border bg-secondary/30 p-3 font-mono text-xs">
                      {selected.sourceSnippet}
                    </pre>
                  </details>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" render={<a href="/attack-graph">View in Attack Graph</a>} />
                  <Button
                    variant="outline"
                    size="sm"
                    render={<a href={`/findings?type=${selected.type}`}>View Findings</a>}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
