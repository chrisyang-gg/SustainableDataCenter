"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  Suspense,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { facilities } from "@/data/facilities";
import {
  filterFacilities,
  type FacilityFilters,
  type StageFilter,
} from "@/lib/facilities";
import FacilityMap from "@/components/facility-map";
import { cn } from "@/lib/utils";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function MapSlot() {
  const isClient = useIsClient();
  if (!isClient) {
    return <div className="absolute inset-0 bg-[#e6ebf0]" aria-hidden="true" />;
  }
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-[#e6ebf0]" />}>
      <FacilityMap />
    </Suspense>
  );
}

const FiltersContext = createContext<{
  filters: FacilityFilters;
  setFilters: (next: FacilityFilters) => void;
  results: ReturnType<typeof filterFacilities>;
} | null>(null);

export function useFacilityFilters() {
  const value = useContext(FiltersContext);
  if (!value) {
    throw new Error("Facility filters are only available inside the tracker.");
  }
  return value;
}

export function TrackerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const projectsActive =
    pathname === "/" || pathname.startsWith("/facilities");
  const placesActive = pathname.startsWith("/places");
  const [filters, setFilters] = useState<FacilityFilters>({
    query: "",
    stage: "all" satisfies StageFilter,
    municipality: "all",
  });
  const results = useMemo(
    () => filterFacilities(facilities, filters),
    [filters],
  );

  return (
    <FiltersContext.Provider value={{ filters, setFilters, results }}>
      <div className="flex min-h-dvh flex-col md:h-dvh">
        <header className="flex shrink-0 items-center justify-between gap-4 bg-[#0f3d6e] px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.14em] text-[#b9d4f0] uppercase">
              Allegheny County, Pennsylvania
            </p>
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Data center map
            </Link>
          </div>
          <nav className="flex shrink-0 gap-1 text-sm" aria-label="Map sections">
            <Link
              href="/"
              className={cn(
                "rounded px-2.5 py-1",
                projectsActive ? "bg-white/15 font-semibold" : "text-[#d6e6f5]",
              )}
              aria-current={projectsActive ? "page" : undefined}
            >
              Projects
            </Link>
            <Link
              href="/places"
              className={cn(
                "rounded px-2.5 py-1",
                placesActive ? "bg-white/15 font-semibold" : "text-[#d6e6f5]",
              )}
              aria-current={placesActive ? "page" : undefined}
            >
              Places
            </Link>
          </nav>
        </header>
        <div className="flex flex-1 flex-col md:min-h-0 md:flex-row">
          <div className="relative order-1 h-[48vh] min-h-[260px] shrink-0 md:order-2 md:h-auto md:min-h-0 md:flex-1">
            <MapSlot />
          </div>
          <aside className="order-2 flex flex-col bg-white md:order-1 md:min-h-0 md:w-[460px] md:flex-none md:overflow-hidden md:border-r md:border-[#d5dde5]">
            {children}
          </aside>
        </div>
      </div>
    </FiltersContext.Provider>
  );
}
