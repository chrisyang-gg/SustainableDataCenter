import type { Metadata } from "next";
import { SimulatorPanel } from "@/components/simulator-panel";

export const metadata: Metadata = {
  title: "Data center simulator",
  description:
    "Configure a hypothetical data center from its construction choices and estimate noise, generator exhaust, and the per-unit price increase.",
};

export default function SimulatorPage() {
  return <SimulatorPanel />;
}
