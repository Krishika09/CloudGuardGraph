import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  tone = "neutral",
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "success";
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center",
        tone === "success" ? "border-success/30 bg-success/5" : "border-border bg-card/40",
      )}
    >
      {icon}
      <h3 className={cn("text-sm font-semibold", tone === "success" ? "text-success" : "text-foreground")}>{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
