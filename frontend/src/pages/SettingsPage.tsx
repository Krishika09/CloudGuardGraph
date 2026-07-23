import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  exposure: "Exposure",
  over_permission: "Over-permission",
  data_exposure: "Data exposure",
  privilege_escalation: "Privilege escalation",
  secrets: "Secrets",
};

export function SettingsPage() {
  const { workspaceId } = useActiveScan();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", workspaceId],
    queryFn: () => api.settings(workspaceId),
  });
  const [local, setLocal] = useState<Record<string, any>>({});

  useEffect(() => {
    if (settings) setLocal(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.updateSettings(workspaceId, patch),
    onSuccess: (data) => {
      queryClient.setQueryData(["settings", workspaceId], data);
      toast.success("Settings saved");
    },
  });

  if (isLoading || !local.ruleCategories) return <Skeleton className="h-96" />;

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <PageHeader title="Settings" description="Workspace, scan, and AI model configuration." />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rules">Scan Rules</TabsTrigger>
          <TabsTrigger value="ai">AI Configuration</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="space-y-4 p-4">
            <div className="space-y-1.5">
              <Label>Workspace name</Label>
              <Input value={local.generalName ?? ""} onChange={(e) => setLocal({ ...local, generalName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Select value={local.timezone} onValueChange={(v) => setLocal({ ...local, timezone: v })}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">America/New York</SelectItem>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => save.mutate(local)}>Save changes</Button>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">Which detector rule categories are active for future scans.</p>
            {Object.entries(local.ruleCategories as Record<string, boolean>).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <span className="text-sm">{CATEGORY_LABELS[key] ?? key}</span>
                <Switch
                  checked={val}
                  onCheckedChange={(checked) =>
                    setLocal({ ...local, ruleCategories: { ...local.ruleCategories, [key]: checked } })
                  }
                />
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">Fail scan on critical finding</span>
              <Switch
                checked={local.failScanOnCritical}
                onCheckedChange={(checked) => setLocal({ ...local, failScanOnCritical: checked })}
              />
            </div>
            <Button size="sm" onClick={() => save.mutate(local)}>Save changes</Button>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="space-y-4 p-4">
            <p className="text-sm text-muted-foreground">
              Local model used for explainability and remediation drafting (run via Ollama — zero external API cost).
            </p>
            <Select value={local.aiModel} onValueChange={(v) => setLocal({ ...local, aiModel: v })}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="llama3">Llama 3</SelectItem>
                <SelectItem value="qwen">Qwen</SelectItem>
                <SelectItem value="gemma">Gemma</SelectItem>
                <SelectItem value="mistral">Mistral</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => save.mutate(local)}>Save changes</Button>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">
              Manual upload is the only scan source in v1. Repo-connected scanning and an API key for programmatic
              triggering are planned once the real pipeline (Parser → Detector → …) is wired in.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
