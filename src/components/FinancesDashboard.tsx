"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingDown,
  PenLine,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { AdminLogin } from "./AdminLogin";
import { Navbar } from "./Navbar";
import type {
  FinanceMonthWithPennylane,
  FinanceStatus,
  ChargesVariables,
  InvoiceItem,
} from "@/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const MONTH_SHORT = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

const STATUS_CYCLE: FinanceStatus[] = ["realized", "in-progress", "planned"];
const STATUS_LABELS: Record<FinanceStatus, string> = {
  realized: "✓ Réalisé",
  "in-progress": "● En cours",
  planned: "○ Prévisionnel",
};
const STATUS_CLASSES: Record<FinanceStatus, string> = {
  realized: "bg-[rgba(92,184,124,0.12)] text-[#5cb87c]",
  "in-progress": "bg-[rgba(201,168,76,0.12)] text-[#c9a84c]",
  planned: "bg-[rgba(255,255,255,0.05)] text-muted",
};

type PeriodFilter = "all" | "q1" | "q2" | "q3" | "q4" | "h1" | "h2";
const PERIOD_FILTERS: { key: PeriodFilter; label: string; months: number[] }[] = [
  { key: "all", label: "Année", months: [1,2,3,4,5,6,7,8,9,10,11,12] },
  { key: "q1",  label: "T1",    months: [1,2,3] },
  { key: "q2",  label: "T2",    months: [4,5,6] },
  { key: "q3",  label: "T3",    months: [7,8,9] },
  { key: "q4",  label: "T4",    months: [10,11,12] },
  { key: "h1",  label: "S1",    months: [1,2,3,4,5,6] },
  { key: "h2",  label: "S2",    months: [7,8,9,10,11,12] },
];

function formatEur(n: number): string {
  if (n === 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatSigned(n: number): string {
  if (n === 0) return "—";
  const prefix = n > 0 ? "+" : "";
  return (
    prefix +
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n)
  );
}

function totalChargesVar(cv: ChargesVariables): number {
  return cv.menage + cv.fb + cv.frais + cv.autres;
}

function totalCharges(m: FinanceMonthWithPennylane): number {
  return m.chargesFixes + totalChargesVar(m.chargesVar);
}

function effectiveCA(m: FinanceMonthWithPennylane): number {
  const manuel = m.caManuel ?? 0;
  if (m.status === "realized") return m.pennylane.caEncaisse + manuel;
  if (m.status === "in-progress") {
    const pennylane = m.pennylane.caFacture > 0 ? m.pennylane.caFacture : 0;
    return (pennylane + manuel) || m.caPrevisionnel;
  }
  return m.caPrevisionnel;
}

function hasCAData(m: FinanceMonthWithPennylane): boolean {
  // "Réalisé" months always count (they're closed, even if CA=0 → real loss)
  if (m.status === "realized") return true;
  return effectiveCA(m) > 0;
}

function resultat(m: FinanceMonthWithPennylane): number {
  if (!hasCAData(m)) return 0;
  return effectiveCA(m) - totalCharges(m);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FinancesDashboard() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== "undefined")
      return sessionStorage.getItem("admin-token");
    return null;
  });

  function handleLogin(t: string) {
    sessionStorage.setItem("admin-token", t);
    setToken(t);
  }

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <AdminLogin onLogin={handleLogin} />
        </main>
      </div>
    );
  }

  return <FinancesContent token={token} setToken={setToken} />;
}

// ─── Inner Content ──────────────────────────────────────────────────────────

function FinancesContent({
  token,
  setToken,
}: {
  token: string;
  setToken: (t: string | null) => void;
}) {
  const [year, setYear] = useState(2026);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [data, setData] = useState<FinanceMonthWithPennylane[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());
  const saveTimeout = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/finances?year=${year}`);
      if (!res.ok) throw new Error("fetch error");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Failed to load finances:", e);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const patchMonth = useCallback(
    (month: number, updates: Record<string, unknown>) => {
      // Optimistic update
      setData((prev) => {
        if (!prev) return prev;
        return prev.map((m) =>
          m.month === month ? { ...m, ...updates } : m
        );
      });

      // Debounced save
      const key = `${month}`;
      if (saveTimeout.current[key]) clearTimeout(saveTimeout.current[key]);
      saveTimeout.current[key] = setTimeout(async () => {
        await fetch(`/api/finances/${year}/${month}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(updates),
        });
      }, 400);
    },
    [token, year]
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await fetchData();
  }, [fetchData]);

  const handleReset = useCallback(async () => {
    if (!confirm(`Effacer toutes les données saisies pour ${year} et revenir aux valeurs par défaut ?`))
      return;
    await fetch(`/api/finances/reset/${year}`, {
      method: "POST",
      headers: { Authorization: token },
    });
    await fetchData();
  }, [token, fetchData, year]);

  const handleExport = useCallback(async () => {
    const res = await fetch(`/api/finances/export?year=${year}`, {
      headers: { Authorization: token },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finances-${year}-clp.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [token, year]);

  const cycleStatus = useCallback(
    (month: number, current: FinanceStatus) => {
      const idx = STATUS_CYCLE.indexOf(current);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      patchMonth(month, { status: next });
    },
    [patchMonth]
  );

  const toggleExpand = useCallback((month: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }, []);

  const toggleInvoices = useCallback((month: number) => {
    setExpandedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }, []);

  const reattributeInvoice = useCallback(
    async (invoiceId: number, newMonth: number) => {
      await fetch("/api/finances/invoice-override", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ year, invoiceId, month: newMonth }),
      });
      await fetchData();
    },
    [token, year, fetchData]
  );

  // ── Computed ──

  const activeMonths = useMemo(() => {
    const filter = PERIOD_FILTERS.find((f) => f.key === period);
    return filter ? filter.months : [1,2,3,4,5,6,7,8,9,10,11,12];
  }, [period]);

  const filteredData = useMemo(() => {
    if (!data) return null;
    return data.filter((m) => activeMonths.includes(m.month));
  }, [data, activeMonths]);

  const summaryCards = useMemo(() => {
    if (!filteredData) return null;
    const totalEncaisse = filteredData.reduce(
      (s, m) => s + m.pennylane.caEncaisse + (m.caManuel ?? 0), 0
    );
    const totalCA = filteredData.reduce((s, m) => s + effectiveCA(m), 0);
    const totalCh = filteredData.reduce((s, m) => s + totalCharges(m), 0);
    const totalRes = totalCA - totalCh;
    const nbMoisCA = filteredData.filter(
      (m) => m.pennylane.caEncaisse > 0 || (m.caManuel ?? 0) > 0
    ).length;

    return { totalEncaisse, totalCA, totalCh, totalRes, nbMoisCA };
  }, [filteredData]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          <div className="flex items-center justify-center py-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-[1300px] flex-1 px-4 py-8 sm:px-8">
        {/* Header */}
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground">
              Finances
            </h1>
            {/* Year selector */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setYear((y) => y - 1); setLoading(true); }}
                className="p-1 text-muted transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[50px] text-center font-mono text-xl font-bold text-accent">
                {year}
              </span>
              <button
                onClick={() => { setYear((y) => y + 1); setLoading(true); }}
                className="p-1 text-muted transition-colors hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <ArrowLeft className="h-3 w-3" />
              Admin
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem("admin-token");
                setToken(null);
              }}
              className="border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-[#d95f5f] hover:text-[#d95f5f]"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <div className="mb-7 flex items-center justify-between">
          <p className="text-xs text-muted">
            Suivi mensuel — CA facturé & encaissé (Pennylane) + saisie manuelle vs charges.
          </p>
          {/* Period filters */}
          <div className="flex items-center gap-1">
            {PERIOD_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setPeriod(f.key)}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  period === f.key
                    ? "bg-foreground text-background"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summaryCards && (
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <SummaryCard
              label="CA Encaissé YTD"
              value={formatEur(summaryCards.totalEncaisse)}
              sub={
                summaryCards.nbMoisCA > 0
                  ? `${summaryCards.nbMoisCA} mois comptabilisé${summaryCards.nbMoisCA > 1 ? "s" : ""}`
                  : "aucun mois saisi"
              }
              color="green"
            />
            <SummaryCard
              label="CA Prévisionnel 2026"
              value={formatEur(summaryCards.totalCA)}
              sub="total CA attendu sur l'année"
              color="gold"
            />
            <SummaryCard
              label="Charges Annuelles"
              value={formatEur(summaryCards.totalCh)}
              sub="charges fixes + variables"
            />
            <SummaryCard
              label="Résultat Projeté"
              value={
                summaryCards.totalCA > 0
                  ? formatSigned(summaryCards.totalRes)
                  : "0 €"
              }
              sub="CA prévisionnel − charges"
              color={
                summaryCards.totalRes > 0
                  ? "green"
                  : summaryCards.totalRes < 0
                    ? "red"
                    : undefined
              }
            />
          </div>
        )}

        {/* Chart */}
        <div className="mb-6 border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              CA Mensuel vs Charges
            </span>
            <div className="flex items-center gap-4">
              <LegendDot color="#5cb87c" label="CA encaissé" />
              <LegendDot color="#c9a84c" label="CA facturé" />
              <LegendDot color="rgba(147,130,220,0.7)" label="CA manuel" />
              <LegendDot color="rgba(255,255,255,0.15)" label="Charges" />
            </div>
          </div>
          <div className="h-[180px]">
            <FinancesChart data={data} />
          </div>
        </div>

        {/* Table */}
        <div className="border border-border bg-card">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Suivi mensuel {year}
              {period !== "all" && (
                <span className="ml-2 text-accent">
                  ({PERIOD_FILTERS.find((f) => f.key === period)?.label})
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
                />
                Synchro
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Download className="h-3 w-3" />
                CSV
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[#d95f5f] transition-colors hover:border-[#d95f5f]"
              >
                <RotateCcw className="h-3 w-3" />
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-[100px] border-b border-border px-3.5 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                    Mois
                  </th>
                  <th className="w-[130px] border-b border-border px-3.5 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                    Statut
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    Charges fixes
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    + Variables
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-[#5cb87c]">
                    CA Encaissé
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-[#c9a84c]">
                    CA Facturé
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-foreground">
                    <span className="flex items-center justify-end gap-1">
                      <PenLine className="h-3 w-3" />
                      CA Manuel
                    </span>
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    CA Prévisionnel
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    Résultat
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    Cumul
                  </th>
                  <th className="w-[36px] border-b border-border" />
                </tr>
              </thead>
              <tbody>
                <MonthRows
                  data={filteredData ?? []}
                  expanded={expanded}
                  expandedInvoices={expandedInvoices}
                  onCycleStatus={cycleStatus}
                  onToggleExpand={toggleExpand}
                  onToggleInvoices={toggleInvoices}
                  onReattribute={reattributeInvoice}
                  onPatch={patchMonth}
                />
              </tbody>
              <tfoot>
                <FooterRow data={filteredData ?? []} year={year} />
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Summary Card ───────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: "green" | "gold" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-[#5cb87c]"
      : color === "gold"
        ? "text-[#c9a84c]"
        : color === "red"
          ? "text-[#d95f5f]"
          : "text-foreground";

  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-2.5 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className={`font-mono text-[28px] font-bold leading-none ${colorClass}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[11px] text-muted">{sub}</div>
    </div>
  );
}

// ─── Legend Dot ──────────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
      <div className="h-2.5 w-2.5 shrink-0" style={{ background: color }} />
      {label}
    </div>
  );
}

// ─── Chart ──────────────────────────────────────────────────────────────────

function FinancesChart({ data }: { data: FinanceMonthWithPennylane[] }) {
  const chartData = useMemo(() => {
    // Build full 12-month arrays, fill gaps with null for months not in filtered data
    const byMonth = new Map(data.map((m) => [m.month, m]));
    const labels: string[] = [];
    const encaisse: (number | null)[] = [];
    const facture: (number | null)[] = [];
    const manuel: (number | null)[] = [];
    const charges: (number | null)[] = [];

    for (let i = 0; i < 12; i++) {
      const m = byMonth.get(i + 1);
      labels.push(MONTH_SHORT[i]);
      if (m) {
        encaisse.push(m.pennylane.caEncaisse || null);
        facture.push(m.pennylane.caFacture || null);
        manuel.push((m.caManuel ?? 0) || null);
        charges.push(totalCharges(m));
      } else {
        encaisse.push(null);
        facture.push(null);
        manuel.push(null);
        charges.push(null);
      }
    }

    return {
      labels,
      datasets: [
        { label: "CA Encaissé", data: encaisse, backgroundColor: "rgba(92,184,124,0.8)" },
        { label: "CA Facturé", data: facture, backgroundColor: "rgba(201,168,76,0.65)" },
        { label: "CA Manuel", data: manuel, backgroundColor: "rgba(147,130,220,0.7)" },
        { label: "Charges", data: charges, backgroundColor: "rgba(255,255,255,0.08)" },
      ],
    };
  }, [data]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#2a2a2a",
          titleColor: "#888",
          bodyColor: "#e8e4dc",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          callbacks: {
            label: (ctx: TooltipItem<"bar">) => {
              const v = ctx.raw as number | null;
              if (!v) return "";
              return ` ${ctx.dataset.label ?? ""} : ${formatEur(v)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#888",
            font: { family: "Space Mono", size: 11 },
          },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#888",
            font: { family: "Space Mono", size: 10 },
            callback: (v: string | number) => {
              const num = typeof v === "string" ? parseFloat(v) : v;
              return num >= 1000 ? num / 1000 + "k" : num;
            },
          },
          beginAtZero: true,
        },
      },
    }),
    []
  );

  return <Bar data={chartData} options={options} />;
}

// ─── Month Rows ─────────────────────────────────────────────────────────────

function MonthRows({
  data,
  expanded,
  expandedInvoices,
  onCycleStatus,
  onToggleExpand,
  onToggleInvoices,
  onReattribute,
  onPatch,
}: {
  data: FinanceMonthWithPennylane[];
  expanded: Set<number>;
  expandedInvoices: Set<number>;
  onCycleStatus: (month: number, current: FinanceStatus) => void;
  onToggleExpand: (month: number) => void;
  onToggleInvoices: (month: number) => void;
  onReattribute: (invoiceId: number, newMonth: number) => void;
  onPatch: (month: number, updates: Record<string, unknown>) => void;
}) {
  // Pre-compute cumulative results (avoids mutation during render)
  const cumulByMonth = useMemo(() => {
    const result: Record<number, number> = {};
    let cumul = 0;
    for (const m of data) {
      const has = hasCAData(m);
      const res = resultat(m);
      cumul += has ? res : 0;
      result[m.month] = cumul;
    }
    return result;
  }, [data]);

  return (
    <>
      {data.map((m) => {
        const charV = totalChargesVar(m.chargesVar);
        const res = resultat(m);
        const has = hasCAData(m);
        const ca = effectiveCA(m);

        const isExp = expanded.has(m.month);
        const isInvExp = expandedInvoices.has(m.month);
        const underTarget = has && ca > 0 && ca < totalCharges(m) * 0.8;
        const noData =
          m.pennylane.caFacture === 0 &&
          m.pennylane.caEncaisse === 0 &&
          (m.caManuel ?? 0) === 0 &&
          m.caPrevisionnel === 0 &&
          m.status !== "realized";

        return (
          <MonthRow
            key={m.month}
            m={m}
            cumulRes={cumulByMonth[m.month]}
            res={res}
            charV={charV}
            hasData={has}
            isExp={isExp}
            isInvExp={isInvExp}
            underTarget={underTarget}
            noData={noData}
            onCycleStatus={onCycleStatus}
            onToggleExpand={onToggleExpand}
            onToggleInvoices={onToggleInvoices}
            onReattribute={onReattribute}
            onPatch={onPatch}
          />
        );
      })}
    </>
  );
}

function MonthRow({
  m,
  cumulRes,
  res,
  charV,
  hasData,
  isExp,
  isInvExp,
  underTarget,
  noData,
  onCycleStatus,
  onToggleExpand,
  onToggleInvoices,
  onReattribute,
  onPatch,
}: {
  m: FinanceMonthWithPennylane;
  cumulRes: number;
  res: number;
  charV: number;
  hasData: boolean;
  isExp: boolean;
  isInvExp: boolean;
  underTarget: boolean;
  noData: boolean;
  onCycleStatus: (month: number, current: FinanceStatus) => void;
  onToggleExpand: (month: number) => void;
  onToggleInvoices: (month: number) => void;
  onReattribute: (invoiceId: number, newMonth: number) => void;
  onPatch: (month: number, updates: Record<string, unknown>) => void;
}) {
  const resColor = res > 0 ? "text-[#5cb87c]" : res < 0 ? "text-[#d95f5f]" : "text-muted";
  const cumulColor =
    cumulRes > 0 ? "text-[#5cb87c]" : cumulRes < 0 ? "text-[#d95f5f]" : "text-muted";

  return (
    <>
      <tr className="border-b border-border transition-colors hover:bg-[rgba(255,255,255,0.02)]">
        <td className="px-3.5 py-2.5 font-mono text-[13px] font-bold tracking-wide">
          {MONTH_NAMES[m.month - 1]}
        </td>
        <td className="px-3.5 py-2.5">
          <button
            onClick={() => onCycleStatus(m.month, m.status)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 font-mono text-[10px] tracking-wide transition-opacity hover:opacity-80 ${STATUS_CLASSES[m.status]}`}
            title="Cliquer pour changer le statut"
          >
            {STATUS_LABELS[m.status]}
          </button>
        </td>
        <td className="px-3.5 py-2.5 text-right font-mono text-[13px] text-muted">
          {formatEur(m.chargesFixes)}
        </td>
        <td className="px-3.5 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            {charV > 0 ? (
              <span className="bg-[rgba(201,168,76,0.12)] px-1.5 py-px font-mono text-[10px] text-[#c9a84c]">
                +{formatEur(charV)}
              </span>
            ) : (
              <span className="font-mono text-[13px] text-muted">—</span>
            )}
            <button
              onClick={() => onToggleExpand(m.month)}
              className="p-0.5 text-muted transition-colors hover:text-foreground"
              title="Détailler les charges variables"
            >
              {isExp ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </td>
        <td className="px-3.5 py-2.5 text-right font-mono text-[13px] text-[#5cb87c]">
          {m.pennylane.caEncaisse ? formatEur(m.pennylane.caEncaisse) : "—"}
        </td>
        <td className="px-3.5 py-2.5 text-right">
          {m.pennylane.caFacture ? (
            <button
              onClick={() => onToggleInvoices(m.month)}
              className="inline-flex items-center gap-1 font-mono text-[13px] text-[#c9a84c] transition-opacity hover:opacity-70"
              title={`${m.invoices.length} facture${m.invoices.length > 1 ? "s" : ""} — cliquer pour détailler`}
            >
              {formatEur(m.pennylane.caFacture)}
              <span className="text-[9px] text-muted">({m.invoices.length})</span>
            </button>
          ) : (
            <span className="font-mono text-[13px] text-muted">—</span>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-right">
          <EditableNumber
            value={m.caManuel ?? 0}
            onChange={(v) => onPatch(m.month, { caManuel: v })}
          />
        </td>
        <td className="px-3.5 py-2.5 text-right">
          <EditableNumber
            value={m.caPrevisionnel}
            onChange={(v) => onPatch(m.month, { caPrevisionnel: v })}
          />
        </td>
        <td className={`px-3.5 py-2.5 text-right font-mono text-[13px] ${resColor}`}>
          {hasData ? formatSigned(res) : "—"}
        </td>
        <td className={`px-3.5 py-2.5 text-right font-mono text-[13px] ${cumulColor}`}>
          {hasData ? formatSigned(cumulRes) : "—"}
        </td>
        <td className="px-3.5 py-2.5 text-center">
          {noData && (
            <span title="Aucun CA pour ce mois">
              <AlertTriangle className="inline h-3 w-3 text-muted" />
            </span>
          )}
          {underTarget && (
            <span title="CA < 80% des charges">
              <TrendingDown className="inline h-3 w-3 text-[#d95f5f]" />
            </span>
          )}
        </td>
      </tr>
      {isExp && (
        <tr className="border-b border-border">
          <td colSpan={11} className="bg-[rgba(0,0,0,0.25)] px-8 py-3">
            <div className="grid max-w-[680px] grid-cols-4 gap-3">
              <VarInput
                label="Ménage"
                value={m.chargesVar.menage}
                onChange={(v) =>
                  onPatch(m.month, {
                    chargesVar: { ...m.chargesVar, menage: v },
                  })
                }
              />
              <VarInput
                label="F&B / Cocktails"
                value={m.chargesVar.fb}
                onChange={(v) =>
                  onPatch(m.month, {
                    chargesVar: { ...m.chargesVar, fb: v },
                  })
                }
              />
              <VarInput
                label="Frais Events"
                value={m.chargesVar.frais}
                onChange={(v) =>
                  onPatch(m.month, {
                    chargesVar: { ...m.chargesVar, frais: v },
                  })
                }
              />
              <VarInput
                label="Autres"
                value={m.chargesVar.autres}
                onChange={(v) =>
                  onPatch(m.month, {
                    chargesVar: { ...m.chargesVar, autres: v },
                  })
                }
              />
            </div>
          </td>
        </tr>
      )}
      {isInvExp && m.invoices.length > 0 && (
        <tr className="border-b border-border">
          <td colSpan={11} className="bg-[rgba(0,0,0,0.25)] px-4 py-3">
            <InvoiceDrawer
              invoices={m.invoices}
              currentMonth={m.month}
              onReattribute={onReattribute}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Footer Row ─────────────────────────────────────────────────────────────

function FooterRow({ data, year }: { data: FinanceMonthWithPennylane[]; year: number }) {
  const totChargesFixes = data.reduce((s, m) => s + m.chargesFixes, 0);
  const totVar = data.reduce((s, m) => s + totalChargesVar(m.chargesVar), 0);
  const totEncaisse = data.reduce((s, m) => s + m.pennylane.caEncaisse, 0);
  const totFacture = data.reduce((s, m) => s + m.pennylane.caFacture, 0);
  const totManuel = data.reduce((s, m) => s + (m.caManuel ?? 0), 0);
  const totPrev = data.reduce((s, m) => s + m.caPrevisionnel, 0);
  const totRes = data.reduce((s, m) => s + resultat(m), 0);

  const resColor =
    totRes > 0 ? "text-[#5cb87c]" : totRes < 0 ? "text-[#d95f5f]" : "text-muted";
  const ft = "border-t-2 border-[rgba(255,255,255,0.12)] px-3.5 py-3 font-mono text-[13px] font-bold";

  return (
    <tr>
      <td colSpan={2} className={ft}>
        TOTAL {year}
      </td>
      <td className={`${ft} text-right text-muted`}>{formatEur(totChargesFixes)}</td>
      <td className={`${ft} text-right text-muted`}>{totVar > 0 ? formatEur(totVar) : "—"}</td>
      <td className={`${ft} text-right text-[#5cb87c]`}>{formatEur(totEncaisse)}</td>
      <td className={`${ft} text-right text-[#c9a84c]`}>{formatEur(totFacture)}</td>
      <td className={`${ft} text-right`}>{formatEur(totManuel)}</td>
      <td className={`${ft} text-right`}>{formatEur(totPrev)}</td>
      <td className={`${ft} text-right ${resColor}`}>{formatSigned(totRes)}</td>
      <td className={`${ft} text-right ${resColor}`}>{formatSigned(totRes)}</td>
      <td className="border-t-2 border-[rgba(255,255,255,0.12)]" />
    </tr>
  );
}

// ─── Invoice Drawer ─────────────────────────────────────────────────────────

function InvoiceDrawer({
  invoices,
  currentMonth,
  onReattribute,
}: {
  invoices: InvoiceItem[];
  currentMonth: number;
  onReattribute: (invoiceId: number, newMonth: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        Factures Pennylane — {MONTH_NAMES[currentMonth - 1]}
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left">
            <th className="pb-1.5 pr-4 font-mono text-[9px] uppercase tracking-wider text-muted">
              Client
            </th>
            <th className="pb-1.5 pr-4 font-mono text-[9px] uppercase tracking-wider text-muted">
              Objet
            </th>
            <th className="pb-1.5 pr-4 text-right font-mono text-[9px] uppercase tracking-wider text-muted">
              Montant HT
            </th>
            <th className="pb-1.5 pr-4 font-mono text-[9px] uppercase tracking-wider text-muted">
              Date facture
            </th>
            <th className="pb-1.5 pr-4 font-mono text-[9px] uppercase tracking-wider text-muted">
              Statut
            </th>
            <th className="pb-1.5 font-mono text-[9px] uppercase tracking-wider text-muted">
              Attribué à
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="border-t border-[rgba(255,255,255,0.05)]"
            >
              <td className="py-1.5 pr-4 font-mono text-[12px] font-bold text-foreground">
                {inv.clientName}
              </td>
              <td
                className="max-w-[250px] truncate py-1.5 pr-4 text-[11px] text-muted"
                title={inv.subject}
              >
                {inv.subject || "—"}
              </td>
              <td className="py-1.5 pr-4 text-right font-mono text-[12px] text-foreground">
                {formatEur(inv.amountHT)}
              </td>
              <td className="py-1.5 pr-4 font-mono text-[11px] text-muted">
                {inv.date}
              </td>
              <td className="py-1.5 pr-4">
                <span
                  className={`inline-block px-1.5 py-px font-mono text-[9px] uppercase ${
                    inv.paid
                      ? "bg-[rgba(92,184,124,0.12)] text-[#5cb87c]"
                      : inv.status === "late"
                        ? "bg-[rgba(217,95,95,0.12)] text-[#d95f5f]"
                        : "bg-[rgba(255,255,255,0.05)] text-muted"
                  }`}
                >
                  {inv.paid ? "Payée" : inv.status === "late" ? "En retard" : "À venir"}
                </span>
              </td>
              <td className="py-1.5">
                <select
                  value={inv.attributedMonth}
                  onChange={(e) =>
                    onReattribute(inv.id, parseInt(e.target.value, 10))
                  }
                  className="bg-surface px-2 py-0.5 font-mono text-[11px] text-foreground outline-none focus:ring-1 focus:ring-[#c9a84c]"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Editable Number Input ──────────────────────────────────────────────────

function EditableNumber({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      className="w-[100px] bg-transparent px-2 py-1 text-right font-mono text-[13px] text-foreground outline-none transition-colors hover:bg-surface focus:bg-surface focus:ring-1 focus:ring-[#c9a84c] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
      value={value || ""}
      placeholder="—"
      onFocus={(e) => e.target.select()}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

// ─── Variable Charge Input ──────────────────────────────────────────────────

function VarInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </label>
      <input
        type="number"
        min={0}
        className="w-full bg-transparent px-2 py-1 font-mono text-[13px] text-foreground outline-none transition-colors hover:bg-surface focus:bg-surface focus:ring-1 focus:ring-[#c9a84c] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        value={value || ""}
        placeholder="—"
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
