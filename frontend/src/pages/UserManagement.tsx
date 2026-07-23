import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";
import type { UserRole } from "@/types/domain";

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Full control, including user management and settings.",
  analyst: "Triggers scans, triages findings, runs simulations.",
  contributor: "Applies fixes, marks recommendations, runs simulations.",
  viewer: "Read-only across all pages, can export reports.",
  auditor: "Read-only, including Audit Logs.",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export function UserManagement() {
  const { workspaceId } = useActiveScan();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users", workspaceId],
    queryFn: () => api.users(workspaceId),
  });

  const invite = useMutation({
    mutationFn: () => api.inviteUser(workspaceId, name, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", workspaceId] });
      toast.success(`${name} invited as ${role}`);
      setOpen(false);
      setName("");
      setEmail("");
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => api.updateUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", workspaceId] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.removeUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", workspaceId] });
      toast.success("User removed");
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <PageHeader
        title="User Management"
        description="Role-based access control. Admin only."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger
              render={
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="h-4 w-4" /> Invite user
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader><DialogTitle>Invite a user</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_DESCRIPTIONS) as UserRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={!name || !email} onClick={() => invite.mutate()}>Send invite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">User</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Last active</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/70 last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback></Avatar>
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Select value={u.role} onValueChange={(v) => changeRole.mutate({ id: u.id, role: v as UserRole })}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROLE_DESCRIPTIONS) as UserRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3">
                  <span className={u.status === "active" ? "text-success text-xs" : "text-medium text-xs"}>
                    {u.status === "active" ? "Active" : "Pending"}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">
                  {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : "—"}
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-critical"
                    onClick={() => {
                      if (window.confirm(`Remove ${u.name} (${u.email}) from this workspace?`)) remove.mutate(u.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
