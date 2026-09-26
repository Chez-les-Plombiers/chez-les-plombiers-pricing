import { apiUrl } from "@/lib/base-path";

/**
 * Ferme la session cote serveur, pas seulement dans l'onglet.
 *
 * ⚠️ Vider `sessionStorage` ne deconnecte personne : le jeton reste valable
 * pour qui l'aurait recopie. Tant que le jeton EST le mot de passe (ancien
 * comportement), il n'y a rien a detruire — d'ou le silence sur l'echec.
 */
export function deconnexion(jeton: string): void {
  void fetch(apiUrl("/api/admin/auth"), {
    method: "DELETE",
    headers: { Authorization: jeton },
  }).catch(() => {});
}
