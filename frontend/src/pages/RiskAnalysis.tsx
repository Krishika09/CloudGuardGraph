import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { RiskGauge } from "@/components/shared/RiskGauge";
import { ResourceIcon } from "@/components/shared/ResourceIcon";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import type { RiskFactorBreakdown } from "@/types/domain";

const FACTOR_LABELS: Record<keyof RiskFactorBreakdown, string> = {
  exposure: "Exposure",
  privilegeLevel: "Privilege Level",
  dataSensitivity: "Data Sensitivity",
  exploitability: "Exploitability",
  dangerousPermissions: "Dangerous Permissions",
};

const FACTOR_TO_CATEGORY: Record<keyof RiskFactorBreakdown, string> = {
  exposure: "exposure",
  privilegeLevel: "over_permission",
  dataSensitivity: "data_exposure",
  exploitability: "privilege_escalation",
  dangerousPermissions: "over_permission",
};

export function RiskAnalysis() {
  const { activeScanId } = useActiveScan();
  const navigate = useNavigate();

  const { data: risk, isLoading } = useQuery({
    queryKey: ["risk", activeScanId],
    queryFn: () => api.risk(activeScanId!),
    enabled: !!activeScanId,
  });

  const factorOption = useMemo(() => {
    if (!risk) return {};
    const entries = Object.entries(risk.factors) as [keyof RiskFactorBreakdown, number][];
    return {
      grid: { left: 130, right: 40, top: 10, bottom: 10 },
      xAxis: { type: "value", min: 0, max: 100, axisLabel: { color: "#7c8aac" }, splitLine: { lineStyle: { color: "#1a2740" } } },
      yAxis: {
        type: "category",
        data: entries.map(([k]) => FACTOR_LABELS[k]),
        axisLabel: { color: "#c7d2e6", fontSize: 12 },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: entries.map(([, v]) => v),
          barWidth: 18,
          itemStyle: { color: "#22d3ee", borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: "right", color: "#e6ecf7", fontFamily: "ui-monospace", fontWeight: 600 },
        },
      ],
    };
  }, [risk]);

  const distOption = useMemo(() => {
    if (!risk) return {};
    return {
      grid: { left: 36, right: 12, top: 10, bottom: 24 },
      xAxis: {
        type: "category",
        data: risk.distribution.map((d) => d.bucket),
        axisLabel: { color: "#7c8aac", fontSize: 11 },
        axisLine: { lineStyle: { color: "#1a2740" } },
      },
      yAxis: { type: "value", axisLabel: { color: "#7c8aac" }, splitLine: { lineStyle: { color: "#1a2740", type: "dashed" } } },
      series: [
        {
          type: "bar",
          data: risk.distribution.map((d) => d.count),
          itemStyle: { color: "#6d8cff", borderRadius: [4, 4, 0, 0] },
          barWidth: "50%",
        },
      ],
    };
  }, [risk]);

  if (isLoading || !risk) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <PageHeader
        title="Risk Analysis"
        description="How the composite risk score breaks down — for justifying prioritization with numbers, not opinion."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center p-6">
          <RiskGauge value={risk.compositeScore} size={200} label="Composite risk score" />
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Contributing factors</h3>
          <p className="mb-2 text-xs text-muted-foreground">Click a factor to see the findings behind it.</p>
          <ReactECharts
            option={factorOption}
            style={{ height: 200 }}
            opts={{ renderer: "svg" }}
            onEvents={{
              click: (p: { name: string }) => {
                const entry = (Object.entries(FACTOR_LABELS) as [keyof RiskFactorBreakdown, string][]).find(
                  ([, label]) => label === p.name,
                );
                if (entry) navigate(`/findings?category=${FACTOR_TO_CATEGORY[entry[0]]}`);
              },
            }}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Risk Distribution Across Attack Paths</h3>
          <ReactECharts option={distOption} style={{ height: 200 }} opts={{ renderer: "svg" }} />
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Risk by Asset</h3>
          <div className="space-y-2">
            {risk.byAsset.map((a) => (
              <div key={a.resourceId} className="flex items-center gap-3">
                <ResourceIcon type={a.resourceType} />
                <span className="flex-1 truncate font-mono text-xs">{a.resourceName}</span>
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-critical"
                    style={{ width: `${a.contribution}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-xs font-semibold tabular-nums">{a.contribution}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
