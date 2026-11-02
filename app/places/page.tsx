import type { Metadata } from "next";
import { PlaceBrowser } from "@/components/place-browser";

export const metadata: Metadata = {
  title: "Places",
  description:
    "Pittsburgh neighborhoods and Allegheny County municipalities, with data-center zoning notes.",
};

export default function PlacesPage() {
  return <PlaceBrowser />;
}
