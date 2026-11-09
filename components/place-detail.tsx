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
import { ParcelStamp } from "@/components/parcel-stamp";
import { Badge } from "@/components/ui/badge";
import { GeologyPanel, GeologySkeleton } from "@/components/geology-panel";
import {
  ordinanceReminder,
  reminderColor,
  reminderLabel,
} from "@/lib/reminder";

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
  const reminder = ordinanceReminder(ordinance.whereAllowed, ordinance.status);

  return (
    <article className="md:min-h-0 md:flex-1 md:overflow-y-auto">
      <div className="border-b border-border px-4 py-3">
        <Link
          href="/places"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          All places
        </Link>
      </div>
      <div className="space-y-5 px-4 py-4">
        <header>
          <p className="text-sm text-muted-foreground">
            <Link href="/places" className="text-primary hover:underline">
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
          <h1 className="mt-2 text-xl font-medium text-foreground">
            {place.name}
          </h1>
          <ParcelStamp />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {neighborhood ? "Pittsburgh neighborhood" : "Municipality"}
            </Badge>
            <Badge variant="outline">{statusLabel(ordinance.status)}</Badge>
          </div>
          <div
            className="mt-3 border border-border border-l-4 bg-card px-3 py-2"
            style={{ borderLeftColor: reminderColor(reminder.tone) }}
          >
            <p className="text-sm font-medium text-foreground">
              <span
                className="mr-2 inline-block size-2.5 align-middle"
                style={{ backgroundColor: reminderColor(reminder.tone) }}
                aria-hidden="true"
              />
              {reminderLabel(reminder.tone)}
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground/90">{reminder.reason}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Area color is this zoning reminder. Flood and landslide maps can
              make an individual pin stricter.
            </p>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/90">
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
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {neighborhood ? "City of Pittsburgh" : place.name}. Reviewed{" "}
            {ORDINANCE_AS_OF} by the Pennsylvania Data Center Ordinance Project.
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {ordinance.whereAllowed}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>
              <a
                href={ordinance.sourceHref}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Source used in that review
              </a>
            </li>
            <li>
              <a
                href={ordinance.trackerHref}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
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
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              None of the facilities in this county file sit inside this area.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border border-t border-border">
              {facilities.map((facility) => (
                <li key={facility.slug}>
                  <Link
                    href={`/facilities/${facility.slug}`}
                    className="block py-2 text-sm font-medium text-primary hover:underline"
                  >
                    {facility.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Suspense fallback={<GeologySkeleton />}>
          <GeologyPanel centroid={place.centroid} areaTone={reminder.tone} />
        </Suspense>

        <p className="pb-6 text-xs leading-5 text-muted-foreground">
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
    <section className="rounded-lg border border-border bg-card px-3 py-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-foreground/90">{text}</p>
      <ul className="mt-2 space-y-1 text-xs">
        {sources.map((source) => (
          <li key={source.href}>
            <a
              href={source.href}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
