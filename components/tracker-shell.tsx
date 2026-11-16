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
    return <div className="absolute inset-0 bg-black" aria-hidden="true" />;
  }
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
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
  const whatIfActive = pathname.startsWith("/what-if");
  const simulatorActive = pathname.startsWith("/simulator");
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
        <header className="flex shrink-0 items-end justify-between gap-4 border-b border-border bg-black px-4 py-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              Allegheny County, Pennsylvania
            </p>
            <Link href="/" className="text-lg font-medium text-foreground">
              Data center map
            </Link>
          </div>
          <nav
            className="flex shrink-0 gap-4 font-mono text-[11px] tracking-[0.14em] uppercase"
            aria-label="Map sections"
          >
            <Link
              href="/"
              className={cn(
                "pb-0.5",
                projectsActive
                  ? "text-primary underline decoration-1 underline-offset-4"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={projectsActive ? "page" : undefined}
            >
              Projects
            </Link>
            <Link
              href="/places"
              className={cn(
                "pb-0.5",
                placesActive
                  ? "text-primary underline decoration-1 underline-offset-4"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={placesActive ? "page" : undefined}
            >
              Places
            </Link>
            <Link
              href="/what-if"
              className={cn(
                "pb-0.5",
                whatIfActive
                  ? "text-primary underline decoration-1 underline-offset-4"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={whatIfActive ? "page" : undefined}
            >
              What-if
            </Link>
            <Link
              href="/simulator"
              className={cn(
                "pb-0.5",
                simulatorActive
                  ? "text-primary underline decoration-1 underline-offset-4"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={simulatorActive ? "page" : undefined}
            >
              Simulator
            </Link>
          </nav>
        </header>
        <div className="flex flex-1 flex-col md:min-h-0 md:flex-row">
          <div className="relative order-1 h-[48vh] min-h-[260px] shrink-0 md:order-2 md:h-auto md:min-h-0 md:flex-1">
            <MapSlot />
          </div>
          <aside className="order-2 flex flex-col border-border bg-black md:order-1 md:min-h-0 md:w-[440px] md:flex-none md:overflow-hidden md:border-r">
            {children}
          </aside>
        </div>
      </div>
    </FiltersContext.Provider>
  );
}
