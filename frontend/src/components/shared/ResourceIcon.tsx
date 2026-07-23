import {
  Server,
  HardDrive,
  ShieldCheck,
  Flame,
  KeyRound,
  Database,
  Globe,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { ResourceType } from "@/types/domain";
import { cn } from "@/lib/utils";

const ICONS: Record<ResourceType, LucideIcon> = {
  ec2: Server,
  s3: HardDrive,
  iam_role: ShieldCheck,
  iam_policy: ShieldCheck,
  security_group: Flame,
  secret: KeyRound,
  database: Database,
  load_balancer: Waypoints,
  internet: Globe,
};

const COLORS: Record<ResourceType, string> = {
  ec2: "text-primary",
  s3: "text-chart-2",
  iam_role: "text-high",
  iam_policy: "text-high",
  security_group: "text-critical",
  secret: "text-medium",
  database: "text-chart-2",
  load_balancer: "text-primary",
  internet: "text-muted-foreground",
};

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  ec2: "EC2 Instance",
  s3: "S3 Bucket",
  iam_role: "IAM Role",
  iam_policy: "IAM Policy",
  security_group: "Security Group",
  secret: "Secret",
  database: "Database",
  load_balancer: "Load Balancer",
  internet: "Internet",
};

export function ResourceIcon({ type, className }: { type: ResourceType; className?: string }) {
  const Icon = ICONS[type] ?? Server;
  return <Icon className={cn("h-4 w-4 shrink-0", COLORS[type], className)} aria-hidden="true" />;
}

export function ResourceChip({ type, name, className }: { type: ResourceType; name: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-1 font-mono text-xs", className)}>
      <ResourceIcon type={type} />
      {name}
    </span>
  );
}
