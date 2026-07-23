import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";

export function AuditLogs() {
  const { workspaceId } = useActiveScan();
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", workspaceId],
    queryFn: () => api.auditLogs(workspaceId),
  });

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1000px] space-y-4">
      <PageHeader
        title="Audit Logs"
        description="Immutable, append-only trail of every consequential action. Read-only by construction — there is no delete or edit action anywhere on this page."
      />
      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Timestamp</th>
              <th className="p-3 font-medium">Actor</th>
              <th className="p-3 font-medium">Action</th>
              <th className="p-3 font-medium">Target</th>
              <th className="p-3 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border/70 last:border-0">
                <td className="whitespace-nowrap p-3 font-mono text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="p-3 text-sm">{log.actor}</td>
                <td className="p-3 font-mono text-xs text-primary">{log.action}</td>
                <td className="p-3 font-mono text-xs">{log.target}</td>
                <td className="p-3 text-xs text-muted-foreground">{log.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
