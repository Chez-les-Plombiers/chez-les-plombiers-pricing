"use client";

import { AdminShell } from "@/components/AdminShell";
import { ProjectionDashboard } from "@/components/ProjectionDashboard";

export function AdminProjectionsClient() {
  return (
    <AdminShell titre="Projections 2026">
      {() => <ProjectionDashboard />}
    </AdminShell>
  );
}
