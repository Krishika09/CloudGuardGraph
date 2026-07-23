import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DiffEditor } from "@monaco-editor/react";
import { Sparkles, FlaskConical, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const EFFORT_LABEL: Record<string, string> = { low: "Low effort", medium: "Medium effort", high: "High effort" };

export function Recommendations() {
  const { activeScanId } = useActiveScan();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["recommendations", activeScanId],
    queryFn: () => api.recommendations(activeScanId!),
    enabled: !!activeScanId,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateRecommendation(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recommendations", activeScanId] }),
  });

  const sorted = useMemo(
    () => [...recs].sort((a, b) => b.estRiskReduction - a.estRiskReduction),
    [recs],
  );

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <PageHeader
        title="AI Recommendations"
        description="Ranked by estimated risk reduction per fix — turning explainability into exact configuration changes."
      />

      {sorted.length === 0 ? (
        <EmptyState title="No recommendations yet" description="Suggestions appear once a scan finishes." />
      ) : (
        <div className="space-y-3">
          {sorted.map((rec) => {
            const isOpen = expanded === rec.id;
            return (
              <Card key={rec.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <StatusChip status={rec.status} />
                      <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {EFFORT_LABEL[rec.effort]}
                      </span>
                      <span className="font-mono text-xs font-semibold text-success">
                        −{rec.estRiskReduction} risk
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold">{rec.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{rec.summary}</p>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">{rec.modelAttribution}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setExpanded(isOpen ? null : rec.id)}
                    >
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      Diff
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={() => navigate(`/simulator?rec=${rec.id}`)}>
                      <FlaskConical className="h-3.5 w-3.5" /> Simulate
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 overflow-hidden rounded-md border border-border">
                    <DiffEditor
                      height="220px"
                      language="hcl"
                      original={rec.diffBefore}
                      modified={rec.diffAfter}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        fontFamily: "ui-monospace, monospace",
                        renderSideBySide: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <span className="mr-1 text-xs text-muted-foreground">Mark as:</span>
                  <button
                    onClick={() => updateStatus.mutate({ id: rec.id, status: "applied" })}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                      rec.status === "applied" ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground",
                    )}
                  >
                    <Check className="h-3 w-3" /> Applied
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: rec.id, status: "dismissed" })}
                    className={cn(
                      "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                      rec.status === "dismissed" ? "border-border bg-secondary text-foreground" : "border-border text-muted-foreground",
                    )}
                  >
                    <X className="h-3 w-3" /> Dismissed
                  </button>
                  {rec.status !== "suggested" && (
                    <button
                      onClick={() => updateStatus.mutate({ id: rec.id, status: "suggested" })}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
                    >
                      <Sparkles className="h-3 w-3" /> Reset
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
