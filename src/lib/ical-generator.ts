import type { DayPricing } from "@/types";
import { TIERS } from "./tier-config";
import { formatPrice } from "./date-utils";

/**
 * Generate an iCal (.ics) feed from pricing data
 */
export function generateICal(days: DayPricing[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chez Les Plombiers//Pricing Calendar//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Chez Les Plombiers — Tarifs 2026",
    "X-WR-TIMEZONE:Europe/Paris",
  ];

  for (const day of days) {
    if (day.isBooked) continue;

    const tier = TIERS[day.tier];
    const dateCompact = day.date.replace(/-/g, "");
    const summary = `${tier.label} — ${formatPrice(day.prices.matinee)} (matinée)`;
    const description = [
      `Tier: ${tier.label}`,
      `Raison: ${day.reason}`,
      `Matinée (7h-13h): ${formatPrice(day.prices.matinee)} HT`,
      `Après-midi (13h-19h): ${formatPrice(day.prices["apres-midi"])} HT`,
      `Journée complète (7h-23h): ${formatPrice(day.prices["journee-complete"])} HT`,
      "",
      "39 rue des Bourdonnais, 75001 Paris",
    ].join("\\n");

    lines.push(
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${dateCompact}`,
      `DTEND;VALUE=DATE:${dateCompact}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:39 rue des Bourdonnais\\, 75001 Paris`,
      `CATEGORIES:${tier.label}`,
      `UID:${day.date}@pricing.chezlesplombiers.fr`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
