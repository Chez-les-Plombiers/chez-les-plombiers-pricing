import type { Metadata } from "next";
import { AdminObligatairesClient } from "./client";

export const metadata: Metadata = {
  title: "Obligataires — Chez Les Plombiers",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminObligatairesClient />;
}
