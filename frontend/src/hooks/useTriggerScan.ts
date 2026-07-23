import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export function useTriggerScan() {
  const queryClient = useQueryClient();
  const workspaceId = useAppStore((s) => s.workspaceId);
  const setActiveUploadScanId = useAppStore((s) => s.setActiveUploadScanId);

  return useMutation({
    mutationFn: () => api.triggerScan(workspaceId),
    onSuccess: (scan) => {
      queryClient.invalidateQueries({ queryKey: ["scans", workspaceId] });
      setActiveUploadScanId(scan.id);
      toast.info(`Scan #${scan.number} started`, {
        description: "Running the parser → detector → graph → attack-path → risk pipeline…",
      });
    },
    onError: () => {
      toast.error("Could not start a new scan");
    },
  });
}
