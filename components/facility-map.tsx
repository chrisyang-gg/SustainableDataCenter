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
import { pointInCounty } from "@/lib/geology";
import { getOrdinance, getPlace, parsePin } from "@/lib/place-directory";
import { ordinanceReminder, reminderColor } from "@/lib/reminder";
import { cn } from "@/lib/utils";

const countyGeo = county as FeatureCollection<Geometry>;
const placeGeo = placesGeo as FeatureCollection<Geometry>;
const coloredPlaces: FeatureCollection<Geometry> = {
  type: "FeatureCollection",
  features: placeGeo.features.map((feature) => {
    const slug = String(feature.properties?.slug ?? "");
    const summary = getPlace(slug);
    const tone = summary
      ? ordinanceReminder(
          getOrdinance(summary.ordinanceKey).whereAllowed,
          getOrdinance(summary.ordinanceKey).status,
        ).tone
      : "debated";
    return {
      ...feature,
      properties: { ...feature.properties, tone },
    };
  }),
};
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
  if (!facility) return "bg-[#7eb6ff]";
  if (facility.approximate) return "border-[#ef6c00] bg-black";
  if (facility.dep?.projectStatus === "Under Review") return "bg-[#f9a825]";
  if (facility.stage === "existing") return "bg-[#7eb6ff]";
  if (facility.stage === "planned") return "bg-[#8d887e]";
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
  const areaTone = place
    ? ordinanceReminder(
        getOrdinance(place.ordinanceKey).whereAllowed,
        getOrdinance(place.ordinanceKey).status,
      ).tone
    : "debated";
  const whatIf = pathname.startsWith("/what-if");
  const whatIfPin = whatIf ? parsePin(searchParams.get("pin")) : null;
  const whatIfLongitude = whatIfPin?.longitude;
  const whatIfLatitude = whatIfPin?.latitude;
  const pin = whatIf
    ? whatIfPin
    : place
      ? (parsePin(searchParams.get("pin")) ?? {
          longitude: place.centroid[0],
          latitude: place.centroid[1],
        })
      : null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (whatIf) {
      if (whatIfLongitude !== undefined && whatIfLatitude !== undefined) {
        map.flyTo({
          center: [whatIfLongitude, whatIfLatitude],
          zoom: 13,
          duration: 700,
        });
      } else {
        map.fitBounds(bounds, { padding: 36, duration: 700 });
      }
      return;
    }
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
  }, [selected, place, whatIf, whatIfLongitude, whatIfLatitude]);

  return (
    <div className="absolute inset-0">
      <Map
        style={{ width: "100%", height: "100%" }}
        ref={mapRef}
        initialViewState={{
          bounds,
          fitBoundsOptions: { padding: 36 },
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        maxBounds={mapMaxBounds}
        minZoom={8}
        interactiveLayerIds={["place-fill", "place-fill-selected"]}
        cursor={whatIf ? "crosshair" : "default"}
        onMouseMove={(event) => {
          const canvas = mapRef.current?.getCanvas();
          if (!canvas) return;
          if (whatIf) {
            canvas.style.cursor = "crosshair";
            return;
          }
          canvas.style.cursor = event.features?.length ? "pointer" : "";
        }}
        onClick={(event) => {
          if (whatIf) {
            const latitude = event.lngLat.lat;
            const longitude = event.lngLat.lng;
            if (!pointInCounty(latitude, longitude)) return;
            router.push(
              `/what-if?pin=${longitude.toFixed(5)},${latitude.toFixed(5)}`,
              { scroll: false },
            );
            return;
          }
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
            paint={{ "fill-color": "#000000", "fill-opacity": 0 }}
          />
          <Layer
            id="allegheny-line"
            type="line"
            paint={{ "line-color": "#f3f0e8", "line-width": 1.25 }}
          />
        </Source>
        <Source id="places" type="geojson" data={coloredPlaces}>
          <Layer
            id="place-fill"
            type="fill"
            paint={{
              "fill-color": [
                "match",
                ["get", "tone"],
                "ok",
                reminderColor("ok"),
                "no",
                reminderColor("no"),
                reminderColor("debated"),
              ],
              "fill-opacity": 0.82,
            }}
          />
          <Layer
            id="place-line"
            type="line"
            paint={{ "line-color": "#1a1a1a", "line-width": 0.6 }}
          />
          <Layer
            id="place-fill-selected"
            type="fill"
            filter={["==", ["get", "slug"], place?.slug ?? ""]}
            paint={{ "fill-color": reminderColor(areaTone), "fill-opacity": 0.94 }}
          />
          <Layer
            id="place-line-selected"
            type="line"
            filter={["==", ["get", "slug"], place?.slug ?? ""]}
            paint={{ "line-color": reminderColor(areaTone), "line-width": 2.4 }}
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
                  if (whatIf) {
                    if (!pointInCounty(position.latitude, position.longitude)) return;
                    router.push(
                      `/what-if?pin=${position.longitude.toFixed(5)},${position.latitude.toFixed(5)}`,
                      { scroll: false },
                    );
                    return;
                  }
                  router.push(`/facilities/${facility.slug}`);
                }}
                className={cn(
                  "block rounded-full border border-black",
                  active ? "size-4 ring-2 ring-[#e4d2a2]" : "size-3",
                  tone(facility.slug),
                )}
              />
            </Marker>
          );
        })}
        {pin ? (
          <Marker longitude={pin.longitude} latitude={pin.latitude} anchor="center">
            <span
              className="block size-3.5 rounded-full border-2 border-[#f3f0e8] bg-black"
              aria-hidden="true"
            />
          </Marker>
        ) : null}
      </Map>
      <div className="pointer-events-none absolute top-2 left-2 border border-[#2a2a2a] bg-black/90 px-2 py-1 font-mono text-[10px] tracking-[0.08em] text-[#f3f0e8] uppercase">
        {whatIf ? "Click to site a data center" : "Click an area"}
      </div>
      <div className="pointer-events-none absolute bottom-8 left-2 max-w-[250px] border border-[#2a2a2a] bg-black/90 px-3 py-2 font-mono text-[10px] leading-4 text-[#f3f0e8] md:bottom-3 md:left-3">
        <p className="mb-1 tracking-[0.14em] text-[#a39e93] uppercase">Zoning</p>
        <LegendSwatch className="bg-[#3cba6a]" label="Possible in a district" />
        <LegendSwatch className="bg-[#e6b422]" label="Debated or needs approval" />
        <LegendSwatch className="bg-[#e24b4b]" label="Ordinance blocks the use" />
        <p className="mt-2 mb-1 tracking-[0.14em] text-[#a39e93] uppercase">Facilities</p>
        <LegendDot className="bg-[#7eb6ff]" label="Existing" />
        <LegendDot className="bg-[#f9a825]" label="Permits under review" />
        <LegendDot className="bg-[#ef6c00]" label="Proposed, no DEP file" />
        <LegendDot className="bg-[#8d887e]" label="Planned" />
        <LegendDot className="border border-[#ef6c00] bg-black" label="Approximate location" />
      </div>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={cn("size-2.5 shrink-0", className)} />
      <span>{label}</span>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={cn("size-2.5 shrink-0 rounded-full", className)} />
      <span>{label}</span>
    </div>
  );
}
