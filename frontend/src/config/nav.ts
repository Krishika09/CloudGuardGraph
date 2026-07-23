import {
  Gauge,
  Boxes,
  Flag,
  Share2,
  Route,
  ShieldAlert,
  Sparkles,
  FlaskConical,
  FileText,
  History,
  Settings,
  Users,
  ScrollText,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  quickAction?: string;
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  { label: null, items: [{ to: "/", label: "Overview", icon: Gauge }] },
  {
    label: "Detect",
    items: [
      { to: "/inventory", label: "Cloud Inventory", icon: Boxes, quickAction: "Add scan source" },
      { to: "/findings", label: "Findings", icon: Flag, quickAction: "Export CSV" },
    ],
  },
  {
    label: "Correlate",
    items: [
      { to: "/attack-graph", label: "Attack Graph", icon: Share2 },
      { to: "/attack-paths", label: "Attack Paths", icon: Route, quickAction: "Sort by risk" },
    ],
  },
  { label: "Prioritize", items: [{ to: "/risk", label: "Risk Analysis", icon: ShieldAlert }] },
  {
    label: "Remediate",
    items: [
      { to: "/recommendations", label: "AI Recommendations", icon: Sparkles },
      { to: "/simulator", label: "Simulator", icon: FlaskConical, quickAction: "New scenario" },
    ],
  },
  {
    label: "Prove",
    items: [
      { to: "/reports", label: "Reports", icon: FileText, quickAction: "Generate report" },
      { to: "/scans", label: "Scan History", icon: History, quickAction: "Upload new scan" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/users", label: "User Management", icon: Users },
      { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      { to: "/help", label: "Help", icon: HelpCircle },
    ],
  },
];
