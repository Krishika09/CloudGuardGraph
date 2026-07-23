import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/skeleton";

const Overview = lazy(() => import("@/pages/Overview").then((m) => ({ default: m.Overview })));
const CloudInventory = lazy(() => import("@/pages/CloudInventory").then((m) => ({ default: m.CloudInventory })));
const Findings = lazy(() => import("@/pages/Findings").then((m) => ({ default: m.Findings })));
const AttackGraph = lazy(() => import("@/pages/AttackGraph").then((m) => ({ default: m.AttackGraph })));
const AttackPaths = lazy(() => import("@/pages/AttackPaths").then((m) => ({ default: m.AttackPaths })));
const RiskAnalysis = lazy(() => import("@/pages/RiskAnalysis").then((m) => ({ default: m.RiskAnalysis })));
const Recommendations = lazy(() => import("@/pages/Recommendations").then((m) => ({ default: m.Recommendations })));
const Simulator = lazy(() => import("@/pages/Simulator").then((m) => ({ default: m.Simulator })));
const Reports = lazy(() => import("@/pages/Reports").then((m) => ({ default: m.Reports })));
const ScanHistory = lazy(() => import("@/pages/ScanHistory").then((m) => ({ default: m.ScanHistory })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const UserManagement = lazy(() => import("@/pages/UserManagement").then((m) => ({ default: m.UserManagement })));
const AuditLogs = lazy(() => import("@/pages/AuditLogs").then((m) => ({ default: m.AuditLogs })));
const Help = lazy(() => import("@/pages/Help").then((m) => ({ default: m.Help })));

function PageFallback() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Overview />} />
          <Route path="/inventory" element={<CloudInventory />} />
          <Route path="/findings" element={<Findings />} />
          <Route path="/attack-graph" element={<AttackGraph />} />
          <Route path="/attack-paths" element={<AttackPaths />} />
          <Route path="/risk" element={<RiskAnalysis />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/scans" element={<ScanHistory />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/help" element={<Help />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
