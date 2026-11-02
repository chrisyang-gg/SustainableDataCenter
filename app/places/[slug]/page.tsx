import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PlaceDetail } from "@/components/place-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { getOrdinance, getPlace, places } from "@/lib/place-directory";
import { facilitiesInPlace } from "@/lib/places";

export function generateStaticParams() {
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = getPlace(slug);
  if (!place) return { title: "Place not found" };
  return {
    title: place.name,
    description: `Geology and data-center zoning for ${place.name}, Allegheny County.`,
  };
}

export default function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense fallback={<PlaceFallback />}>
      <PlaceContent params={params} />
    </Suspense>
  );
}

async function PlaceContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = getPlace(slug);
  if (!place) notFound();
  return (
    <PlaceDetail
      place={place}
      ordinance={getOrdinance(place.ordinanceKey)}
      facilities={facilitiesInPlace(place.slug)}
    />
  );
}

function PlaceFallback() {
  return (
    <div className="space-y-3 px-4 py-5" aria-hidden="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
