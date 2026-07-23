import type { Severity } from "@/types/domain";

/** CSS custom-property references, not hex literals — the single source of
 * truth for severity color lives in index.css. Severity is an intensity
 * ramp within the accent hue (plus grayscale for "low"), never a
 * red/orange/yellow/green traffic light. */
export const SEVERITY_VAR: Record<Severity, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
};

export const SEVERITY_BARS: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};
