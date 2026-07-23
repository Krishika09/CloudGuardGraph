import { ChevronRight } from "lucide-react";
import { ResourceIcon } from "./ResourceIcon";
import type { AttackPathNode } from "@/types/domain";
import { cn } from "@/lib/utils";

export function AttackPathChain({
  nodes,
  compact = false,
  onNodeClick,
}: {
  nodes: AttackPathNode[];
  compact?: boolean;
  onNodeClick?: (resourceId: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {nodes.map((node, i) => (
        <div key={node.resourceId} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onNodeClick?.(node.resourceId)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono transition-colors",
              compact ? "text-[11px]" : "text-xs",
              onNodeClick && "hover:border-primary/50 hover:bg-accent cursor-pointer",
            )}
          >
            <ResourceIcon type={node.resourceType} className="h-3.5 w-3.5" />
            {node.resourceName}
          </button>
          {i < nodes.length - 1 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}
