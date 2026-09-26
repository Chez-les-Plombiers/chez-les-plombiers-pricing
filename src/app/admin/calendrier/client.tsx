"use client";

import { AdminShell } from "@/components/AdminShell";
import { AdminCalendar } from "@/components/AdminCalendar";

export function AdminCalendrierClient() {
  return (
    <AdminShell titre="Calendrier tarifaire">
      {(token) => <AdminCalendar token={token} />}
    </AdminShell>
  );
}
