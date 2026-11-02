import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FacilityDetail } from "@/components/facility-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { facilities, getFacility } from "@/data/facilities";

export function generateStaticParams() {
  return facilities.map((facility) => ({ slug: facility.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const facility = getFacility(slug);
  if (!facility) return { title: "Facility not found" };
  return {
    title: facility.name,
    description: facility.summary,
  };
}

export default function FacilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<FacilityFallback />}>
      <FacilityContent params={params} />
    </Suspense>
  );
}

async function FacilityContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const facility = getFacility(slug);
  if (!facility) notFound();
  return <FacilityDetail facility={facility} />;
}

function FacilityFallback() {
  return (
    <div className="space-y-3 px-4 py-5" aria-hidden="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
