import { NavLink } from "react-router-dom";
import { ChevronsLeft, ShieldCheck } from "lucide-react";
import { NAV_GROUPS } from "@/config/nav";
import { useAppStore } from "@/store/useAppStore";
import { useNavBadges } from "@/hooks/useNavBadges";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function badgeFor(label: string, badges: ReturnType<typeof useNavBadges>): number {
  switch (label) {
    case "Findings":
      return badges.criticalFindings;
    case "Attack Paths":
      return badges.newPaths;
    case "AI Recommendations":
      return badges.unactionedRecs;
    default:
      return 0;
  }
}

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const badges = useNavBadges();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-150",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 border-b border-sidebar-border px-4", collapsed && "justify-center px-0")}>
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-foreground">CloudGuardGraph</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Prod AWS</div>
          </div>
        )}
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto py-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-3")}>
            {group.label && !collapsed && (
              <div className="px-4 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
            )}
            {group.label && collapsed && <div className="mx-3 my-2 border-t border-sidebar-border" />}
            <ul className="flex flex-col gap-0.5 px-2">
              {group.items.map((item) => {
                const count = badgeFor(item.label, badges);
                const linkBody = (
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/85 transition-colors",
                        collapsed && "justify-center px-0 py-2",
                        isActive
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:left-0 before:top-1 before:h-[calc(100%-8px)] before:w-0.5 before:rounded-full before:bg-primary"
                          : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && count > 0 && (
                      <span className="rounded-full bg-critical/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-critical">
                        {count}
                      </span>
                    )}
                    {collapsed && count > 0 && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-critical" />
                    )}
                  </NavLink>
                );

                if (!collapsed) return <li key={item.to}>{linkBody}</li>;

                return (
                  <li key={item.to}>
                    <Tooltip>
                      <TooltipTrigger render={linkBody} />
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggleSidebar}
        className={cn(
          "flex h-11 items-center gap-2 border-t border-sidebar-border px-4 text-xs text-muted-foreground hover:text-sidebar-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
