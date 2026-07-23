import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FlaskConical, ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { RiskGauge } from "@/components/shared/RiskGauge";
import { AttackPathChain } from "@/components/shared/AttackPathChain";
import { EmptyState } from "@/components/shared/EmptyState";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const STAGES = ["Rebuilding graph", "Recomputing attack paths", "Recalculating risk"];

export function Simulator() {
  const { activeScanId, active } = useActiveScan();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [runStage, setRunStage] = useState(-1);

  const { data: recs = [], isLoading } = useQuery({
    queryKey: ["recommendations", activeScanId],
    queryFn: () => api.recommendations(activeScanId!),
    enabled: !!activeScanId,
  });

  useEffect(() => {
    const rec = params.get("rec");
    if (rec) setSelected((prev) => new Set(prev).add(rec));
  }, [params]);

  const simulate = useMutation({
    mutationFn: () => api.simulate(activeScanId!, Array.from(selected)),
  });

  function runSimulation() {
    setRunStage(0);
    const interval = setInterval(() => {
      setRunStage((s) => {
        if (s >= STAGES.length - 1) {
          clearInterval(interval);
          simulate.mutate();
          return s;
        }
        return s + 1;
      });
    }, 550);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (isLoading) return <Skeleton className="h-96" />;

  const result = simulate.data;
  const isRunning = runStage >= 0 && runStage < STAGES.length && !result;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <PageHeader
        title="Simulator"
        description="A sandbox — nothing here touches the real scan or real Terraform. Select fixes, then prove their effect on risk before anyone edits infrastructure."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit p-4">
          <h3 className="mb-3 text-sm font-semibold">Scenario builder</h3>
          {recs.length === 0 ? (
            <EmptyState title="Nothing to simulate yet" description="Generate recommendations first." />
          ) : (
            <div className="space-y-2">
              {recs.map((rec) => (
                <label
                  key={rec.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border p-2.5 text-sm hover:border-primary/40"
                >
                  <Checkbox checked={selected.has(rec.id)} onCheckedChange={() => toggle(rec.id)} className="mt-0.5" />
                  <span>
                    <span className="font-medium">{rec.title}</span>
                    <span className="ml-1.5 font-mono text-xs text-success">−{rec.estRiskReduction}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <Button
            className="mt-4 w-full gap-1.5"
            disabled={selected.size === 0 || isRunning}
            onClick={runSimulation}
          >
            <FlaskConical className="h-4 w-4" /> Run Simulation
          </Button>
        </Card>

        <div className="space-y-4">
          {isRunning && (
            <Card className="p-6">
              <div className="space-y-3">
                {STAGES.map((label, i) => (
                  <div key={label} className="flex items-center gap-3 text-sm">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px]",
                        i < runStage ? "bg-success/20 text-success" : i === runStage ? "bg-primary/20 text-primary animate-pulse" : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {i < runStage ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={i <= runStage ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!isRunning && !result && (
            <EmptyState
              title="Select one or more findings or recommendations to simulate a fix"
              description="Choose from the scenario builder on the left, or open a recommendation from the AI Recommendations page."
            />
          )}

          {result && (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-around">
                  <RiskGauge value={result.before} size={160} label="Current" />
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <RiskGauge value={result.after} size={160} label="Simulated" />
                </div>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {result.findingsResolved} finding{result.findingsResolved !== 1 ? "s" : ""} resolved ·{" "}
                  {result.pathsEliminated.length} attack path{result.pathsEliminated.length !== 1 ? "s" : ""} eliminated
                </p>
              </Card>

              {result.pathsEliminated.length > 0 && (
                <Card className="p-4">
                  <h3 className="mb-3 text-sm font-semibold">Attack paths eliminated</h3>
                  <div className="space-y-2">
                    {result.pathsEliminated.map((p) => (
                      <div key={p.id} className="rounded-md border border-success/30 bg-success/5 p-3 opacity-80">
                        <div className="mb-1.5 flex items-center gap-2 text-xs text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Eliminated
                        </div>
                        <div className="line-through decoration-success/50">
                          <AttackPathChain nodes={p.nodes} compact />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div className="flex justify-end">
                <Button variant="outline" className="gap-1.5" onClick={() => navigate("/reports?scenario=1")}>
                  <FileText className="h-4 w-4" /> Export this scenario to Report
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {active && <p className="text-xs text-muted-foreground">Scoped to Scan #{active.number}. Results are ephemeral for this session.</p>}
    </div>
  );
}
