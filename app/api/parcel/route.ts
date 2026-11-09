import { NextResponse } from "next/server";
import { readParcel } from "@/lib/parcel";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const result = await readParcel(id);
  if (result.status === "invalid") {
    return NextResponse.json(
      { error: "Enter an Allegheny County parcel ID or map-block-lot." },
      { status: 400 },
    );
  }
  if (result.status === "unavailable") {
    return NextResponse.json(
      { error: "The county parcel map did not respond." },
      { status: 502 },
    );
  }
  if (result.status === "empty") {
    return NextResponse.json(
      { error: "No Allegheny County parcel uses that ID." },
      { status: 404 },
    );
  }
  return NextResponse.json({ matches: result.matches });
}
