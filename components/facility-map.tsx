"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setWorkerUrl } from "maplibre-gl";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

// Turbopack does not emit MapLibre's worker next to the bundled chunk.
if (typeof window !== "undefined") {
  setWorkerUrl("/maplibre-gl-worker.mjs");
}
import type { FeatureCollection, Geometry } from "geojson";
import county from "@/data/allegheny-county.json";
import placesGeo from "@/data/places.json";
import { COUNTY_BOUNDS, facilities, getFacility } from "@/data/facilities";
import { markerPosition, stageLabel } from "@/lib/facilities";
import { getPlace, parsePin } from "@/lib/place-directory";
import { cn } from "@/lib/utils";

const countyGeo = county as FeatureCollection<Geometry>;
const placeGeo = placesGeo as FeatureCollection<Geometry>;
const mapMaxBounds: [number, number, number, number] = [
  COUNTY_BOUNDS.west - 0.18,
  COUNTY_BOUNDS.south - 0.14,
  COUNTY_BOUNDS.east + 0.18,
  COUNTY_BOUNDS.north + 0.14,
];

const bounds: [[number, number], [number, number]] = [
  [COUNTY_BOUNDS.west, COUNTY_BOUNDS.south],
  [COUNTY_BOUNDS.east, COUNTY_BOUNDS.north],
];

function tone(slug: string): string {
  const facility = getFacility(slug);
  if (!facility) return "bg-[#1565c0]";
  if (facility.approximate) return "border-[#ef6c00] bg-white";
  if (facility.dep?.projectStatus === "Under Review") return "bg-[#f9a825]";
  if (facility.stage === "existing") return "bg-[#1565c0]";
  if (facility.stage === "planned") return "bg-[#546e7a]";
  return "bg-[#ef6c00]";
}

export default function FacilityMap() {
  const mapRef = useRef<MapRef>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const facilitySlug = pathname.startsWith("/facilities/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : "";
  const placeSlug = pathname.startsWith("/places/")
    ? decodeURIComponent(pathname.split("/")[2] ?? "")
    : "";
  const selected = facilitySlug ? getFacility(facilitySlug) : undefined;
  const place = placeSlug ? getPlace(placeSlug) : undefined;
  const pin = place
    ? (parsePin(searchParams.get("pin")) ?? {
        longitude: place.centroid[0],
        latitude: place.centroid[1],
      })
    : null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selected) {
      const position = markerPosition(selected);
      map.flyTo({
        center: [position.longitude, position.latitude],
        zoom: 12.4,
        duration: 700,
      });
      return;
    }
    if (place) {
      map.fitBounds(
        [
          [place.bounds[0], place.bounds[1]],
          [place.bounds[2], place.bounds[3]],
        ],
        { padding: 48, maxZoom: 13, duration: 700 },
      );
      return;
    }
    map.fitBounds(bounds, { padding: 36, duration: 700 });
  }, [selected, place]);

  return (
    <div className="absolute inset-0">
      <Map
        style={{ width: "100%", height: "100%" }}
        ref={mapRef}
        initialViewState={{
          bounds,
          fitBoundsOptions: { padding: 36 },
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        maxBounds={mapMaxBounds}
        minZoom={8}
        interactiveLayerIds={["place-fill", "place-fill-selected"]}
        cursor="default"
        onMouseMove={(event) => {
          const canvas = mapRef.current?.getCanvas();
          if (!canvas) return;
          canvas.style.cursor = event.features?.length ? "pointer" : "";
        }}
        onClick={(event) => {
          const feature = event.features?.find(
            (item) => typeof item.properties?.slug === "string",
          );
          const slug = feature?.properties?.slug;
          if (typeof slug !== "string") return;
          const longitude = event.lngLat.lng.toFixed(5);
          const latitude = event.lngLat.lat.toFixed(5);
          router.push(`/places/${slug}?pin=${longitude},${latitude}`, {
            scroll: false,
          });
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="allegheny" type="geojson" data={countyGeo}>
          <Layer
            id="allegheny-fill"
            type="fill"
            paint={{ "fill-color": "#1565c0", "fill-opacity": 0.05 }}
          />
          <Layer
            id="allegheny-line"
            type="line"
            paint={{ "line-color": "#0f3d6e", "line-width": 1.5 }}
          />
        </Source>
        <Source id="places" type="geojson" data={placeGeo}>
          <Layer
            id="place-fill"
            type="fill"
            paint={{ "fill-color": "#1565c0", "fill-opacity": 0.04 }}
          />
          <Layer
            id="place-line"
            type="line"
            paint={{ "line-color": "#5d7384", "line-width": 0.7 }}
          />
          <Layer
            id="place-fill-selected"
            type="fill"
            filter={["==", ["get", "slug"], place?.slug ?? ""]}
            paint={{ "fill-color": "#1565c0", "fill-opacity": 0.22 }}
          />
          <Layer
            id="place-line-selected"
            type="line"
            filter={["==", ["get", "slug"], place?.slug ?? ""]}
            paint={{ "line-color": "#0f3d6e", "line-width": 2.4 }}
          />
        </Source>
        {facilities.map((facility) => {
          const position = markerPosition(facility);
          const active = facility.slug === selected?.slug;
          return (
            <Marker
              key={facility.slug}
              longitude={position.longitude}
              latitude={position.latitude}
              anchor="center"
              style={{ zIndex: active ? 3 : 1 }}
            >
              <button
                type="button"
                title={`${facility.name} · ${stageLabel(facility.stage)}`}
                aria-label={`${facility.name}, ${facility.municipality}`}
                aria-pressed={active}
                onClick={(event) => {
                  event.stopPropagation();
                  router.push(`/facilities/${facility.slug}`);
                }}
                className={cn(
                  "block rounded-full border-2 border-white shadow-md",
                  active ? "size-4 ring-4 ring-[#0f3d6e]/30" : "size-3",
                  tone(facility.slug),
                )}
              />
            </Marker>
          );
        })}
        {pin ? (
          <Marker longitude={pin.longitude} latitude={pin.latitude} anchor="center">
            <span
              className="block size-4 rounded-full border-2 border-[#0f3d6e] bg-white shadow"
              aria-hidden="true"
            />
          </Marker>
        ) : null}
      </Map>
      <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-white/95 px-2.5 py-1.5 text-[11px] text-[#334049] shadow">
        Click an area for geology and zoning
      </div>
      <div className="pointer-events-none absolute bottom-8 left-2 max-w-[210px] rounded-md bg-white/95 px-3 py-2 text-[11px] leading-4 text-[#334049] shadow md:bottom-3 md:left-3">
        <LegendDot className="bg-[#1565c0]" label="Existing" />
        <LegendDot className="bg-[#f9a825]" label="Permits under review" />
        <LegendDot className="bg-[#ef6c00]" label="Proposed, no DEP file" />
        <LegendDot className="bg-[#546e7a]" label="Planned" />
        <LegendDot
          className="border-[#ef6c00] bg-white"
          label="Approximate location"
        />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={cn("size-2.5 rounded-full border-2 border-white shadow", className)} />
      <span>{label}</span>
    </div>
  );
}
