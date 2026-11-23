import type { Metadata } from "next";
import { SimulatorPanel } from "@/components/simulator-panel";

export const metadata: Metadata = {
  title: "Data center simulator",
  description:
    "Configure a hypothetical data center and trace energy, cooling water, noise, diesel exhaust, and illustrative price scenarios to their formulas and references.",
};

export default function SimulatorPage() {
  return <SimulatorPanel />;
}
