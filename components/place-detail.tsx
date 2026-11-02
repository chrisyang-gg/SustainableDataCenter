import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { countyPropertyRule, placeNotes } from "@/data/place-notes";
import type { Facility } from "@/data/facilities";
import {
  ORDINANCE_AS_OF,
  statusLabel,
  type MunicipalOrdinance,
  type PlaceSummary,
} from "@/lib/place-directory";
import { Badge } from "@/components/ui/badge";
import { GeologyPanel, GeologySkeleton } from "@/components/geology-panel";

export function PlaceDetail({
  place,
  ordinance,
  facilities,
}: {
  place: PlaceSummary;
  ordinance: MunicipalOrdinance;
  facilities: Facility[];
}) {
  const note = placeNotes[place.slug];
  const neighborhood = place.kind === "neighborhood";

  return (
    <article className="md:min-h-0 md:flex-1 md:overflow-y-auto">
      <div className="border-b border-[#e6ebf0] px-4 py-3">
        <Link
          href="/places"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1565c0] hover:underline"
        >
          <ArrowLeft className="size-4" />
          All places
        </Link>
      </div>
      <div className="space-y-5 px-4 py-4">
        <header>
          <p className="text-sm text-[#546e7a]">
            <Link href="/places" className="text-[#1565c0] hover:underline">
              Allegheny County
            </Link>
            {neighborhood ? (
              <>
                <span aria-hidden="true"> / </span>
                <span>Pittsburgh</span>
              </>
            ) : null}
            <span aria-hidden="true"> / </span>
            <span>{place.name}</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#161b20]">
            {place.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {neighborhood ? "Pittsburgh neighborhood" : "Municipality"}
            </Badge>
            <Badge variant="outline">{statusLabel(ordinance.status)}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#334049]">
            {neighborhood
              ? "The City of Pittsburgh zoning code is the land-use rule for this neighborhood. The ordinance note below is the citywide review."
              : `${place.name} writes the zoning for private land inside its border. The ordinance note is the municipal review.`}
          </p>
        </header>

        <PolicyCard
          title={countyPropertyRule.title}
          text={countyPropertyRule.text}
          sources={countyPropertyRule.sources}
        />

        <section aria-labelledby="ordinance-heading">
          <h2 id="ordinance-heading" className="text-base font-semibold">
            Data-center zoning
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#546e7a]">
            {neighborhood ? "City of Pittsburgh" : place.name}. Reviewed{" "}
            {ORDINANCE_AS_OF} by the Pennsylvania Data Center Ordinance Project.
          </p>
          <p className="mt-2 text-sm leading-6 text-[#161b20]">
            {ordinance.whereAllowed}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>
              <a
                href={ordinance.sourceHref}
                target="_blank"
                rel="noreferrer"
                className="text-[#1565c0] hover:underline"
              >
                Source used in that review
              </a>
            </li>
            <li>
              <a
                href={ordinance.trackerHref}
                target="_blank"
                rel="noreferrer"
                className="text-[#1565c0] hover:underline"
              >
                Ordinance review
              </a>
            </li>
          </ul>
        </section>

        {note ? (
          <PolicyCard title={note.title} text={note.text} sources={note.sources} />
        ) : null}

        <section aria-labelledby="place-facilities-heading">
          <h2 id="place-facilities-heading" className="text-base font-semibold">
            Facilities on this map
          </h2>
          {facilities.length === 0 ? (
            <p className="mt-1 text-sm leading-6 text-[#546e7a]">
              None of the facilities in this county file sit inside this area.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#eef2f5] border-t border-[#e6ebf0]">
              {facilities.map((facility) => (
                <li key={facility.slug}>
                  <Link
                    href={`/facilities/${facility.slug}`}
                    className="block py-2 text-sm font-medium text-[#1565c0] hover:underline"
                  >
                    {facility.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Suspense fallback={<GeologySkeleton />}>
          <GeologyPanel centroid={place.centroid} />
        </Suspense>

        <p className="pb-6 text-xs leading-5 text-[#607d8b]">
          Neighborhood lines are the City of Pittsburgh neighborhoods from the
          Western Pennsylvania Regional Data Center. Municipal lines are
          Allegheny County’s boundary file. A pin shows mapped conditions. It
          is not a permit decision.
        </p>
      </div>
    </article>
  );
}

function PolicyCard({
  title,
  text,
  sources,
}: {
  title: string;
  text: string;
  sources: { label: string; href: string }[];
}) {
  return (
    <section className="rounded-lg border border-[#d5dde5] bg-[#f7f9fb] px-3 py-3">
      <h2 className="text-sm font-semibold text-[#161b20]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#334049]">{text}</p>
      <ul className="mt-2 space-y-1 text-xs">
        {sources.map((source) => (
          <li key={source.href}>
            <a
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="text-[#1565c0] hover:underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
