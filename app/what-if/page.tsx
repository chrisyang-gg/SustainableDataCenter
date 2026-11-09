import type { Metadata } from "next";
import { Suspense } from "react";
import { WhatIfPanel } from "@/components/what-if-panel";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "What if",
  description:
    "Drop a pin in Allegheny County and estimate noise, air, water, and feeder load at the nearest homes, then check the flood and security rules that depend on that pin.",
};

export default function WhatIfPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-2 px-4 py-4" aria-hidden="true">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
      }
    >
      <WhatIfPanel />
    </Suspense>
  );
}
