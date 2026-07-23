import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useActiveScan } from "./useActiveScan";

/** Sidebar badge counts (Phase 3) -- kept in one hook so every consumer
 * agrees on what counts as "needs attention". */
export function useNavBadges() {
  const { activeScanId } = useActiveScan();

  const findings = useQuery({
    queryKey: ["findings", activeScanId],
    queryFn: () => api.findings(activeScanId!),
    enabled: !!activeScanId,
  });

  const paths = useQuery({
    queryKey: ["attack-paths", activeScanId],
    queryFn: () => api.attackPaths(activeScanId!),
    enabled: !!activeScanId,
  });

  const recs = useQuery({
    queryKey: ["recommendations", activeScanId],
    queryFn: () => api.recommendations(activeScanId!),
    enabled: !!activeScanId,
  });

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: api.notifications,
    refetchInterval: 45_000,
  });

  return {
    criticalFindings: findings.data?.filter((f) => f.severity === "critical" && f.status === "open").length ?? 0,
    newPaths: paths.data?.filter((p) => p.status === "new").length ?? 0,
    unactionedRecs: recs.data?.filter((r) => r.status === "suggested").length ?? 0,
    unreadNotifications: notifications.data?.filter((n) => !n.read).length ?? 0,
    assetsCount: undefined,
  };
}
