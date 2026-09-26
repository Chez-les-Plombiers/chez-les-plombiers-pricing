import type { Metadata } from "next";
import { AdminDevisClient } from "./client";

export const metadata: Metadata = {
  title: "Demandes de devis — Chez Les Plombiers",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminDevisClient />;
}
