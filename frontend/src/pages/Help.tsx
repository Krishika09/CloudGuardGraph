import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";

const GLOSSARY = [
  { term: "Attack Path", def: "A correlated chain of resources and permissions an attacker could realistically follow from an entry point to a critical asset." },
  { term: "Finding", def: "A single misconfiguration detected by the rule engine, before any correlation is applied." },
  { term: "Risk Score", def: "A 0-100 composite of exposure, privilege level, data sensitivity, exploitability, and dangerous permissions." },
  { term: "Explainability", def: "The plain-language reasoning behind why a specific attack path is dangerous." },
  { term: "Simulation", def: "A hypothetical, sandboxed preview of how risk and attack paths change if a fix is applied — nothing is changed for real." },
];

const ONBOARDING = [
  "Upload your first scan (or run the sample environment)",
  "Review Attack Paths, sorted by risk",
  "Try the Simulator on the top recommendation",
  "Generate a Report to share outside the dashboard",
];

export function Help() {
  return (
    <div className="mx-auto max-w-[800px] space-y-4">
      <PageHeader title="Help" description="Vocabulary, onboarding, and where to get support." />

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Getting started</h3>
        <ol className="space-y-2">
          {ONBOARDING.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Glossary</h3>
        <dl className="space-y-3">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt className="text-sm font-medium text-foreground">{g.term}</dt>
              <dd className="text-sm text-muted-foreground">{g.def}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">Contact support</h3>
        <p className="text-sm text-muted-foreground">
          Email <a href="mailto:support@cloudguardgraph.io" className="text-primary underline">support@cloudguardgraph.io</a>
        </p>
      </Card>
    </div>
  );
}
