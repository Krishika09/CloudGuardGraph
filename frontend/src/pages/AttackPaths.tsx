import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lightbulb, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { StatusChip } from "@/components/shared/StatusChip";
import { AttackPathChain } from "@/components/shared/AttackPathChain";
import { EmptyState } from "@/components/shared/EmptyState";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { AttackPath } from "@/types/domain";

type SortKey = "risk" | "hops";

export function AttackPaths() {
  const { activeScanId } = useActiveScan();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [sort, setSort] = useState<SortKey>("risk");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["attack-paths", activeScanId],
    queryFn: () => api.attackPaths(activeScanId!),
    enabled: !!activeScanId,
  });

  const pathParam = params.get("path");
  const selected = paths.find((p) => p.id === pathParam) ?? null;

  const { data: recommendations = [] } = useQuery({
    queryKey: ["recommendations", activeScanId],
    queryFn: () => api.recommendations(activeScanId!),
    enabled: !!activeScanId,
  });
  const rec = selected ? recommendations.find((r) => r.id === selected.recommendationId) : undefined;

  const sorted = useMemo(() => {
    let list = [...paths];
    if (statusFilter) list = list.filter((p) => p.status === statusFilter);
    return list.sort((a, b) => (sort === "risk" ? b.riskScore - a.riskScore : b.hops - a.hops));
  }, [paths, sort, statusFilter]);

  function openPath(p: AttackPath) {
    setParams({ path: p.id });
  }
  function closeDrawer() {
    const next = new URLSearchParams(params);
    next.delete("path");
    setParams(next, { replace: true });
  }

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <PageHeader
        title="Attack Paths"
        description="Correlated, ranked chains an attacker could realistically follow to reach a critical asset — CloudGuardGraph's core analysis, not an isolated findings list."
        actions={
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            {(["risk", "hops"] as SortKey[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium capitalize",
                  sort === s ? "bg-primary/15 text-primary" : "text-muted-foreground",
                )}
              >
                {s === "risk" ? "Sort by risk" : "Sort by length"}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {["new", "existing", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter((f) => (f === s ? null : s))}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
              statusFilter === s ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          tone="success"
          title="No exploitable attack paths found in this scan"
          description="This is the best possible outcome CloudGuardGraph can report — no correlated chain to a critical asset was discovered."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => (
            <button
              key={p.id}
              onClick={() => openPath(p)}
              className="flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={p.severity} />
                  <StatusChip status={p.status} />
                  <span className="text-sm text-muted-foreground">
                    {p.hops} hops · entry: {p.entryPoint === "internet" ? "Internet-facing" : "Internal"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Target</span>
                  <span className="text-sm font-semibold">{p.targetAssetName}</span>
                  <span className="rounded-md bg-secondary px-2 py-1 font-mono text-lg font-bold tabular-nums">
                    {p.riskScore}
                  </span>
                </div>
              </div>
              <AttackPathChain nodes={p.nodes} />
            </button>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && closeDrawer()}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader className="border-b border-border">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={selected.severity} />
                  <StatusChip status={selected.status} />
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                    Risk {selected.riskScore}
                  </span>
                </div>
                <SheetTitle className="text-left">Path to {selected.targetAssetName}</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 p-4">
                <div className="rounded-lg border border-border bg-secondary/30 p-3">
                  <AttackPathChain
                    nodes={selected.nodes}
                    onNodeClick={() => navigate("/attack-graph")}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" /> Explainability
                  </div>
                  <ol className="space-y-2">
                    {selected.explanation.map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-foreground">{line}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Contributing findings ({selected.contributingFindingIds.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.contributingFindingIds.map((fid) => (
                      <button
                        key={fid}
                        onClick={() => navigate(`/findings?finding=${fid}`)}
                        className="rounded-md border border-border bg-secondary/40 px-2 py-1 font-mono text-[11px] hover:border-primary/40"
                      >
                        {fid}
                      </button>
                    ))}
                  </div>
                </div>

                {rec && (
                  <div className="rounded-lg border border-primary/30 bg-primary/[0.04] p-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-semibold">{rec.title}</span>
                      <span className="font-mono text-xs text-success">−{rec.estRiskReduction} risk</span>
                    </div>
                    <p className="mb-3 text-sm text-muted-foreground">{rec.summary}</p>
                    <Button size="sm" className="gap-1.5" onClick={() => navigate(`/simulator?rec=${rec.id}`)}>
                      <FlaskConical className="h-3.5 w-3.5" /> Run in Simulator
                    </Button>
                  </div>
                )}

                <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/attack-graph")}>
                  View full graph <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
