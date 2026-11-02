import {
  facilities,
  type Facility,
  type Stage,
} from "@/data/facilities";

export type StageFilter = "all" | Stage;

export type FacilityFilters = {
  query: string;
  stage: StageFilter;
  municipality: string;
};

const stageRank: Record<Stage, number> = {
  proposed: 0,
  planned: 1,
  existing: 2,
};

export function sortFacilities(list: Facility[]): Facility[] {
  return [...list].sort(
    (a, b) =>
      stageRank[a.stage] - stageRank[b.stage] ||
      a.name.localeCompare(b.name),
  );
}

export function filterFacilities(
  list: Facility[],
  filters: FacilityFilters,
): Facility[] {
  const query = filters.query.trim().toLowerCase();
  return sortFacilities(list).filter((facility) => {
    if (filters.stage !== "all" && facility.stage !== filters.stage) {
      return false;
    }
    if (
      filters.municipality !== "all" &&
      facility.municipality !== filters.municipality
    ) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      facility.name,
      facility.municipality,
      facility.summary,
      facility.dep?.projectName ?? "",
      ...facility.alsoKnownAs,
      ...facility.companies,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function markerPosition(
  facility: Facility,
  list: Facility[] = facilities,
): { latitude: number; longitude: number; nudged: boolean } {
  const key = (item: Facility) =>
    `${item.latitude.toFixed(3)},${item.longitude.toFixed(3)}`;
  const group = list
    .filter((item) => key(item) === key(facility))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  if (group.length < 2) {
    return {
      latitude: facility.latitude,
      longitude: facility.longitude,
      nudged: false,
    };
  }
  const index = Math.max(
    0,
    group.findIndex((item) => item.slug === facility.slug),
  );
  const angle = (2 * Math.PI * index) / group.length - Math.PI / 2;
  const radius = 0.0016;
  return {
    latitude: facility.latitude + radius * Math.sin(angle),
    longitude:
      facility.longitude +
      (radius * Math.cos(angle)) /
        Math.cos((facility.latitude * Math.PI) / 180),
    nudged: true,
  };
}

export function formatSubmitted(value: string): string {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) return value || "—";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[Number(match[1]) - 1];
  if (!month) return value;
  return `${month} ${Number(match[2])}, ${2000 + Number(match[3])}`;
}

export function depStatusLabel(projectStatus: string): string {
  if (projectStatus === "Under Review") return "Permits under review";
  if (projectStatus === "Proposed (No Applications Received)") {
    return "No application received";
  }
  if (projectStatus === "Dep Review Complete") return "DEP review complete";
  return projectStatus;
}

export function stageLabel(stage: Stage): string {
  if (stage === "existing") return "Existing";
  if (stage === "planned") return "Planned";
  return "Proposed";
}
