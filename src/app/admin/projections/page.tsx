import type { Metadata } from "next";
import { ProjectionDashboard } from "@/components/ProjectionDashboard";

export const metadata: Metadata = {
  title: "Projections — Chez Les Plombiers",
  robots: { index: false, follow: false },
};

export default function ProjectionsPage() {
  return <ProjectionDashboard />;
}
