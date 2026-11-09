export type WaterSite = {
  name: string;
  miles: number;
  kind: "stream" | "well";
  siteNumber: string;
};

export type Lookup<T> =
  | { status: "found"; value: T }
  | { status: "empty" }
  | { status: "unavailable" };

export type WaterReading = {
  channel: Lookup<number>;
  stream: Lookup<WaterSite>;
  streamReading: string | null;
  streamflowCfs: number | null;
  streamflowBasis: "latest" | "typical-day" | null;
  well: Lookup<WaterSite>;
  messages: string[];
  sources: { label: string; href: string }[];
};

const MILES_PER_RADIAN = 3958.8;
const SEARCH_DEGREES = 0.12;
const MAX_MILES = 8;
const FRESH_MS = 14 * 24 * 60 * 60 * 1000;

export function milesBetween(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(latitudeB - latitudeA);
  const dLon = toRadians(longitudeB - longitudeA);
  const lat1 = toRadians(latitudeA);
  const lat2 = toRadians(latitudeB);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * MILES_PER_RADIAN * Math.asin(Math.sqrt(a));
}

export function parseNwisSites(rdb: string, kind: WaterSite["kind"]): WaterSite[] {
  const rows = rdb
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("agency_cd") && !line.startsWith("5s"));
  const sites: WaterSite[] = [];
  for (const row of rows) {
    const columns = row.split("\t");
    const siteNumber = columns[1] ?? "";
    const name = columns[2] ?? "";
    const latitude = Number(columns[4]);
    const longitude = Number(columns[5]);
    if (!siteNumber || !name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }
    sites.push({
      name,
      miles: 0,
      kind,
      siteNumber,
      latitude,
      longitude,
    } as WaterSite & { latitude: number; longitude: number });
  }
  return sites;
}

function nearest(
  sites: Array<WaterSite & { latitude?: number; longitude?: number }>,
  latitude: number,
  longitude: number,
): WaterSite | null {
  let best: WaterSite | null = null;
  for (const site of sites) {
    if (site.latitude === undefined || site.longitude === undefined) continue;
    const miles = milesBetween(latitude, longitude, site.latitude, site.longitude);
    if (miles > MAX_MILES) continue;
    if (!best || miles < best.miles) {
      best = {
        name: site.name,
        miles: Math.round(miles * 10) / 10,
        kind: site.kind,
        siteNumber: site.siteNumber,
      };
    }
  }
  return best;
}

function channelMiles(payload: unknown, latitude: number, longitude: number): number | null {
  if (!payload || typeof payload !== "object") return null;
  const features = (payload as { features?: unknown }).features;
  if (!Array.isArray(features)) return null;
  for (const feature of features) {
    if (!feature || typeof feature !== "object") continue;
    const properties = (feature as { properties?: { type?: string } }).properties;
    const coordinates = (feature as { geometry?: { coordinates?: number[] } }).geometry
      ?.coordinates;
    if (properties?.type !== "hydrolocation" || !coordinates) continue;
    const [snappedLongitude, snappedLatitude] = coordinates;
    if (!Number.isFinite(snappedLongitude) || !Number.isFinite(snappedLatitude)) continue;
    return Math.round(milesBetween(latitude, longitude, snappedLatitude, snappedLongitude) * 10) / 10;
  }
  return null;
}

function freshReading(
  payload: unknown,
  now: number,
): { text: string | null; cfs: number | null } {
  if (!payload || typeof payload !== "object") return { text: null, cfs: null };
  const series = (payload as { value?: { timeSeries?: unknown[] } }).value?.timeSeries;
  if (!Array.isArray(series)) return { text: null, cfs: null };
  const parts: string[] = [];
  let cfs: number | null = null;
  for (const item of series) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      variable?: { variableCode?: { value?: string }[] };
      values?: { value?: { value?: string; dateTime?: string }[] }[];
    };
    const code = row.variable?.variableCode?.[0]?.value;
    const latest = row.values?.[0]?.value?.at(-1);
    if (!latest?.value || !latest.dateTime) continue;
    const when = new Date(latest.dateTime);
    if (Number.isNaN(when.getTime()) || now - when.getTime() > FRESH_MS) continue;
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(when);
    if (code === "00060") {
      const discharge = Number(latest.value);
      if (Number.isFinite(discharge)) cfs = discharge;
      parts.push(`${latest.value} cubic feet per second at ${formatted} ET`);
    }
    if (code === "00065") parts.push(`gage height ${latest.value} ft at ${formatted} ET`);
  }
  return { text: parts.length > 0 ? parts.join("; ") : null, cfs };
}

const REQUEST_HEADERS = {
  "User-Agent": "allegheny-data-centers",
  Accept: "text/plain, application/json",
};

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function readText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.text();
}

export function typicalDischargeCfs(rdb: string, month: number, day: number): number | null {
  const rows = rdb
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("USGS\t"));
  const values: number[] = [];
  let today: number | null = null;
  for (const row of rows) {
    const columns = row.split("\t");
    const rowMonth = Number(columns[5]);
    const rowDay = Number(columns[6]);
    const mean = Number(columns[10]);
    if (!Number.isFinite(mean)) continue;
    values.push(mean);
    if (rowMonth === month && rowDay === day) today = mean;
  }
  if (today !== null) return today;
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function easternMonthDay(now: number): { month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date(now));
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return { month, day };
}

export function searchBox(latitude: number, longitude: number): string {
  const edge = (value: number) => value.toFixed(5);
  return [
    edge(longitude - SEARCH_DEGREES),
    edge(latitude - SEARCH_DEGREES),
    edge(longitude + SEARCH_DEGREES),
    edge(latitude + SEARCH_DEGREES),
  ].join(",");
}

export function describeChannel(channel: Lookup<number>): string {
  if (channel.status === "found") {
    return `The nearest mapped stream channel is about ${channel.value} miles from this pin.`;
  }
  if (channel.status === "empty") {
    return "The stream map did not return a channel distance for this pin.";
  }
  return "The stream map did not respond for this pin.";
}

export function describeStream(stream: Lookup<WaterSite>, reading: string | null): string {
  if (stream.status === "unavailable") {
    return "The USGS stream-site service did not respond for this pin.";
  }
  if (stream.status === "empty") {
    return "No active USGS stream site is within 8 miles.";
  }
  const readingText = reading
    ? ` Latest reading: ${reading}.`
    : " No reading from the past two weeks was returned.";
  return `Nearest active USGS stream site: ${stream.value.name}, ${stream.value.miles} miles.${readingText}`;
}

export function describeWell(well: Lookup<WaterSite>): string {
  if (well.status === "unavailable") {
    return "The USGS groundwater-site service did not respond for this pin.";
  }
  if (well.status === "empty") {
    return "No active USGS groundwater site is within 8 miles.";
  }
  return `Nearest active groundwater site: ${well.value.name}, ${well.value.miles} miles.`;
}

const cache = new Map<string, WaterReading>();

export async function readWater(latitude: number, longitude: number): Promise<WaterReading> {
  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const box = searchBox(latitude, longitude);
  const streamUrl = `https://waterservices.usgs.gov/nwis/site/?format=rdb&bBox=${box}&siteType=ST&siteStatus=active`;
  const wellUrl = `https://waterservices.usgs.gov/nwis/site/?format=rdb&bBox=${box}&siteType=GW&siteStatus=active`;
  const channelUrl = `https://api.water.usgs.gov/nldi/linked-data/hydrolocation?coords=POINT(${longitude}%20${latitude})`;

  const [channelResult, streamResult, wellResult] = await Promise.allSettled([
    readJson(channelUrl),
    readText(streamUrl),
    readText(wellUrl),
  ]);

  const messages: string[] = [];
  const channelMilesValue =
    channelResult.status === "fulfilled"
      ? channelMiles(channelResult.value, latitude, longitude)
      : null;
  const channel: Lookup<number> =
    channelResult.status === "rejected"
      ? { status: "unavailable" }
      : channelMilesValue === null
        ? { status: "empty" }
        : { status: "found", value: channelMilesValue };

  const streamSite =
    streamResult.status === "fulfilled"
      ? nearest(
          parseNwisSites(streamResult.value, "stream") as Array<
            WaterSite & { latitude: number; longitude: number }
          >,
          latitude,
          longitude,
        )
      : null;
  const stream: Lookup<WaterSite> =
    streamResult.status === "rejected"
      ? { status: "unavailable" }
      : streamSite
        ? { status: "found", value: streamSite }
        : { status: "empty" };

  const wellSite =
    wellResult.status === "fulfilled"
      ? nearest(
          parseNwisSites(wellResult.value, "well") as Array<
            WaterSite & { latitude: number; longitude: number }
          >,
          latitude,
          longitude,
        )
      : null;
  const well: Lookup<WaterSite> =
    wellResult.status === "rejected"
      ? { status: "unavailable" }
      : wellSite
        ? { status: "found", value: wellSite }
        : { status: "empty" };

  let streamReading: string | null = null;
  let streamflowCfs: number | null = null;
  let streamflowBasis: WaterReading["streamflowBasis"] = null;
  if (stream.status === "found") {
    const ivUrl = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${stream.value.siteNumber}&parameterCd=00060,00065`;
    try {
      const fresh = freshReading(await readJson(ivUrl), Date.now());
      streamReading = fresh.text;
      streamflowCfs = fresh.cfs;
      if (fresh.cfs !== null) streamflowBasis = "latest";
    } catch {
      messages.push("The latest gage reading did not load.");
    }
    if (streamflowCfs === null) {
      const statUrl = `https://waterservices.usgs.gov/nwis/stat/?format=rdb&sites=${stream.value.siteNumber}&parameterCd=00060&statReportType=daily&statTypeCd=mean`;
      try {
        const { month, day } = easternMonthDay(Date.now());
        const typical = typicalDischargeCfs(await readText(statUrl), month, day);
        if (typical !== null) {
          streamflowCfs = typical;
          streamflowBasis = "typical-day";
        }
      } catch {
        messages.push("The long-term discharge record did not load.");
      }
    }
  }

  const reading: WaterReading = {
    channel,
    stream,
    streamReading,
    streamflowCfs,
    streamflowBasis,
    well,
    messages,
    sources: [
      { label: "USGS National Hydrography Dataset", href: channelUrl },
      { label: "USGS stream sites", href: streamUrl },
      { label: "USGS groundwater sites", href: wellUrl },
    ],
  };
  if (
    channel.status !== "unavailable" &&
    stream.status !== "unavailable" &&
    well.status !== "unavailable"
  ) {
    cache.set(key, reading);
  }
  return reading;
}
