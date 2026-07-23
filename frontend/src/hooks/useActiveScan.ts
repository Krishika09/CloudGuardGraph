import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { ScanSummary } from "@/types/domain";

/** Resolves the app's "active scope" (workspace + scan) per Phase 10 of the
 * audit: every scan-scoped page reads from here rather than re-deriving it. */
export function useActiveScan() {
  const workspaceId = useAppStore((s) => s.workspaceId);
  const scanId = useAppStore((s) => s.scanId);

  const scansQuery = useQuery({
    queryKey: ["scans", workspaceId],
    queryFn: () => api.listScans(workspaceId),
    refetchInterval: (query) => (query.state.data?.some((s) => s.status === "running") ? 1500 : false),
  });

  const scans = scansQuery.data ?? [];
  const latest = scans.length ? scans.reduce((a, b) => (a.number > b.number ? a : b)) : undefined;
  const active: ScanSummary | undefined = scanId ? scans.find((s) => s.id === scanId) : latest;

  return {
    workspaceId,
    scans,
    latest,
    active,
    activeScanId: active?.id,
    isLoading: scansQuery.isLoading,
    isError: scansQuery.isError,
  };
}
