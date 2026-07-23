import { cn } from "@/lib/utils";

type Tone = "accent" | "success" | "muted" | "warning";

const toneStyles: Record<Tone, string> = {
  accent: "bg-primary/15 text-primary border-primary/30",
  success: "bg-success/15 text-success border-success/30",
  muted: "bg-muted text-muted-foreground border-border",
  warning: "bg-medium/15 text-medium border-medium/30",
};

const statusTone: Record<string, Tone> = {
  new: "accent",
  existing: "muted",
  resolved: "success",
  suggested: "accent",
  applied: "success",
  dismissed: "muted",
  suppressed: "warning",
  open: "muted",
  active: "success",
  invited: "warning",
  ready: "success",
  generating: "accent",
  failed: "warning",
  success: "success",
  running: "accent",
};

const statusLabel: Record<string, string> = {
  new: "New",
  existing: "Existing",
  resolved: "Resolved",
  suggested: "Suggested",
  applied: "Applied",
  dismissed: "Dismissed",
  suppressed: "Suppressed",
  open: "Open",
  active: "Active",
  invited: "Invited",
  ready: "Ready",
  generating: "Generating…",
  failed: "Failed",
  success: "Success",
  running: "Running",
};

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const tone = statusTone[status] ?? "muted";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {statusLabel[status] ?? status}
    </span>
  );
}
