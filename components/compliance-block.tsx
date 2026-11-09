import { complianceAtPin, violationVerdict, type ComplianceMark } from "@/lib/compliance";
import type { FloodZone, GeologyUnit } from "@/lib/geology";

const MARK_LABEL: Record<ComplianceMark, string> = {
  violation: "Potential violation",
  exceedance: "Potential exceedance",
  gap: "Potential gap",
  clear: "No violation found",
  unchecked: "Not evaluated",
  aside: "Not a site violation",
};

export function ComplianceBlock({
  floodZones,
  floodChecked,
  units,
  geologyChecked,
  noiseLdnDba,
  no2Micrograms,
}: {
  floodZones: FloodZone[];
  floodChecked: boolean;
  units: GeologyUnit[];
  geologyChecked: boolean;
  noiseLdnDba: number | null;
  no2Micrograms: number | null;
}) {
  const rows = complianceAtPin({
    floodZones,
    floodChecked,
    units,
    geologyChecked,
    noiseLdnDba,
    no2Micrograms,
  });
  return (
    <section aria-labelledby="standards-heading" className="space-y-2">
      <h3 id="standards-heading" className="text-sm font-semibold text-foreground">
        Potential violations
      </h3>
      <p className="text-xs leading-5 text-muted-foreground">
        A regulatory violation is named only for the flood rule. A screen above
        a published level is an exceedance, not a recorded violation. This is
        not a permit.
      </p>
      <p className="border border-border px-3 py-2 text-sm leading-6 text-foreground">
        {violationVerdict(rows)}
      </p>
      {rows.map((row) => (
        <section key={row.id} className="border border-border px-3 py-2">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="text-sm font-semibold text-foreground">{row.title}</h4>
            <p className="shrink-0 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {MARK_LABEL[row.mark]}
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{row.finding}</p>
          <ul className="mt-1 space-y-1">
            {row.sources.map((source) => (
              <li key={source.href}>
                <a
                  className="text-xs text-primary hover:underline"
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
