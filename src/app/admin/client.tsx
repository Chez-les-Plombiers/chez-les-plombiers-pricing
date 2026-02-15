"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminCalendar } from "@/components/AdminCalendar";

export function AdminClient() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("admin-token");
    }
    return null;
  });

  function handleLogin(t: string) {
    sessionStorage.setItem("admin-token", t);
    setToken(t);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {!token ? (
          <AdminLogin onLogin={handleLogin} />
        ) : (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground">
                Administration
              </h1>
              <button
                onClick={() => setToken(null)}
                className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-tier-premium hover:text-tier-premium"
              >
                Déconnexion
              </button>
            </div>
            <AdminCalendar token={token} />
          </div>
        )}
      </main>
    </div>
  );
}
