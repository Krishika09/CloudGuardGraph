import { useMemo, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Table2, Waypoints, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { ResourceIcon, RESOURCE_TYPE_LABEL } from "@/components/shared/ResourceIcon";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { SEVERITY_VAR } from "@/lib/severity";
import type { GraphNode as GNode, ResourceType, Severity } from "@/types/domain";

function CustomNode({ data }: NodeProps) {
  const d = data as unknown as { label: string; type: ResourceType; worstSeverity?: Severity; dimmed?: boolean };
  const borderColor = d.worstSeverity ? SEVERITY_VAR[d.worstSeverity] : "var(--border)";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border-2 bg-card px-3 py-2 font-mono text-xs shadow-sm transition-opacity",
        d.dimmed && "opacity-25",
      )}
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Left} className="!bg-border" />
      <ResourceIcon type={d.type} />
      {d.label}
      <Handle type="source" position={Position.Right} className="!bg-border" />
    </div>
  );
}

const nodeTypes = { resource: CustomNode };

function layout(nodes: GNode[], edges: { source: string; target: string }[]) {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => adjacency.set(n.id, []));
  edges.forEach((e) => adjacency.get(e.source)?.push(e.target));

  const root = nodes.find((n) => n.type === "internet")?.id ?? nodes[0]?.id;
  const level = new Map<string, number>();
  const queue: [string, number][] = root ? [[root, 0]] : [];
  const visited = new Set<string>();
  while (queue.length) {
    const [id, lvl] = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    level.set(id, lvl);
    for (const next of adjacency.get(id) ?? []) queue.push([next, lvl + 1]);
  }
  let maxLevel = 0;
  nodes.forEach((n) => {
    if (!level.has(n.id)) level.set(n.id, 0);
    maxLevel = Math.max(maxLevel, level.get(n.id)!);
  });

  const perLevelCount = new Map<number, number>();
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((n) => {
    const lvl = level.get(n.id)!;
    const idx = perLevelCount.get(lvl) ?? 0;
    perLevelCount.set(lvl, idx + 1);
    positions.set(n.id, { x: lvl * 240, y: idx * 90 });
  });
  return positions;
}

export function AttackGraph() {
  const { activeScanId } = useActiveScan();
  const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [tableView, setTableView] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["graph", activeScanId],
    queryFn: () => api.graph(activeScanId!),
    enabled: !!activeScanId,
  });

  const positions = useMemo(() => (data ? layout(data.nodes, data.edges) : new Map()), [data]);

  const neighborIds = useMemo(() => {
    if (!focusId || !data) return null;
    const ids = new Set([focusId]);
    data.edges.forEach((e) => {
      if (e.source === focusId) ids.add(e.target);
      if (e.target === focusId) ids.add(e.source);
    });
    return ids;
  }, [focusId, data]);

  const nodes: Node[] = useMemo(
    () =>
      (data?.nodes ?? [])
        .filter((n) => !severityFilter || n.worstSeverity === severityFilter || n.type === "internet")
        .map((n) => ({
          id: n.id,
          type: "resource",
          position: positions.get(n.id) ?? { x: 0, y: 0 },
          data: {
            label: n.label,
            type: n.type,
            worstSeverity: n.worstSeverity,
            dimmed: neighborIds ? !neighborIds.has(n.id) : false,
          },
        })),
    [data, positions, severityFilter, neighborIds],
  );

  const edges: Edge[] = useMemo(
    () =>
      (data?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relationship,
        animated: e.onCriticalPath,
        style: {
          stroke: e.onCriticalPath ? "#22d3ee" : "#2a3652",
          strokeWidth: e.onCriticalPath ? 2 : 1,
          opacity: neighborIds ? (neighborIds.has(e.source) && neighborIds.has(e.target) ? 1 : 0.15) : 1,
        },
        labelStyle: { fill: "#7c8aac", fontSize: 10, fontFamily: "ui-monospace" },
      })),
    [data, neighborIds],
  );

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    setFocusId((prev) => (prev === node.id ? null : node.id));
  }, []);

  if (isLoading) return <Skeleton className="h-[600px]" />;

  if (!data || data.nodes.length === 0) {
    return <EmptyState title="Graph has no edges yet" description="Resources exist but no relationships were detected." />;
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-120px)] max-w-[1400px] flex-col">
      <PageHeader
        title="Attack Graph"
        description="Explore how resources connect — click a node to focus its neighborhood."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              {(["critical", "high", "medium", "low"] as Severity[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter((f) => (f === s ? null : s))}
                  className="h-5 w-5 rounded-full border-2"
                  style={{
                    borderColor: SEVERITY_VAR[s],
                    backgroundColor: severityFilter === s ? SEVERITY_VAR[s] : "transparent",
                  }}
                  title={s}
                />
              ))}
            </div>
            {focusId && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFocusId(null)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset focus
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTableView((v) => !v)}>
              {tableView ? <Waypoints className="h-3.5 w-3.5" /> : <Table2 className="h-3.5 w-3.5" />}
              {tableView ? "View as graph" : "View as table"}
            </Button>
          </div>
        }
      />

      {tableView ? (
        <Card className="scrollbar-thin flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2">Source</th>
                <th className="pb-2">Relationship</th>
                <th className="pb-2">Target</th>
                <th className="pb-2">On critical path</th>
              </tr>
            </thead>
            <tbody>
              {data.edges.map((e) => {
                const src = data.nodes.find((n) => n.id === e.source);
                const tgt = data.nodes.find((n) => n.id === e.target);
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="py-2 font-mono text-xs">{src?.label}</td>
                    <td className="py-2 text-xs text-muted-foreground">{e.relationship}</td>
                    <td className="py-2 font-mono text-xs">{tgt?.label}</td>
                    <td className="py-2 text-xs">{e.onCriticalPath ? "Yes" : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="flex-1 overflow-hidden p-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background color="#1a2740" gap={24} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(7,11,22,0.7)"
              nodeColor={(n) => {
                const sev = (n.data as any)?.worstSeverity as Severity | undefined;
                return sev ? SEVERITY_VAR[sev] : "#2a3652";
              }}
            />
          </ReactFlow>
        </Card>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Node types: {Object.values(RESOURCE_TYPE_LABEL).join(" · ")}
      </p>
    </div>
  );
}
