import { NextResponse } from "next/server";
import { nearestHomes } from "@/lib/community";
import { pointInCounty } from "@/lib/geology";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !pointInCounty(latitude, longitude)) {
    return NextResponse.json(
      { error: "A point inside Allegheny County is required." },
      { status: 400 },
    );
  }
  const homes = await nearestHomes(latitude, longitude);
  return NextResponse.json({ homes });
}
