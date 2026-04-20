import type { Metadata } from "next";
import { FinancesDashboard } from "@/components/FinancesDashboard";

export const metadata: Metadata = {
  title: "Finances — Chez Les Plombiers",
  robots: { index: false, follow: false },
};

export default function FinancesPage() {
  return <FinancesDashboard />;
}
