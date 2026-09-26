"use client";

import { AdminShell } from "@/components/AdminShell";
import { AdminAnalytics } from "@/components/AdminAnalytics";

export function AdminAnalyticsClient() {
  return (
    <AdminShell titre="Analytics">
      {(token) => <AdminAnalytics token={token} />}
    </AdminShell>
  );
}
