"use client";

import { trackEvent } from "@/lib/analytics";

const WHATSAPP_URL = "https://wa.me/33761471073";

interface WhatsAppLinkProps {
  /** Où se trouvait le lien : « tarifs_accueil », « atelier_intro », « grille_cgl »… */
  location: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Lien WhatsApp qui se compte.
 *
 * Le clic WhatsApp est l'une des deux conversions retenues par Étienne
 * (19/09/2026), l'autre étant l'envoi d'un devis. Or les trois liens WhatsApp
 * de cette application vivaient dans des composants serveur, sans le moindre
 * `onClick` : ces départs n'étaient donc comptés nulle part.
 *
 * Ce composant existe uniquement pour porter le `"use client"` autour de
 * l'ancre — le reste de la page peut rester en composant serveur.
 */
export function WhatsAppLink({ location, className, children }: WhatsAppLinkProps) {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackEvent("whatsapp_click", { location })}
    >
      {children}
    </a>
  );
}
