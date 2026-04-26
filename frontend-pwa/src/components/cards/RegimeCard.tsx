import { Activity, Wind } from "lucide-react";
import type { Regime } from "@/lib/mock-data";

export function RegimeCard({ regime }: { regime: Regime }) {
  const tone =
    regime === "Post-Rain Clean"
      ? "clean"
      : regime === "Stable Indoor"
        ? "clean"
        : regime === "Traffic Spike" || regime === "Dust Influx"
          ? "poor"
          : "moderate";

  const colorClass =
    tone === "clean" ? "text-clean border-clean/40 bg-clean/10" : tone === "moderate" ? "text-moderate border-moderate/40 bg-moderate/10" : "text-poor border-poor/40 bg-poor/10";

  return (
    <section className="panel p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Current Regime</div>
            <div className="mt-0.5 text-sm">HMM Classifier · 5-state</div>
          </div>
          <Activity className="h-4 w-4 text-cyan" />
        </div>

        <div className="mt-5">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${colorClass}`}>
            <Wind className="h-3.5 w-3.5" />
            {regime}
          </span>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Active state inferred from a 5-min rolling window. Confidence: <span className="text-foreground font-mono">0.81</span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground border-t border-border pt-3">
        <div>
          <div className="text-[10px]">Stayed for</div>
          <div className="font-mono text-xs text-foreground">42 min</div>
        </div>
        <div>
          <div className="text-[10px]">Next likely</div>
          <div className="font-mono text-xs text-foreground">Stable Indoor (62%)</div>
        </div>
      </div>
    </section>
  );
}
