import { useState } from "react";
import { UploadCloud, FileCode2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTriggerScan } from "@/hooks/useTriggerScan";

export function UploadScanDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const triggerScan = useTriggerScan();

  function runScan() {
    triggerScan.mutate(undefined, { onSuccess: () => setOpen(false) });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run a new scan</DialogTitle>
          <DialogDescription>
            Upload a Terraform / IaC bundle, or run against the sample environment to see the pipeline end to end.
          </DialogDescription>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/30"
          }`}
        >
          <input type="file" multiple accept=".tf,.json,.zip" className="hidden" />
          <UploadCloud className="h-7 w-7 text-muted-foreground" />
          <div className="text-sm font-medium text-foreground">Drag & drop .tf / .json / .zip files</div>
          <div className="text-xs text-muted-foreground">or click to browse</div>
        </label>

        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <FileCode2 className="h-4 w-4 shrink-0 text-primary" />
          v1 runs the pipeline against a synthetic sample environment (matching the doc's Public EC2 → IAM
          Role → Secrets Manager → Production DB scenario). Real upload parsing wires into Module 2 (Parser)
          once the backend pipeline is connected.
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={runScan} disabled={triggerScan.isPending}>
            {triggerScan.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Run sample scan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
