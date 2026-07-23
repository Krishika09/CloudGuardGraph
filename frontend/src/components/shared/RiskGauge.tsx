import ReactECharts from "echarts-for-react";
import { useMemo } from "react";

interface RiskGaugeProps {
  value: number;
  size?: number;
  label?: string;
}

/** Radial 0-100 risk score gauge. The arc is a monochrome intensity ramp
 * within the accent hue -- risk is a continuous metric, so brightness
 * encodes magnitude rather than a discrete red/amber/green band. */
export function RiskGauge({ value, size = 200, label = "Risk score" }: RiskGaugeProps) {
  const option = useMemo(
    () => ({
      series: [
        {
          type: "gauge",
          startAngle: 220,
          endAngle: -40,
          min: 0,
          max: 100,
          radius: "100%",
          center: ["50%", "58%"],
          progress: { show: false },
          axisLine: {
            lineStyle: {
              width: 14,
              // Sequential intensity ramp within the single accent hue —
              // risk is a continuous metric, so a monochrome gradient reads
              // more correctly than a discrete red/amber/green traffic light.
              color: [
                [0.35, "#1c2942"],
                [0.7, "#3f6a86"],
                [1, "#22d3ee"],
              ],
            },
          },
          pointer: {
            icon: "path://M2,0 L-2,0 L-6,-72 L0,-84 L6,-72 Z",
            width: 6,
            length: "62%",
            itemStyle: { color: "#e6ecf7" },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: true, size: 12, itemStyle: { color: "#e6ecf7" } },
          title: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 34,
            fontWeight: 700,
            fontFamily: "ui-monospace, monospace",
            offsetCenter: [0, "70%"],
            color: "#e6ecf7",
            formatter: (v: number) => Math.round(v).toString(),
          },
          data: [{ value }],
        },
      ],
    }),
    [value],
  );

  return (
    <div className="flex flex-col items-center">
      <ReactECharts option={option} style={{ height: size, width: size }} opts={{ renderer: "svg" }} />
      {label && <span className="-mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>}
    </div>
  );
}
