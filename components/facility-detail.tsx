"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Facility, PermitStatus } from "@/data/facilities";
import { DATA_AS_OF } from "@/data/facilities";
import {
  depStatusLabel,
  formatSubmitted,
  markerPosition,
  stageLabel,
} from "@/lib/facilities";
import { newsFor } from "@/data/news";
import { FacilityImpact } from "@/components/facility-impact";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function FacilityDetail({ facility }: { facility: Facility }) {
  const position = markerPosition(facility);
  const companies = facility.companies.join(", ");
  const news = newsFor(facility.slug);

  return (
    <article className="md:min-h-0 md:flex-1 md:overflow-y-auto">
      <div className="border-b border-border px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          All facilities
        </Link>
      </div>
      <div className="space-y-5 px-4 py-4">
        <header>
          <p className="text-sm text-muted-foreground">
            <Link href="/" className="text-primary hover:underline">
              Allegheny County
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{facility.name}</span>
          </p>
          <h1 className="mt-2 text-xl font-medium text-foreground">
            {facility.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{stageLabel(facility.stage)}</Badge>
            {facility.dep ? (
              <Badge variant="outline">
                {depStatusLabel(facility.dep.projectStatus)}
              </Badge>
            ) : null}
            {facility.approximate ? (
              <Badge variant="outline">Approximate location</Badge>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground/90">
            {facility.summary}
          </p>
        </header>

        <dl className="divide-y divide-border border-y border-border text-sm">
          <Fact label="Location">
            {facility.municipality}, Allegheny County, Pennsylvania
          </Fact>
          <Fact label="Coordinates">
            {facility.latitude.toFixed(5)}, {facility.longitude.toFixed(5)}
            {position.nudged
              ? " The map pin is nudged so it does not sit on another facility that shares this published coordinate."
              : ""}
          </Fact>
          {facility.alsoKnownAs.length > 0 ? (
            <Fact label="Also known as">{facility.alsoKnownAs.join(", ")}</Fact>
          ) : null}
          {companies ? (
            <Fact label={facility.companyLabel}>{companies}</Fact>
          ) : null}
          {facility.capacity ? (
            <Fact label="Capacity">{facility.capacity}</Fact>
          ) : null}
          {facility.acres ? <Fact label="Site">{facility.acres}</Fact> : null}
          {facility.dep ? (
            <Fact label="DEP project">{facility.dep.projectName}</Fact>
          ) : null}
          {facility.localNote ? (
            <Fact label="Status note">{facility.localNote}</Fact>
          ) : null}
        </dl>

        <FacilityImpact key={facility.slug} facility={facility} />

        <section aria-labelledby="permits-heading">
          <h2 id="permits-heading" className="text-base font-semibold">
            Permit file
          </h2>
          {facility.permits.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              No PA DEP permit rows are linked to this facility in the county
              extract from {DATA_AS_OF}.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border border-t border-border">
              {facility.permits.map((permit) => (
                <li
                  key={`${permit.authorization}-${permit.permitNumber}-${permit.category}`}
                  className="py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {permit.authorization}
                    </p>
                    <PermitBadge status={permit.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {permit.category}
                    {permit.eFactsId ? ` · eFACTS ${permit.eFactsId}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-foreground/90">
                    {permit.applicationType || "No application type"}
                    {" · "}
                    {permit.permitNumber || "No number"}
                    {" · "}
                    {permit.submitted
                      ? formatSubmitted(permit.submitted)
                      : "Not submitted"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="news-heading">
          <h2 id="news-heading" className="text-base font-semibold">
            News
          </h2>
          {news.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              No news article naming this facility was found.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border border-t border-border">
              {news.map((item) => (
                <li key={item.href} className="py-3">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {item.title}
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.outlet}
                    {item.date ? ` · ${item.date}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <OpinionSkeleton />

        <footer className="pb-6 text-xs leading-5 text-muted-foreground">
          <p>
            Facility facts are drawn from public tracker pages. Permit rows are
            from the PA DEP Data Center Permit Tracker county extract retrieved{" "}
            {DATA_AS_OF}. This is not a DEP site.
          </p>
          <ul className="mt-2 space-y-1">
            {facility.sources.map((source) => (
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
        </footer>
      </div>
    </article>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[140px_1fr] sm:gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function PermitBadge({ status }: { status: PermitStatus }) {
  if (status === "Issued") {
    return (
      <Badge className="border-[#3cba6a] text-[#7dcea0]" variant="outline">
        Issued
      </Badge>
    );
  }
  if (status === "Pending") {
    return (
      <Badge className="border-[#e6b422] text-[#e6b422]" variant="outline">
        Pending
      </Badge>
    );
  }
  return <Badge variant="outline">Not yet submitted</Badge>;
}

function OpinionSkeleton() {
  const slots = ["Hearings", "Written comment", "News", "Stance"];
  return (
    <section
      aria-labelledby="opinion-heading"
      className="rounded-lg border border-dashed border-border bg-card p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="opinion-heading" className="text-base font-semibold">
          Public opinion
        </h2>
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Not collected
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Hearing minutes, written comments, and a local stance will go here.
        Nothing has been gathered for this county yet.
      </p>
      <ul className="mt-3 space-y-2">
        {slots.map((slot) => (
          <li key={slot} className="border border-border bg-card p-3">
            <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {slot}
            </div>
            <Skeleton className="mt-2 h-3 w-4/5" />
            <Skeleton className="mt-2 h-3 w-2/5" />
            <p className="mt-2 text-sm text-muted-foreground">Empty placeholder</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
