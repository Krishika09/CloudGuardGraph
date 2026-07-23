import type {
  ActivityEvent,
  AttackPath,
  AuditLogEntry,
  CloudResource,
  Finding,
  GraphEdge,
  GraphNode,
  OrgUser,
  Recommendation,
  ReportRecord,
  RiskAnalysis,
  RiskTrendPoint,
  ScanSummary,
  Workspace,
} from "@/types/domain";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listWorkspaces: () => req<Workspace[]>("/workspaces"),
  listScans: (workspaceId: string) => req<ScanSummary[]>(`/workspaces/${workspaceId}/scans`),
  triggerScan: (workspaceId: string) =>
    req<ScanSummary>(`/workspaces/${workspaceId}/scans`, { method: "POST" }),
  riskTrend: (workspaceId: string) => req<RiskTrendPoint[]>(`/workspaces/${workspaceId}/risk-trend`),

  scanSummary: (scanId: string) => req<ScanSummary>(`/scans/${scanId}/summary`),
  inventory: (scanId: string) => req<CloudResource[]>(`/scans/${scanId}/inventory`),
  findings: (scanId: string) => req<Finding[]>(`/scans/${scanId}/findings`),
  suppressFinding: (findingId: string, reason: string, expiry?: string) =>
    req<Finding>(`/findings/${findingId}/suppress`, {
      method: "POST",
      body: JSON.stringify({ reason, expiry }),
    }),

  graph: (scanId: string) => req<{ nodes: GraphNode[]; edges: GraphEdge[] }>(`/scans/${scanId}/graph`),

  attackPaths: (scanId: string) => req<AttackPath[]>(`/scans/${scanId}/attack-paths`),
  attackPathDetail: (pathId: string) => req<AttackPath>(`/attack-paths/${pathId}`),

  risk: (scanId: string) => req<RiskAnalysis>(`/scans/${scanId}/risk`),

  recommendations: (scanId: string) => req<Recommendation[]>(`/scans/${scanId}/recommendations`),
  updateRecommendation: (id: string, status: string) =>
    req<Recommendation>(`/recommendations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  simulate: (scanId: string, recommendationIds: string[]) =>
    req<{
      before: number;
      after: number;
      pathsEliminated: AttackPath[];
      findingsResolved: number;
    }>(`/scans/${scanId}/simulate`, {
      method: "POST",
      body: JSON.stringify({ recommendationIds }),
    }),

  reports: (workspaceId: string) => req<ReportRecord[]>(`/workspaces/${workspaceId}/reports`),
  generateReport: (scanId: string, template: string) =>
    req<ReportRecord>(`/scans/${scanId}/reports`, {
      method: "POST",
      body: JSON.stringify({ template }),
    }),
  reportStatus: (reportId: string) => req<ReportRecord>(`/reports/${reportId}`),
  reportDownloadUrl: (reportId: string) => `${BASE}/reports/${reportId}/download`,

  notifications: () => req<ActivityEvent[]>("/notifications"),
  markAllRead: () => req<{ ok: boolean }>("/notifications/read-all", { method: "POST" }),

  users: (workspaceId: string) => req<OrgUser[]>(`/workspaces/${workspaceId}/users`),
  inviteUser: (workspaceId: string, name: string, email: string, role: string) =>
    req<OrgUser>(`/workspaces/${workspaceId}/users`, {
      method: "POST",
      body: JSON.stringify({ name, email, role }),
    }),
  updateUserRole: (userId: string, role: string) =>
    req<OrgUser>(`/users/${userId}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  removeUser: (userId: string) => req<{ ok: boolean }>(`/users/${userId}`, { method: "DELETE" }),

  auditLogs: (workspaceId: string) => req<AuditLogEntry[]>(`/workspaces/${workspaceId}/audit-logs`),

  settings: (workspaceId: string) => req<Record<string, unknown>>(`/workspaces/${workspaceId}/settings`),
  updateSettings: (workspaceId: string, patch: Record<string, unknown>) =>
    req<Record<string, unknown>>(`/workspaces/${workspaceId}/settings`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
};

export function scanEventsUrl(scanId: string) {
  return `${BASE}/scans/${scanId}/events`;
}
