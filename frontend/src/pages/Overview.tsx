import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { Boxes, Route, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { RiskGauge } from "@/components/shared/RiskGauge";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { AttackPathChain } from "@/components/shared/AttackPathChain";
import { EmptyState } from "@/components/shared/EmptyState";
import { UploadScanDialog } from "@/components/layout/UploadScanDialog";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SEVERITY_VAR } from "@/lib/severity";
import type { Severity } from "@/types/domain";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];

export function Overview() {
  const navigate = useNavigate();
  const { workspaceId, activeScanId, active, isLoading: scanLoading } = useActiveScan();

  const { data: trend = [] } = useQuery({
    queryKey: ["risk-trend", workspaceId],
    queryFn: () => api.riskTrend(workspaceId),
  });
  const { data: findings = [], isLoading: findingsLoading } = useQuery({
    queryKey: ["findings", activeScanId],
    queryFn: () => api.findings(activeScanId!),
    enabled: !!activeScanId,
  });
  const { data: paths = [], isLoading: pathsLoading } = useQuery({
    queryKey: ["attack-paths", activeScanId],
    queryFn: () => api.attackPaths(activeScanId!),
    enabled: !!activeScanId,
  });
  const { data: resources = [] } = useQuery({
    queryKey: ["inventory", activeScanId],
    queryFn: () => api.inventory(activeScanId!),
    enabled: !!activeScanId,
  });
  const { data: recs = [] } = useQuery({
    queryKey: ["recommendations", activeScanId],
    queryFn: () => api.recommendations(activeScanId!),
    enabled: !!activeScanId,
  });

  const severityCounts = useMemo(() => {
    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.filter((f) => f.status === "open").forEach((f) => counts[f.severity]++);
    return counts;
  }, [findings]);

  const iamRoles = useMemo(() => {
    const roles = resources.filter((r) => r.type === "iam_role");
    return roles
      .map((role) => ({
        role,
        pathCount: paths.filter((p) => p.nodes.some((n) => n.resourceId === role.id)).length,
      }))
      .filter((r) => r.pathCount > 0)
      .sort((a, b) => b.pathCount - a.pathCount);
  }, [resources, paths]);

  const heatmap = useMemo(() => {
    const types = Array.from(new Set(resources.map((r) => r.type)));
    return types
      .map((type) => {
        const row: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
        findings
          .filter((f) => f.resourceType === type && f.status === "open")
          .forEach((f) => (row[f.severity] += 1));
        const total = row.critical + row.high + row.medium + row.low;
        return { type, row, total };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [resources, findings]);

  const topRecs = useMemo(
    () => [...recs].sort((a, b) => b.estRiskReduction - a.estRiskReduction).slice(0, 3),
    [recs],
  );
  const roiReduction = topRecs.reduce((sum, r) => sum + r.estRiskReduction, 0);
  const roiPathsAffected = new Set(topRecs.map((r) => r.attackPathId).filter(Boolean)).size;

  const trendOption = useMemo(
    () => ({
      grid: { left: 36, right: 12, top: 16, bottom: 24 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0d1526",
        borderColor: "#1a2740",
        textStyle: { color: "#e6ecf7" },
        formatter: (params: any) => {
          const p = params[0];
          const point = trend[p.dataIndex];
          return `Scan #${point.scanNumber}<br/>Risk: <b>${point.riskScore}</b><br/>Critical paths: ${point.criticalPaths}`;
        },
      },
      xAxis: {
        type: "category",
        data: trend.map((t) => `#${t.scanNumber}`),
        axisLine: { lineStyle: { color: "#1a2740" } },
        axisLabel: { color: "#7c8aac", fontFamily: "ui-monospace, monospace", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: "#1a2740", type: "dashed" } },
        axisLabel: { color: "#7c8aac", fontSize: 11 },
      },
      series: [
        {
          type: "line",
          data: trend.map((t) => t.riskScore),
          smooth: true,
          symbolSize: 7,
          lineStyle: { color: "#22d3ee", width: 2.5 },
          itemStyle: { color: "#22d3ee" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(34,211,238,0.28)" },
                { offset: 1, color: "rgba(34,211,238,0)" },
              ],
            },
          },
        },
      ],
    }),
    [trend],
  );

  if (scanLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!active) {
    return (
      <EmptyState
        title="No scans yet"
        description="Run your first scan to see attack paths, risk scoring, and remediation guidance here."
        action={<UploadScanDialog trigger={<Button>Run first scan</Button>} />}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <PageHeader
        title="Overview"
        description={`Posture snapshot for ${active ? `Scan #${active.number}` : "—"}, updated on completion of each scan.`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card
          onClick={() => navigate("/risk")}
          className="cursor-pointer justify-between gap-4 p-5 transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
        >
          <div className="flex items-center gap-5">
            <RiskGauge value={active.riskScore} size={148} label="" />
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Composite Risk Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-bold tabular-nums">{active.riskScore}</span>
                {active.riskDelta !== 0 && (
                  <span className={cn("font-mono text-sm font-semibold", active.riskDelta < 0 ? "text-success" : "text-foreground")}>
                    {active.riskDelta > 0 ? "▲" : "▼"} {Math.abs(active.riskDelta)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">vs. Scan #{active.number - 1 || "—"}</p>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <ReactECharts option={trendOption} style={{ height: 130 }} opts={{ renderer: "svg" }} />
          </div>
        </Card>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => navigate("/attack-paths")}
            className="flex flex-1 items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Route className="h-4 w-4 text-primary" /> Critical Attack Paths
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold tabular-nums">
                {paths.filter((p) => p.severity === "critical").length}
              </span>
              {active.criticalPathDelta !== 0 && (
                <span className={cn("font-mono text-xs", active.criticalPathDelta < 0 ? "text-success" : "text-foreground")}>
                  {active.criticalPathDelta > 0 ? "▲" : "▼"}
                  {Math.abs(active.criticalPathDelta)}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => navigate("/findings")}
            className="flex flex-1 items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Open Findings
            </span>
            <span className="flex items-baseline gap-3">
              <span className="font-mono text-xl font-bold tabular-nums">
                {findings.filter((f) => f.status === "open").length}
              </span>
              <span className="flex gap-1.5 font-mono text-[11px]">
                {SEVERITY_ORDER.map((s) => (
                  <span key={s} style={{ color: SEVERITY_VAR[s] }}>
                    {severityCounts[s]}
                  </span>
                ))}
              </span>
            </span>
          </button>
          <button
            onClick={() => navigate("/inventory")}
            className="flex flex-1 items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40"
          >
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Boxes className="h-4 w-4 text-primary" /> Assets Scanned
            </span>
            <span className="font-mono text-xl font-bold tabular-nums">{resources.length}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Top Attack Paths</h3>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/attack-paths")}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          {pathsLoading && <Skeleton className="h-40" />}
          {!pathsLoading && paths.length === 0 && (
            <EmptyState tone="success" title="No exploitable attack paths found in this scan" />
          )}
          <div className="space-y-2">
            {[...paths]
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/attack-paths?path=${p.id}`)}
                  className="flex w-full flex-col gap-2 rounded-md border border-border bg-secondary/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Target: {p.targetAssetName}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={p.severity} />
                      <span className="font-mono text-sm font-semibold tabular-nums">{p.riskScore}</span>
                    </div>
                  </div>
                  <AttackPathChain nodes={p.nodes} compact />
                </button>
              ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Most Dangerous IAM Roles</h3>
          {iamRoles.length === 0 && <EmptyState title="No IAM roles implicated in attack paths" tone="success" />}
          <div className="space-y-2">
            {iamRoles.map(({ role, pathCount }) => (
              <button
                key={role.id}
                onClick={() => navigate("/attack-graph")}
                className="flex w-full items-center justify-between rounded-md border border-border bg-secondary/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
              >
                <div>
                  <div className="font-mono text-sm">{role.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {String(role.attributes.action ?? "")}
                    {" on "}
                    {String(role.attributes.resource ?? "")}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-critical/10 px-2 py-1 font-mono text-xs text-critical">
                  {pathCount} path{pathCount !== 1 ? "s" : ""}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Resource Exposure Heatmap</h3>
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Resource Type</th>
                  {SEVERITY_ORDER.map((s) => (
                    <th key={s} className="pb-2 text-center font-medium capitalize">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map((entry) => (
                  <tr key={entry.type} className="border-t border-border">
                    <td className="py-2 font-mono text-xs capitalize">{entry.type.replace("_", " ")}</td>
                    {SEVERITY_ORDER.map((s) => {
                      const count = entry.row[s];
                      return (
                        <td key={s} className="py-2 text-center">
                          <button
                            onClick={() => navigate(`/findings?type=${entry.type}&severity=${s}`)}
                            className="mx-auto flex h-7 w-7 items-center justify-center rounded font-mono text-xs font-semibold"
                            style={{
                              backgroundColor:
                                count > 0
                                  ? `color-mix(in srgb, ${SEVERITY_VAR[s]} ${count > 1 ? 32 : 16}%, transparent)`
                                  : "transparent",
                              color: count > 0 ? SEVERITY_VAR[s] : "var(--muted-foreground)",
                            }}
                          >
                            {count || "—"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 border-primary/30 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Remediation ROI</h3>
          </div>
          {topRecs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recommendations yet for this scan.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Applying the top {topRecs.length} recommended fixes would reduce risk from{" "}
                <span className="font-mono font-semibold text-foreground">{active.riskScore}</span> to an estimated{" "}
                <span className="font-mono font-semibold text-success">
                  {Math.max(5, active.riskScore - roiReduction)}
                </span>{" "}
                and eliminate {roiPathsAffected} attack path{roiPathsAffected !== 1 ? "s" : ""}.
              </p>
              <Button size="sm" className="w-fit gap-1.5" onClick={() => navigate("/simulator")}>
                Open in Simulator <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </Card>
      </div>

      {findingsLoading && <Skeleton className="h-20" />}
    </div>
  );
}
