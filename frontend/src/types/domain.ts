export type Severity = "critical" | "high" | "medium" | "low";

export type ResourceType =
  | "ec2"
  | "s3"
  | "iam_role"
  | "iam_policy"
  | "security_group"
  | "secret"
  | "database"
  | "load_balancer"
  | "internet";

export interface Workspace {
  id: string;
  name: string;
  environmentLabel: string;
  provider: "aws";
}

export type ScanStatus = "success" | "failed" | "running" | "queued";

export type PipelineStage =
  | "parser"
  | "detector"
  | "graph_builder"
  | "attack_path_engine"
  | "risk_engine"
  | "explainability"
  | "ai_remediation"
  | "simulation_preview";

export interface ScanSummary {
  id: string;
  number: number;
  workspaceId: string;
  status: ScanStatus;
  triggeredBy: string;
  triggeredAt: string;
  finishedAt?: string;
  riskScore: number;
  riskDelta: number;
  criticalPathCount: number;
  criticalPathDelta: number;
  findingsCount: number;
  assetsCount: number;
  currentStage?: PipelineStage;
  currentStageIndex?: number;
  failedStage?: PipelineStage;
  failureReason?: string;
}

export interface CloudResource {
  id: string;
  name: string;
  type: ResourceType;
  isPublic: boolean;
  tags: Record<string, string>;
  findingsCount: number;
  worstSeverity?: Severity;
  connections: number;
  sourceSnippet?: string;
  attributes: Record<string, string | number | boolean>;
}

export type FindingCategory =
  | "exposure"
  | "over_permission"
  | "data_exposure"
  | "privilege_escalation"
  | "secrets";

export type FindingStatus = "open" | "suppressed";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  ruleId: string;
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  status: FindingStatus;
  partOfAttackPath: boolean;
  attackPathIds: string[];
  detectedInScan: number;
  description: string;
  configSnippet: string;
  suppressReason?: string;
  suppressExpiry?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: ResourceType;
  worstSeverity?: Severity;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  onCriticalPath?: boolean;
}

export interface AttackPathNode {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
}

export interface AttackPath {
  id: string;
  targetAssetId: string;
  targetAssetName: string;
  entryPoint: "internet" | "internal";
  riskScore: number;
  severity: Severity;
  hops: number;
  status: "new" | "existing" | "resolved";
  nodes: AttackPathNode[];
  contributingFindingIds: string[];
  explanation: string[];
  recommendationId?: string;
}

export interface RiskFactorBreakdown {
  exposure: number;
  privilegeLevel: number;
  dataSensitivity: number;
  exploitability: number;
  dangerousPermissions: number;
}

export interface RiskByAsset {
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  contribution: number;
}

export interface RiskAnalysis {
  compositeScore: number;
  factors: RiskFactorBreakdown;
  distribution: { bucket: string; count: number }[];
  byAsset: RiskByAsset[];
}

export type RecommendationStatus = "suggested" | "applied" | "dismissed";
export type RecommendationEffort = "low" | "medium" | "high";

export interface Recommendation {
  id: string;
  findingId: string;
  attackPathId?: string;
  title: string;
  summary: string;
  resourceName: string;
  estRiskReduction: number;
  effort: RecommendationEffort;
  status: RecommendationStatus;
  diffBefore: string;
  diffAfter: string;
  modelAttribution: string;
  generating?: boolean;
}

export interface SimulationDelta {
  before: number;
  after: number;
  pathsEliminated: AttackPath[];
  findingsResolved: number;
}

export interface RiskTrendPoint {
  scanNumber: number;
  date: string;
  riskScore: number;
  criticalPaths: number;
}

export interface ActivityEvent {
  id: string;
  type:
    | "scan_completed"
    | "scan_failed"
    | "new_critical_path"
    | "recommendation_ready"
    | "report_generated"
    | "user_role_changed";
  message: string;
  timestamp: string;
  read: boolean;
  href: string;
}

export type UserRole = "admin" | "analyst" | "contributor" | "viewer" | "auditor";

export interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited";
  lastActive?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
}

export interface ReportRecord {
  id: string;
  name: string;
  template: "executive_summary" | "full_technical" | "remediation_proof";
  scanNumber: number;
  generatedAt: string;
  status: "ready" | "generating" | "failed";
}
