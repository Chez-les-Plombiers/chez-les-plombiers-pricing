"use client";

import { AdminShell } from "@/components/AdminShell";
import { FinancesDashboard } from "@/components/FinancesDashboard";
import { PasskeyReglages } from "@/components/PasskeyReglages";

export function AdminFinancesClient() {
  return (
    <AdminShell titre="Finances">
      {(token, sessionPerimee) => (
        <>
          <FinancesDashboard token={token} onExpire={sessionPerimee} />
          <div className="mt-8">
            <PasskeyReglages token={token} />
          </div>
        </>
      )}
    </AdminShell>
  );
}
