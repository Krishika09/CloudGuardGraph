import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCheck, ScanLine, ShieldAlert, Sparkles, FileText, UserCog } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ActivityEvent } from "@/types/domain";

const ICONS: Record<ActivityEvent["type"], typeof ScanLine> = {
  scan_completed: ScanLine,
  scan_failed: ScanLine,
  new_critical_path: ShieldAlert,
  recommendation_ready: Sparkles,
  report_generated: FileText,
  user_role_changed: UserCog,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationsPanel() {
  const open = useAppStore((s) => s.notificationsOpen);
  const setOpen = useAppStore((s) => s.setNotificationsOpen);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });

  const markAllRead = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
        <SheetHeader className="flex-row items-center justify-between border-b border-border">
          <SheetTitle>Notifications</SheetTitle>
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        </SheetHeader>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
          {events.length === 0 && <EmptyState title="You're all caught up" />}
          {events.map((evt) => {
            const Icon = ICONS[evt.type] ?? ScanLine;
            return (
              <button
                key={evt.id}
                onClick={() => {
                  setOpen(false);
                  navigate(evt.href);
                }}
                className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-accent/50"
              >
                <span className="mt-0.5 rounded-md bg-secondary p-1.5">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="flex-1">
                  <span className={evt.read ? "text-muted-foreground" : "font-medium text-foreground"}>
                    {evt.message}
                  </span>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    {timeAgo(evt.timestamp)}
                  </span>
                </span>
                {!evt.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
