/**
 * Published figures for a named facility. A number lands here only after the
 * cited article states it. Everything else stays on the screening model.
 */
export type ReportedNoise = {
  everydayDba: number;
  outageDba: number;
  place: string;
  sourceLabel: string;
  sourceHref: string;
};

export type ReportedSite = {
  noise?: ReportedNoise;
  /** Extra sentence when the diesel-backup screen is the wrong air source. */
  airCaveat?: string;
};

const reportedSites: Record<string, ReportedSite> = {
  "dynamo-springdale": {
    noise: {
      everydayDba: 57,
      outageDba: 75,
      place: "the property line",
      sourceLabel:
        "90.5 WESA, November 25, 2025, reporting Jacobs modeling for Allegheny DC",
      sourceHref:
        "https://www.wesa.fm/environment-energy/2025-11-25/springdale-data-center-testimony",
    },
  },
  "henderson-road-data-center": {
    airCaveat:
      "Public notes describe an on-site combined-cycle gas plant with this campus. No emission rate for that plant was published, so the air figure is the diesel-backup screen, not the plant.",
  },
};

export function reportedFor(slug: string): ReportedSite | null {
  return reportedSites[slug] ?? null;
}
