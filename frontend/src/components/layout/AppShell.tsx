import { Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "./Sidebar";
import { TopHeader } from "./TopHeader";
import { NotificationsPanel } from "./NotificationsPanel";
import { CommandPalette } from "./CommandPalette";
import { ScanProgressWatcher } from "./ScanProgressWatcher";

export function AppShell() {
  return (
    <TooltipProvider delay={150}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader />
          <main className="grid-backdrop min-h-[calc(100vh-56px)] flex-1 px-6 py-6">
            <Outlet />
          </main>
        </div>
      </div>
      <NotificationsPanel />
      <CommandPalette />
      <ScanProgressWatcher />
    </TooltipProvider>
  );
}
