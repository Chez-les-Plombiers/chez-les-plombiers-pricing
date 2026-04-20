export type TierSlug = "fashion-week" | "premium" | "medium" | "low";

export type TimeSlot = "matinee" | "apres-midi" | "journee-complete";

export type BookingWindow = "early-bird" | "standard" | "confirmed" | "last-minute";

export interface TierDefinition {
  slug: TierSlug;
  label: string;
  color: string;
  colorClass: string;
  bgClass: string;
}

export interface DayPricing {
  date: string; // YYYY-MM-DD
  tier: TierSlug;
  reason: string;
  basePrice: number; // journée complète base
  prices: Record<TimeSlot, number>; // after booking window coefficient
  bookingWindow: BookingWindow;
  bookingWindowLabel: string;
  bookingWindowCoeff: number;
  isBooked: boolean;
  isBookedMorning: boolean;
  isBookedAfternoon: boolean;
  isOverride: boolean;
}

export interface PricingOverride {
  date: string; // YYYY-MM-DD
  tier?: TierSlug;
  basePrice?: number;
  prices?: Partial<Record<TimeSlot, number>>;
  isBooked?: boolean;
  isBookedMorning?: boolean;
  isBookedAfternoon?: boolean;
  reason?: string;
}

export interface QuoteRequest {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  siret?: string;
  endClient?: string;
  numberOfDays: number;
  guestCount: number;
  eventType: string;
  message?: string;
  createdAt: string;
}

export interface AnalyticsEvent {
  date: string; // YYYY-MM-DD
  viewedAt: string;
}

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  matinee: "Matinée (7h-13h)",
  "apres-midi": "Après-midi (13h-19h)",
  "journee-complete": "Journée complète (7h-23h)",
};

// ── Finances Dashboard ──

export type FinanceStatus = "realized" | "in-progress" | "planned";

export interface ChargesVariables {
  menage: number;
  fb: number;
  frais: number;
  autres: number;
}

export interface FinanceMonth {
  year: number;
  month: number; // 1-12
  status: FinanceStatus;
  chargesFixes: number;
  caManuel: number; // CA saisi à la main (hors Pennylane)
  caPrevisionnel: number;
  chargesVar: ChargesVariables;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PennylaneMonthData {
  caFacture: number; // HT — all non-cancelled invoices
  caEncaisse: number; // HT — paid invoices only
  invoiceCount: number;
}

export interface InvoiceItem {
  id: number;
  invoiceNumber: string;
  clientName: string;
  subject: string;
  date: string;
  status: string;
  paid: boolean;
  amountHT: number;
  attributedMonth: number;
}

export interface FinanceMonthWithPennylane extends FinanceMonth {
  pennylane: PennylaneMonthData;
  invoices: InvoiceItem[];
}
