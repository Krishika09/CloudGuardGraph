import { Search, Bell, Plus, ChevronDown, Loader2, CircleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/store/useAppStore";
import { useActiveScan } from "@/hooks/useActiveScan";
import { useNavBadges } from "@/hooks/useNavBadges";
import { UploadScanDialog } from "./UploadScanDialog";
import { NAV_GROUPS } from "@/config/nav";
import { api } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  parser: "Reading configuration files",
  detector: "Scanning for misconfigurations",
  graph_builder: "Building resource graph",
  attack_path_engine: "Discovering attack paths",
  risk_engine: "Calculating risk scores",
  explainability: "Generating explanations",
  ai_remediation: "Drafting recommendations",
  simulation_preview: "Estimating remediation ROI",
};
const STAGE_COUNT = 8;

function currentPageLabel(pathname: string) {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.to === pathname) return item.label;
    }
  }
  return "Overview";
}

export function TopHeader() {
  const { pathname } = useLocation();
  const { scans, active } = useActiveScan();
  const scanId = useAppStore((s) => s.scanId);
  const setScanId = useAppStore((s) => s.setScanId);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setNotificationsOpen = useAppStore((s) => s.setNotificationsOpen);
  const badges = useNavBadges();

  const { data: workspaces = [] } = useQuery({ queryKey: ["workspaces"], queryFn: api.listWorkspaces });
  const workspace = workspaces[0];

  const runningScan = scans.find((s) => s.status === "running");

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-1.5 px-2 font-medium">
                {workspace?.name ?? "Workspace"}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuItem>{workspace?.name ?? "Prod AWS"}</DropdownMenuItem>
            <DropdownMenuItem disabled>Sandbox Demo (coming soon)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-border">/</span>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-1.5 px-2 font-mono text-sm">
                {active ? `Scan #${active.number}${scanId ? "" : " (Latest)"}` : "—"}
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Select scan</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setScanId(null)}>Latest</DropdownMenuItem>
            <DropdownMenuSeparator />
            {[...scans]
              .sort((a, b) => b.number - a.number)
              .map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => setScanId(s.id)}>
                  Scan #{s.number} · risk {s.riskScore} · {s.status}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="hidden text-sm text-muted-foreground md:inline">
          / <span className="text-foreground">{currentPageLabel(pathname)}</span>
        </span>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="ml-2 flex flex-1 max-w-md items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40"
        >
          <Search className="h-3.5 w-3.5" />
          Search assets, findings, attack paths…
          <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {runningScan && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Scanning… {STAGE_LABELS[runningScan.currentStage ?? "parser"]} (
              {(runningScan.currentStageIndex ?? 0) + 1}/{STAGE_COUNT})
            </div>
          )}
          {scans.some((s) => s.status === "failed") && !runningScan && (
            <div className="flex items-center gap-1.5 rounded-md border border-critical/30 bg-critical/10 px-2.5 py-1.5 text-xs text-critical">
              <CircleAlert className="h-3.5 w-3.5" /> Last scan failed
            </div>
          )}

          <UploadScanDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New Scan
              </Button>
            }
          />

          <Button variant="ghost" size="icon" className="relative" onClick={() => setNotificationsOpen(true)}>
            <Bell className="h-4.5 w-4.5" />
            {badges.unreadNotifications > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-critical" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/50">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">AR</AvatarFallback>
                  </Avatar>
                </button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                Alex Romero
                <div className="font-mono text-[11px] font-normal text-muted-foreground">Security Analyst</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/settings">Settings</Link>} />
              <DropdownMenuItem render={<Link to="/help">Help</Link>} />
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
