import { redirect } from "next/navigation";

/** Les finances sont passees a la racine de l'administration le 26/09/2026. */
export default function FinancesRedirect() {
  redirect("/admin");
}
