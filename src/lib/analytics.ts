/** GA4 event helper — safe no-op if gtag is not loaded */

type GtagEvent = {
  calendar_day_click: {
    date: string;
    tier: string;
    price: number;
    booking_window: string;
  };
  quote_form_open: {
    date: string;
    time_slot: string;
    price: number;
  };
  quote_form_submit: {
    date: string;
    time_slot: string;
    event_type: string;
    price: number;
    guest_count: number;
  };
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent<K extends keyof GtagEvent>(
  eventName: K,
  params: GtagEvent[K]
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}
