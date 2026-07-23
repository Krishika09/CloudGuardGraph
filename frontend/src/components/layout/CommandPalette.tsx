import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Flag, Route } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppStore } from "@/store/useAppStore";
import { useActiveScan } from "@/hooks/useActiveScan";
import { api } from "@/lib/api";

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const navigate = useNavigate();
  const { activeScanId } = useActiveScan();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const { data: resources = [] } = useQuery({
    queryKey: ["inventory", activeScanId],
    queryFn: () => api.inventory(activeScanId!),
    enabled: !!activeScanId && open,
  });
  const { data: findings = [] } = useQuery({
    queryKey: ["findings", activeScanId],
    queryFn: () => api.findings(activeScanId!),
    enabled: !!activeScanId && open,
  });
  const { data: paths = [] } = useQuery({
    queryKey: ["attack-paths", activeScanId],
    queryFn: () => api.attackPaths(activeScanId!),
    enabled: !!activeScanId && open,
  });

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search CloudGuardGraph" description="Search assets, findings, and attack paths">
      <CommandInput placeholder="Search assets, findings, attack paths…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Assets">
          {resources.slice(0, 30).map((r) => (
            <CommandItem key={r.id} value={r.name} onSelect={() => go(`/inventory?resource=${r.id}`)}>
              <Boxes className="h-4 w-4 text-primary" />
              {r.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Findings">
          {findings.slice(0, 30).map((f) => (
            <CommandItem key={f.id} value={f.title} onSelect={() => go(`/findings?finding=${f.id}`)}>
              <Flag className="h-4 w-4 text-high" />
              {f.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Attack Paths">
          {paths.map((p) => (
            <CommandItem
              key={p.id}
              value={`${p.targetAssetName} attack path`}
              onSelect={() => go(`/attack-paths?path=${p.id}`)}
            >
              <Route className="h-4 w-4 text-critical" />
              Path to {p.targetAssetName}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
