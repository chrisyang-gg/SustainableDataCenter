"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { facilities, municipalities } from "@/data/facilities";
import { newsFor } from "@/data/news";
import { depStatusLabel, stageLabel, type StageFilter } from "@/lib/facilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFacilityFilters } from "@/components/tracker-shell";

const stages: { value: StageFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "proposed", label: "Proposed" },
  { value: "planned", label: "Planned" },
  { value: "existing", label: "Existing" },
];

export function FacilityBrowser() {
  const { filters, setFilters, results } = useFacilityFilters();
  const places = municipalities();
  const filtering =
    filters.query.trim() !== "" ||
    filters.stage !== "all" ||
    filters.municipality !== "all";

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-base font-semibold text-foreground">
          Data center project search
        </h1>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {facilities.length} facilities in Allegheny County. Select one for
          the location, companies, and permit file. Open Places, or click the
          map, for geology and local zoning.
        </p>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Project name
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={filters.query}
              onChange={(event) =>
                setFilters({ ...filters, query: event.target.value })
              }
              placeholder="Search name, company, or place"
              className="bg-background pl-8"
            />
          </div>
        </label>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Municipality
          <select
            value={filters.municipality}
            onChange={(event) =>
              setFilters({ ...filters, municipality: event.target.value })
            }
            className="mt-1 h-8 w-full rounded-none border border-input bg-black px-2.5 text-sm text-foreground"
          >
            <option value="all">All municipalities</option>
            {places.map((place) => (
              <option key={place} value={place}>
                {place}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Stage">
          {stages.map((stage) => (
            <Button
              key={stage.value}
              type="button"
              size="sm"
              variant={filters.stage === stage.value ? "default" : "outline"}
              onClick={() => setFilters({ ...filters, stage: stage.value })}
            >
              {stage.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span>
          {results.length} of {facilities.length}
        </span>
        {filtering ? (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() =>
              setFilters({ query: "", stage: "all", municipality: "all" })
            }
          >
            Clear
          </button>
        ) : null}
      </div>
      <ul className="border-t border-border md:min-h-0 md:flex-1 md:overflow-y-auto">
        {results.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted-foreground">
            No facility matches that search.
          </li>
        ) : (
          results.map((facility) => (
            <li key={facility.slug} className="border-b border-border">
              <Link
                href={`/facilities/${facility.slug}`}
                className="block px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="block font-medium text-foreground">
                  {facility.name}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {facility.municipality} · {stageLabel(facility.stage)}
                </span>
                {facility.dep ? (
                  <span className="mt-1 block text-xs font-medium text-[#e0b15a]">
                    {depStatusLabel(facility.dep.projectStatus)}
                  </span>
                ) : null}
                {newsFor(facility.slug).length > 0 ? (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {newsFor(facility.slug).length === 1
                      ? "1 news story"
                      : `${newsFor(facility.slug).length} news stories`}
                  </span>
                ) : null}
              </Link>
            </li>
          ))
        )}
      </ul>
      <p className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">
        ServaxNet New Castle is listed under Allegheny on some statewide
        trackers, but the published pin is in New Castle, Lawrence County, so
        it is not on this map. Public opinion is not collected yet.
      </p>
    </div>
  );
}
