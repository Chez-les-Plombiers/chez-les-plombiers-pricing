import type { Metadata } from "next";
import { AdminAnalyticsClient } from "./client";

export const metadata: Metadata = {
  title: "Analytics — Chez Les Plombiers",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminAnalyticsClient />;
}
