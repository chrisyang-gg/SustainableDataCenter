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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function FacilityDetail({ facility }: { facility: Facility }) {
  const position = markerPosition(facility);
  const companies = facility.companies.join(", ");

  return (
    <article className="md:min-h-0 md:flex-1 md:overflow-y-auto">
      <div className="border-b border-[#e6ebf0] px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1565c0] hover:underline"
        >
          <ArrowLeft className="size-4" />
          All facilities
        </Link>
      </div>
      <div className="space-y-5 px-4 py-4">
        <header>
          <p className="text-sm text-[#546e7a]">
            <Link href="/" className="text-[#1565c0] hover:underline">
              Allegheny County
            </Link>
            <span aria-hidden="true"> / </span>
            <span>{facility.name}</span>
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#161b20]">
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
          <p className="mt-3 text-sm leading-6 text-[#334049]">
            {facility.summary}
          </p>
        </header>

        <dl className="divide-y divide-[#e6ebf0] border-y border-[#e6ebf0] text-sm">
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

        <section aria-labelledby="permits-heading">
          <h2 id="permits-heading" className="text-base font-semibold">
            Permit file
          </h2>
          {facility.permits.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-[#546e7a]">
              No PA DEP permit rows are linked to this facility in the county
              extract from {DATA_AS_OF}.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-[#eef2f5] border-t border-[#e6ebf0]">
              {facility.permits.map((permit) => (
                <li
                  key={`${permit.authorization}-${permit.permitNumber}-${permit.category}`}
                  className="py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-[#161b20]">
                      {permit.authorization}
                    </p>
                    <PermitBadge status={permit.status} />
                  </div>
                  <p className="mt-1 text-xs text-[#607d8b]">
                    {permit.category}
                    {permit.eFactsId ? ` · eFACTS ${permit.eFactsId}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#334049]">
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

        <OpinionSkeleton />

        <footer className="pb-6 text-xs leading-5 text-[#607d8b]">
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
                  className="text-[#1565c0] hover:underline"
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
      <dt className="text-[#607d8b]">{label}</dt>
      <dd className="text-[#161b20]">{children}</dd>
    </div>
  );
}

function PermitBadge({ status }: { status: PermitStatus }) {
  if (status === "Issued") {
    return (
      <Badge className="bg-[#e8f5e9] text-[#1b5e20]" variant="secondary">
        Issued
      </Badge>
    );
  }
  if (status === "Pending") {
    return (
      <Badge className="bg-[#fff8e1] text-[#8a5a12]" variant="secondary">
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
      className="rounded-lg border border-dashed border-[#90a4ae] bg-[#f7f9fb] p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="opinion-heading" className="text-base font-semibold">
          Public opinion
        </h2>
        <span className="text-[11px] font-medium tracking-wide text-[#607d8b] uppercase">
          Not collected
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#546e7a]">
        Hearing minutes, written comments, and a local stance will go here.
        Nothing has been gathered for this county yet.
      </p>
      <ul className="mt-3 space-y-2">
        {slots.map((slot) => (
          <li key={slot} className="rounded-md border border-[#e6ebf0] bg-white p-3">
            <div className="text-[11px] font-medium tracking-wide text-[#607d8b] uppercase">
              {slot}
            </div>
            <Skeleton className="mt-2 h-3 w-4/5" />
            <Skeleton className="mt-2 h-3 w-2/5" />
            <p className="mt-2 text-sm text-[#78909c]">Empty placeholder</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
