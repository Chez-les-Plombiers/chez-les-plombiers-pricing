/** GA4 event helper — safe no-op if gtag is not loaded */


declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type GtagParams = Record<string, string | number | boolean | undefined>;

/**
 * Évènement GA4, sans effet si gtag n'est pas chargé.
 * Les paramètres sont libres : chaque évènement porte désormais le lieu
 * (`venue`), indispensable pour comparer les trois calendriers.
 */
export function trackEvent(eventName: string, params?: GtagParams) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}
