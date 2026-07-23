import type { ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  delta?: number;
  deltaGoodDirection?: "up" | "down";
  sub?: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
}

export function MetricCard({ label, value, delta, deltaGoodDirection = "down", sub, onClick, icon }: MetricCardProps) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const isGood = hasDelta && (deltaGoodDirection === "down" ? delta < 0 : delta > 0);
  const Arrow = hasDelta && delta! > 0 ? ArrowUp : ArrowDown;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "gap-2 border-border/80 bg-card p-4",
        onClick && "cursor-pointer transition-colors hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">{value}</span>
        {hasDelta && (
          <span
            className={cn(
              "flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums",
              isGood ? "text-success" : "text-critical",
            )}
          >
            <Arrow className="h-3 w-3" />
            {Math.abs(delta!)}
          </span>
        )}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}
