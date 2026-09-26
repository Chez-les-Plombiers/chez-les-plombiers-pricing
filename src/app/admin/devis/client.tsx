"use client";

import { AdminShell } from "@/components/AdminShell";
import { AdminDevis } from "@/components/AdminDevis";

export function AdminDevisClient() {
  return (
    <AdminShell titre="Demandes de devis">
      {(token) => <AdminDevis token={token} />}
    </AdminShell>
  );
}
