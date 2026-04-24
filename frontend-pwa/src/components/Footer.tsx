import { ShieldCheck, Users } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-10 panel p-5 text-sm text-muted-foreground">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="font-medium text-foreground">Case study · Personal pollutant exposure</div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed">
            EnviroSense AI is a hyper-local ecological node combining domestic sensor data
            (~70k 1-min samples from "My Terrace-on-Room") with regional context. All metrics
            shown here are illustrative of the engineering pipeline and modeling approach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1.5 text-xs">
            <Users className="h-3.5 w-3.5 text-cyan" />
            <span>5-Member Engineering Approach</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-clean/40 bg-clean/10 px-3 py-1.5 text-xs text-clean">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Code Approved by Codeowners</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
