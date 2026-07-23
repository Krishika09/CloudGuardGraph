import { cn } from "@/lib/utils";
import { SEVERITY_VAR, SEVERITY_BARS, SEVERITY_LABEL } from "@/lib/severity";
import type { Severity } from "@/types/domain";

/** Severity as a 4-bar signal/intensity glyph in the single accent hue,
 * not a red/orange/yellow/green pill. Bar count encodes rank; color
 * encodes intensity (critical = brightest, low = grayscale only). */
function SignalBars({ severity }: { severity: Severity }) {
  const filled = SEVERITY_BARS[severity];
  const color = SEVERITY_VAR[severity];
  return (
    <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px]"
          style={{
            height: 4 + i * 2.5,
            backgroundColor: i < filled ? color : "var(--border)",
          }}
        />
      ))}
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide", className)}
      style={{ color: SEVERITY_VAR[severity] }}
      aria-label={`${SEVERITY_LABEL[severity]} severity`}
    >
      <SignalBars severity={severity} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
