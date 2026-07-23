import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Download, Link2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/PageHeader";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { StatusChip } from "@/components/shared/StatusChip";
import { ResourceIcon } from "@/components/shared/ResourceIcon";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Finding, Severity } from "@/types/domain";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export function Findings() {
  const { activeScanId } = useActiveScan();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set());
  const [pathOnly, setPathOnly] = useState(false);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [suppressReason, setSuppressReason] = useState("");
  const [suppressExpiry, setSuppressExpiry] = useState("");

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["findings", activeScanId],
    queryFn: () => api.findings(activeScanId!),
    enabled: !!activeScanId,
  });

  const typeFilter = params.get("type");
  const categoryFilter = params.get("category");
  const findingParam = params.get("finding");

  useEffect(() => {
    if (findingParam && findings.length) {
      const match = findings.find((f) => f.id === findingParam);
      if (match) setSelected(match);
    }
  }, [findingParam, findings]);

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter.size > 0 && !severityFilter.has(f.severity)) return false;
      if (pathOnly && !f.partOfAttackPath) return false;
      if (typeFilter && f.resourceType !== typeFilter) return false;
      if (categoryFilter && f.category !== categoryFilter) return false;
      return true;
    });
  }, [findings, severityFilter, pathOnly, typeFilter, categoryFilter]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.filter((f) => f.status === "open").forEach((f) => c[f.severity]++);
    return c;
  }, [findings]);

  function toggleSeverity(s: Severity) {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  async function handleSuppress() {
    if (!selected) return;
    await api.suppressFinding(selected.id, suppressReason, suppressExpiry || undefined);
    toast.success("Finding suppressed", { description: suppressReason });
    queryClient.invalidateQueries({ queryKey: ["findings", activeScanId] });
    setSelected(null);
    setSuppressReason("");
    setSuppressExpiry("");
  }

  function exportCsv() {
    const header = "Title,Severity,Category,Resource,Status,Rule ID\n";
    const rows = filtered
      .map((f) => [f.title, f.severity, f.category, f.resourceName, f.status, f.ruleId].join(","))
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "findings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columnDefs: ColDef<Finding>[] = [
    {
      field: "severity",
      headerName: "Severity",
      width: 130,
      cellRenderer: (p: ICellRendererParams<Finding>) => <SeverityBadge severity={p.value} />,
    },
    { field: "title", headerName: "Finding", flex: 2, minWidth: 260 },
    {
      field: "resourceName",
      headerName: "Resource",
      flex: 1,
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Finding>) => (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs">
          <ResourceIcon type={p.data!.resourceType} className="h-3.5 w-3.5" />
          {p.value}
        </span>
      ),
    },
    {
      field: "category",
      headerName: "Category",
      width: 170,
      valueFormatter: (p) => String(p.value).replace(/_/g, " "),
    },
    { field: "ruleId", headerName: "Rule ID", width: 130, cellClass: "font-mono text-xs" },
    {
      field: "partOfAttackPath",
      headerName: "Attack Path",
      width: 120,
      cellRenderer: (p: ICellRendererParams<Finding>) =>
        p.value ? (
          <span className="inline-flex items-center gap-1 text-xs text-critical">
            <Link2 className="h-3.5 w-3.5" /> Yes
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      cellRenderer: (p: ICellRendererParams<Finding>) => <StatusChip status={p.value} />,
    },
    { field: "detectedInScan", headerName: "Scan", width: 90, valueFormatter: (p) => `#${p.value}` },
  ];

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <PageHeader
        title="Findings"
        description="Every misconfiguration the detector identified for this scan — the exhaustive compliance view."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => toggleSeverity(s)}
            className={cn(
              "flex items-center gap-1.5 transition-opacity",
              severityFilter.size > 0 && !severityFilter.has(s) && "opacity-40",
            )}
          >
            <SeverityBadge severity={s} className="cursor-pointer" />
            <span className="font-mono text-xs text-muted-foreground">{counts[s]}</span>
          </button>
        ))}
        <div className="mx-2 h-4 w-px bg-border" />
        <button
          onClick={() => setPathOnly((p) => !p)}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            pathOnly ? "border-critical/40 bg-critical/10 text-critical" : "border-border text-muted-foreground",
          )}
        >
          Part of an attack path
        </button>
        {(severityFilter.size > 0 || pathOnly || typeFilter) && (
          <button
            className="text-xs text-muted-foreground underline"
            onClick={() => {
              setSeverityFilter(new Set());
              setPathOnly(false);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          tone={findings.length === 0 ? "success" : "neutral"}
          title={findings.length === 0 ? "No misconfigurations detected in this scan" : "No findings match these filters"}
        />
      ) : (
        <div className="ag-theme-quartz-dark h-[560px] overflow-hidden rounded-lg border border-border" style={{ ["--ag-wrapper-border-radius" as any]: "0" }}>
          <AgGridReact<Finding>
            theme="legacy"
            rowData={filtered}
            columnDefs={columnDefs}
            defaultColDef={{ sortable: true, resizable: true }}
            rowSelection={{ mode: "singleRow" }}
            pagination
            paginationPageSize={20}
            onRowClicked={(e) => setSelected(e.data ?? null)}
            rowClass="cursor-pointer"
            getRowId={(p) => p.data.id}
          />
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader className="border-b border-border">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={selected.severity} />
                  <StatusChip status={selected.status} />
                </div>
                <SheetTitle className="text-left">{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 p-4">
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Resource</div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 font-mono text-xs">
                    <ResourceIcon type={selected.resourceType} className="h-3.5 w-3.5" />
                    {selected.resourceName}
                  </span>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Why this was flagged
                  </div>
                  <p className="text-sm text-foreground">{selected.description}</p>
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Offending configuration
                  </div>
                  <pre className="scrollbar-thin overflow-x-auto rounded-md border border-border bg-secondary/50 p-3 font-mono text-xs leading-relaxed">
                    {selected.configSnippet}
                  </pre>
                </div>
                {selected.partOfAttackPath && (
                  <div className="rounded-md border border-critical/30 bg-critical/5 p-3 text-sm">
                    This finding contributes to {selected.attackPathIds.length} attack path
                    {selected.attackPathIds.length !== 1 ? "s" : ""}.{" "}
                    <a href={`/attack-paths?path=${selected.attackPathIds[0]}`} className="text-primary underline">
                      View attack path
                    </a>
                  </div>
                )}

                {selected.status === "open" ? (
                  <div className="space-y-2 border-t border-border pt-4">
                    <Label htmlFor="reason">Suppress with justification</Label>
                    <Textarea
                      id="reason"
                      placeholder="Why is this an acceptable risk?"
                      value={suppressReason}
                      onChange={(e) => setSuppressReason(e.target.value)}
                    />
                    <Label htmlFor="expiry">Risk acceptance expires</Label>
                    <Input id="expiry" type="date" value={suppressExpiry} onChange={(e) => setSuppressExpiry(e.target.value)} />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      disabled={!suppressReason}
                      onClick={handleSuppress}
                    >
                      <ShieldOff className="h-3.5 w-3.5" /> Suppress finding
                    </Button>
                  </div>
                ) : (
                  selected.suppressReason && (
                    <div className="rounded-md border border-medium/30 bg-medium/5 p-3 text-sm">
                      <div className="font-medium text-medium">Suppressed</div>
                      <p className="text-muted-foreground">{selected.suppressReason}</p>
                      {selected.suppressExpiry && (
                        <p className="mt-1 text-xs text-muted-foreground">Expires {selected.suppressExpiry}</p>
                      )}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
