import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusChip } from "@/components/shared/StatusChip";
import { EmptyState } from "@/components/shared/EmptyState";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { id: "executive_summary", label: "Executive Summary", desc: "2-3 pages, manager-facing posture snapshot." },
  { id: "full_technical", label: "Full Technical Assessment", desc: "Every finding, path, risk score and recommendation." },
  { id: "remediation_proof", label: "Remediation Proof", desc: "Before/after simulation focus." },
] as const;

export function Reports() {
  const { workspaceId, active } = useActiveScan();
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]["id"]>("executive_summary");

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", workspaceId],
    queryFn: () => api.reports(workspaceId),
  });

  const generate = useMutation({
    mutationFn: () => api.generateReport(active!.id, template),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports", workspaceId] }),
  });

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1000px] space-y-4">
      <PageHeader
        title="Reports"
        description="The bridge to people who will never log into the dashboard — auditors, boards, security questionnaires."
      />

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Generate a report</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTemplate(t.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                template === t.id ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30",
              )}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
        <Button
          className="mt-4 gap-1.5"
          disabled={!active || generate.isPending}
          onClick={() => generate.mutate()}
        >
          {generate.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <FileText className="h-4 w-4" /> Generate PDF for Scan #{active?.number ?? "—"}
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Report history</h3>
        {reports.length === 0 ? (
          <EmptyState title="No reports generated yet" />
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.generatedAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusChip status={r.status} />
                  {r.status === "ready" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      render={
                        <a href={api.reportDownloadUrl(r.id)} download>
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
