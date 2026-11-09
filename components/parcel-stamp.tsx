"use client";

import { useSearchParams } from "next/navigation";

export function ParcelStamp() {
  const params = useSearchParams();
  const parcel = params.get("parcel");
  const lot = params.get("lot");
  if (!parcel && !lot) return null;
  return (
    <p className="mt-2 font-mono text-xs leading-5 text-muted-foreground">
      {parcel ? `Parcel ${parcel}` : "Parcel"}
      {lot ? ` · map-block-lot ${lot}` : ""}
    </p>
  );
}
