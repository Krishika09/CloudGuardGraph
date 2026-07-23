import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, GitCompareArrows } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { UploadScanDialog } from "@/components/layout/UploadScanDialog";
import { useActiveScan } from "@/hooks/useActiveScan";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import type { ScanSummary } from "@/types/domain";

const STATUS_ICON: Record<ScanSummary["status"], typeof CheckCircle2> = {
  success: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  queued: Loader2,
};

export function ScanHistory() {
  const { scans, isLoading } = useActiveScan();
  const setScanId = useAppStore((s) => s.setScanId);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const sorted = [...scans].sort((a, b) => b.number - a.number);
  const [a, b] = compareIds.map((id) => scans.find((s) => s.id === id)).filter(Boolean) as ScanSummary[];

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1100px] space-y-4">
      <PageHeader
        title="Scan History"
        description="The temporal spine of the product — this is a scan-based assessment tool, not a live feed. Compare any two scans to see what changed."
        actions={<UploadScanDialog trigger={<Button size="sm">Upload new scan</Button>} />}
      />

      {compareIds.length === 2 && a && b && (
        <Card className="border-primary/30 bg-primary/[0.04] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <GitCompareArrows className="h-4 w-4 text-primary" /> Scan #{a.number} → Scan #{b.number}
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Risk score</div>
              <div className="font-mono text-lg">
                {a.riskScore} → {b.riskScore}{" "}
                <span className={b.riskScore <= a.riskScore ? "text-success" : "text-critical"}>
                  ({b.riskScore - a.riskScore >= 0 ? "+" : ""}
                  {b.riskScore - a.riskScore})
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Critical paths</div>
              <div className="font-mono text-lg">
                {a.criticalPathCount} → {b.criticalPathCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Findings</div>
              <div className="font-mono text-lg">
                {a.findingsCount} → {b.findingsCount}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Compare</th>
              <th className="p-3 font-medium">Scan</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Triggered</th>
              <th className="p-3 font-medium">Risk</th>
              <th className="p-3 font-medium">Critical Paths</th>
              <th className="p-3 font-medium">Findings</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const Icon = STATUS_ICON[s.status];
              return (
                <tr key={s.id} className="border-b border-border/70 last:border-0 hover:bg-accent/20">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(s.id)}
                      onChange={() => toggleCompare(s.id)}
                    />
                  </td>
                  <td className="p-3">
                    <button onClick={() => setScanId(s.id)} className="font-mono text-xs font-semibold text-primary hover:underline">
                      #{s.number}
                    </button>
                    <div className="text-xs text-muted-foreground">{s.triggeredBy}</div>
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-xs",
                        s.status === "success" && "text-success",
                        s.status === "failed" && "text-critical",
                        (s.status === "running" || s.status === "queued") && "text-primary",
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", (s.status === "running" || s.status === "queued") && "animate-spin")} />
                      {s.status}
                    </span>
                    {s.status === "failed" && s.failureReason && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{s.failureReason}</div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {new Date(s.triggeredAt).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-sm">
                    {s.riskScore}{" "}
                    <span className={s.riskDelta <= 0 ? "text-success" : "text-critical"}>
                      ({s.riskDelta >= 0 ? "+" : ""}
                      {s.riskDelta})
                    </span>
                  </td>
                  <td className="p-3 font-mono text-sm">{s.criticalPathCount}</td>
                  <td className="p-3 font-mono text-sm">{s.findingsCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
