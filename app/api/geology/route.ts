import { NextResponse } from "next/server";
import { pointInCounty, readGeology } from "@/lib/geology";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "A latitude and longitude are required." }, { status: 400 });
  }
  if (!pointInCounty(latitude, longitude)) {
    return NextResponse.json(
      { error: "That point is outside Allegheny County." },
      { status: 400 },
    );
  }
  const report = await readGeology(latitude, longitude);
  return NextResponse.json(report);
}
