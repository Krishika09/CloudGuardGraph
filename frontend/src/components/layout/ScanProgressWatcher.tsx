import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { scanEventsUrl } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { ScanSummary } from "@/types/domain";

/** Mounted once at the app shell. Owns the SSE connection that both drives
 * and reflects live scan-pipeline progress (Phase 6 of the audit) --
 * independent of whatever page the user happens to be looking at. */
export function ScanProgressWatcher() {
  const scanId = useAppStore((s) => s.activeUploadScanId);
  const workspaceId = useAppStore((s) => s.workspaceId);
  const setActiveUploadScanId = useAppStore((s) => s.setActiveUploadScanId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!scanId) return;

    const source = new EventSource(scanEventsUrl(scanId));

    source.addEventListener("stage", (event) => {
      const scan = JSON.parse((event as MessageEvent).data) as ScanSummary;
      queryClient.setQueryData<ScanSummary[]>(["scans", workspaceId], (prev) =>
        prev ? prev.map((s) => (s.id === scan.id ? scan : s)) : prev,
      );
    });

    source.addEventListener("done", () => {
      queryClient.invalidateQueries({ queryKey: ["scans", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["risk-trend", workspaceId] });
      source.close();
      setActiveUploadScanId(null);

      const scans = queryClient.getQueryData<ScanSummary[]>(["scans", workspaceId]);
      const finished = scans?.find((s) => s.id === scanId);
      if (finished?.status === "success") {
        const arrow = finished.riskDelta > 0 ? "▲" : finished.riskDelta < 0 ? "▼" : "•";
        toast.success(`Scan #${finished.number} completed`, {
          description: `Risk score ${finished.riskScore} (${arrow} ${Math.abs(finished.riskDelta)})`,
        });
      } else {
        toast.error("Scan failed to complete");
      }
    });

    source.onerror = () => {
      source.close();
    };

    return () => source.close();
  }, [scanId, workspaceId, queryClient, setActiveUploadScanId]);

  return null;
}
