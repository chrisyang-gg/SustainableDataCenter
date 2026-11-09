"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  getOrdinance,
  places,
  statusLabel,
  type OrdinanceStatus,
  type PlaceKind,
} from "@/lib/place-directory";
import { ordinanceReminder, reminderColor, reminderLabel } from "@/lib/reminder";
import { ParcelSearch } from "@/components/parcel-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const kinds: { value: PlaceKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "neighborhood", label: "Neighborhoods" },
  { value: "municipality", label: "Municipalities" },
];

const statuses: { value: OrdinanceStatus | "all"; label: string }[] = [
  { value: "all", label: "Any zoning status" },
  { value: "adopted", label: "Adopted ordinance" },
  { value: "proposed", label: "Proposed ordinance" },
  { value: "none", label: "No data-center ordinance" },
];

export function PlaceBrowser() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<PlaceKind | "all">("all");
  const [status, setStatus] = useState<OrdinanceStatus | "all">("all");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return places.filter((place) => {
      if (kind !== "all" && place.kind !== kind) return false;
      const ordinance = getOrdinance(place.ordinanceKey);
      if (status !== "all" && ordinance.status !== status) return false;
      if (!needle) return true;
      return (
        place.name.toLowerCase().includes(needle) ||
        place.municipality.toLowerCase().includes(needle)
      );
    });
  }, [kind, query, status]);

  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-base font-semibold text-foreground">
          Neighborhoods and municipalities
        </h1>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          Pittsburgh is split into its official neighborhoods. The rest of
          Allegheny County is split into municipalities, which write the zoning.
          Click the map to drop a pin.
        </p>
        <ParcelSearch />
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Place
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a neighborhood or municipality"
              className="bg-background pl-8"
            />
          </div>
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Place type">
          {kinds.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={kind === item.value ? "default" : "outline"}
              onClick={() => setKind(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Data-center zoning
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as OrdinanceStatus | "all")
            }
            className="mt-1 h-8 w-full rounded-none border border-input bg-black px-2.5 text-sm text-foreground"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span>
          {results.length} of {places.length}
        </span>
        {query || kind !== "all" || status !== "all" ? (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              setQuery("");
              setKind("all");
              setStatus("all");
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      <ul className="border-t border-border md:min-h-0 md:flex-1 md:overflow-y-auto">
        {results.length === 0 ? (
          <li className="px-4 py-8 text-sm text-muted-foreground">
            No place matches that search.
          </li>
        ) : (
          results.map((place) => {
            const ordinance = getOrdinance(place.ordinanceKey);
            return (
              <li key={place.slug} className="border-b border-border">
                <Link
                  href={`/places/${place.slug}`}
                  className="block px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <span
                      className="size-2.5 shrink-0"
                      style={{
                        backgroundColor: reminderColor(
                          ordinanceReminder(
                            ordinance.whereAllowed,
                            ordinance.status,
                          ).tone,
                        ),
                      }}
                      aria-hidden="true"
                    />
                    {place.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {place.kind === "neighborhood"
                      ? "Pittsburgh neighborhood"
                      : place.municipality}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-foreground/90">
                    {reminderLabel(
                      ordinanceReminder(ordinance.whereAllowed, ordinance.status).tone,
                    )}
                    {" · "}
                    {statusLabel(ordinance.status)}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
