"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingDown,
  Settings2,
} from "lucide-react";
import { AdminLogin } from "./AdminLogin";
import { Navbar } from "./Navbar";
import { CumulativeChart, calculateBreakEvenMonth } from "./CumulativeChart";
import type { CumulativeMonthData } from "./CumulativeChart";
import type {
  FinanceMonthWithPennylane,
  FinanceStatus,
  InvoiceItem,
  ChargePoste,
} from "@/types";

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const MONTH_SHORT = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

const STATUS_LABELS: Record<FinanceStatus, string> = {
  realized: "✓ Réalisé",
  "in-progress": "● En cours",
  planned: "○ Prévi.",
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

// ── Helpers ──

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

/** Compute auto status based on current date */
function autoStatus(month: number, year: number): FinanceStatus {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  if (year < currentYear) return "realized";
  if (year > currentYear) return "planned";
  if (month < currentMonth) return "realized";
  if (month === currentMonth) return "in-progress";
  return "planned";
}

/** Effective CA for a month — single source: Pennylane (attributed) */
function effectiveCA(m: FinanceMonthWithPennylane): number {
  const status = autoStatus(m.month, m.year);
  if (status === "realized") return m.pennylane.caEncaisse;
  if (status === "in-progress") {
    return m.pennylane.caFacture > 0 ? m.pennylane.caFacture : m.caPrevisionnel;
  }
  return m.caPrevisionnel;
}

/** Should CA Prévisionnel be shown? Only if no real CA exists yet */
function showPrevisionnel(m: FinanceMonthWithPennylane): boolean {
  return m.pennylane.caFacture === 0 && m.pennylane.caEncaisse === 0;
}

/** Monthly result = CA - charges (always computed, even if CA=0) */
function resultat(m: FinanceMonthWithPennylane): number {
  return effectiveCA(m) - m.chargesFixes;
}

/** Convert dashboard data to CumulativeChart format */
function toCumulativeMonths(data: FinanceMonthWithPennylane[]): CumulativeMonthData[] {
  return data.map((m) => {
    const status = autoStatus(m.month, m.year);
    return {
      month: m.month,
      caRealise: status === "realized" ? m.pennylane.caEncaisse : m.pennylane.caFacture,
      caPrevisionnel: m.caPrevisionnel,
      charges: m.chargesFixes,
      status,
    };
  });
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
  const [expandedInvoices, setExpandedInvoices] = useState<Set<number>>(new Set());
  const [showChargesEditor, setShowChargesEditor] = useState(false);
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
      setData((prev) => {
        if (!prev) return prev;
        return prev.map((m) =>
          m.month === month ? { ...m, ...updates } : m
        );
      });

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
      (s, m) => s + m.pennylane.caEncaisse, 0
    );
    const cumulResult = filteredData.reduce((s, m) => s + resultat(m), 0);
    const totalPrevRestant = filteredData
      .filter((m) => autoStatus(m.month, m.year) === "planned")
      .reduce((s, m) => s + m.caPrevisionnel, 0);
    const breakEven = calculateBreakEvenMonth(toCumulativeMonths(data ?? []));

    return { totalEncaisse, cumulResult, totalPrevRestant, breakEven };
  }, [filteredData, data]);

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
            Suivi mensuel — CA Pennylane (attribué par date d&apos;événement) vs charges.
          </p>
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
              label="CA Réalisé YTD"
              value={formatEur(summaryCards.totalEncaisse)}
              sub="cumul CA encaissé depuis janvier"
              color="green"
            />
            <SummaryCard
              label="Résultat cumulé"
              value={formatSigned(summaryCards.cumulResult)}
              sub="CA − charges à ce jour"
              color={
                summaryCards.cumulResult > 0
                  ? "green"
                  : summaryCards.cumulResult < 0
                    ? "red"
                    : undefined
              }
            />
            <SummaryCard
              label="CA Prévi. restant"
              value={formatEur(summaryCards.totalPrevRestant)}
              sub="prévisionnel des mois futurs"
              color="gold"
            />
            <SummaryCard
              label="Break-even estimé"
              value={
                summaryCards.breakEven
                  ? summaryCards.breakEven.label + " " + year
                  : "Non atteint"
              }
              sub={
                summaryCards.breakEven
                  ? "date projetée de rentabilité"
                  : "CA insuffisant pour couvrir les charges"
              }
              color={summaryCards.breakEven ? "gold" : "red"}
            />
          </div>
        )}

        {/* Chart placeholder — will be replaced by CumulativeChart */}
        <div className="mb-6 border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Cumul CA vs Charges annuelles
            </span>
            <div className="flex items-center gap-4">
              <LegendDot color="#5cb87c" label="CA réalisé (cumul)" />
              <LegendDot color="#c9a84c" label="Projection prévi." />
              <LegendDot color="rgba(255,255,255,0.25)" label="Charges annuelles" />
            </div>
          </div>
          <div className="h-[200px]">
            <CumulativeChart
              months={toCumulativeMonths(data)}
              year={year}
            />
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
                onClick={() => setShowChargesEditor(true)}
                className="flex items-center gap-1.5 border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <Settings2 className="h-3 w-3" />
                Charges fixes
              </button>
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
                  <th className="w-[110px] border-b border-border px-3.5 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted">
                    Statut
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    Charges
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-[#5cb87c]">
                    CA
                  </th>
                  <th className="border-b border-border px-3.5 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-muted">
                    CA Prévi.
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
                  allData={data}
                  year={year}
                  expandedInvoices={expandedInvoices}
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

        {/* Charges Fixes Editor Modal */}
        {showChargesEditor && (
          <ChargesFixesModal
            year={year}
            token={token}
            onClose={() => setShowChargesEditor(false)}
            onSaved={fetchData}
          />
        )}
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

// ─── Month Rows ─────────────────────────────────────────────────────────────

function MonthRows({
  data,
  allData,
  year,
  expandedInvoices,
  onToggleInvoices,
  onReattribute,
  onPatch,
}: {
  data: FinanceMonthWithPennylane[];
  allData: FinanceMonthWithPennylane[];
  year: number;
  expandedInvoices: Set<number>;
  onToggleInvoices: (month: number) => void;
  onReattribute: (invoiceId: number, newMonth: number) => void;
  onPatch: (month: number, updates: Record<string, unknown>) => void;
}) {
  // BUG #1 fix: cumul includes ALL months, charges always deducted
  const cumulByMonth = useMemo(() => {
    const result: Record<number, number> = {};
    let cumul = 0;
    // Use allData (not filtered) for correct cumul calculation
    for (const m of allData) {
      cumul += resultat(m);
      result[m.month] = cumul;
    }
    return result;
  }, [allData]);

  return (
    <>
      {data.map((m) => {
        const status = autoStatus(m.month, year);
        const res = resultat(m);
        const ca = effectiveCA(m);
        const isInvExp = expandedInvoices.has(m.month);
        const underTarget = ca > 0 && ca < m.chargesFixes * 0.8;

        return (
          <MonthRow
            key={m.month}
            m={m}
            status={status}
            cumulRes={cumulByMonth[m.month]}
            res={res}
            isInvExp={isInvExp}
            underTarget={underTarget}
            year={year}
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
  status,
  cumulRes,
  res,
  isInvExp,
  underTarget,
  year,
  onToggleInvoices,
  onReattribute,
  onPatch,
}: {
  m: FinanceMonthWithPennylane;
  status: FinanceStatus;
  cumulRes: number;
  res: number;
  isInvExp: boolean;
  underTarget: boolean;
  year: number;
  onToggleInvoices: (month: number) => void;
  onReattribute: (invoiceId: number, newMonth: number) => void;
  onPatch: (month: number, updates: Record<string, unknown>) => void;
}) {
  const resColor = res > 0 ? "text-[#5cb87c]" : res < 0 ? "text-[#d95f5f]" : "text-muted";
  const cumulColor =
    cumulRes > 0 ? "text-[#5cb87c]" : cumulRes < 0 ? "text-[#d95f5f]" : "text-muted";

  // BUG #4: show prévisionnel only if no real CA exists yet
  const showPrev = showPrevisionnel(m);

  // Determine CA display value (Pennylane attributed)
  const caDisplay =
    status === "realized"
      ? m.pennylane.caEncaisse
      : m.pennylane.caFacture > 0
        ? m.pennylane.caFacture
        : 0;

  return (
    <>
      <tr className="border-b border-border transition-colors hover:bg-[rgba(255,255,255,0.02)]">
        <td className="px-3.5 py-2.5 font-mono text-[13px] font-bold tracking-wide">
          {MONTH_NAMES[m.month - 1]}
        </td>
        {/* BUG #2: Status is auto-calculated, not clickable */}
        <td className="px-3.5 py-2.5">
          <span
            className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 font-mono text-[10px] tracking-wide ${STATUS_CLASSES[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </td>
        <td className="px-3.5 py-2.5 text-right font-mono text-[13px] text-muted">
          {formatEur(m.chargesFixes)}
        </td>
        {/* Single CA column */}
        <td className="px-3.5 py-2.5 text-right">
          {caDisplay > 0 ? (
            <button
              onClick={() => onToggleInvoices(m.month)}
              className="inline-flex items-center gap-1 font-mono text-[13px] text-[#5cb87c] transition-opacity hover:opacity-70"
              title={`${m.invoices.length} facture${m.invoices.length > 1 ? "s" : ""} — cliquer pour détailler`}
            >
              {formatEur(caDisplay)}
              <span className="text-[9px] text-muted">({m.invoices.length})</span>
            </button>
          ) : (
            <span className="font-mono text-[13px] text-muted">—</span>
          )}
        </td>
        {/* CA Prévisionnel — BUG #4: hidden when real CA exists */}
        <td className="px-3.5 py-2.5 text-right">
          {showPrev ? (
            <EditableNumber
              value={m.caPrevisionnel}
              onChange={(v) => onPatch(m.month, { caPrevisionnel: v })}
            />
          ) : (
            <span className="font-mono text-[13px] text-muted">—</span>
          )}
        </td>
        <td className={`px-3.5 py-2.5 text-right font-mono text-[13px] ${resColor}`}>
          {formatSigned(res)}
        </td>
        <td className={`px-3.5 py-2.5 text-right font-mono text-[13px] ${cumulColor}`}>
          {formatSigned(cumulRes)}
        </td>
        <td className="px-3.5 py-2.5 text-center">
          {underTarget && (
            <span title="CA < 80% des charges">
              <TrendingDown className="inline h-3 w-3 text-[#d95f5f]" />
            </span>
          )}
          {caDisplay === 0 && status !== "planned" && (
            <span title="Aucun CA pour ce mois">
              <AlertTriangle className="inline h-3 w-3 text-muted" />
            </span>
          )}
        </td>
      </tr>
      {isInvExp && m.invoices.length > 0 && (
        <tr className="border-b border-border">
          <td colSpan={8} className="bg-[rgba(0,0,0,0.25)] px-4 py-3">
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
  const totCharges = data.reduce((s, m) => s + m.chargesFixes, 0);
  const totCA = data.reduce((s, m) => {
    const status = autoStatus(m.month, m.year);
    return s + (status === "realized" ? m.pennylane.caEncaisse : m.pennylane.caFacture);
  }, 0);
  const totPrev = data.reduce((s, m) => s + (showPrevisionnel(m) ? m.caPrevisionnel : 0), 0);
  const totRes = data.reduce((s, m) => s + resultat(m), 0);

  const resColor =
    totRes > 0 ? "text-[#5cb87c]" : totRes < 0 ? "text-[#d95f5f]" : "text-muted";
  const ft = "border-t-2 border-[rgba(255,255,255,0.12)] px-3.5 py-3 font-mono text-[13px] font-bold";

  return (
    <tr>
      <td colSpan={2} className={ft}>
        TOTAL {year}
      </td>
      <td className={`${ft} text-right text-muted`}>{formatEur(totCharges)}</td>
      <td className={`${ft} text-right text-[#5cb87c]`}>{formatEur(totCA)}</td>
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
              N° Facture
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
              <td className="py-1.5 pr-4 font-mono text-[11px] text-muted">
                {inv.invoiceNumber || "—"}
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

// ─── Charges Fixes Modal (placeholder, will use ChargesFixesEditor) ─────────

function ChargesFixesModal({
  year,
  token,
  onClose,
  onSaved,
}: {
  year: number;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [postes, setPostes] = useState<ChargePoste[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/finances/charges-postes?year=${year}`)
      .then((r) => r.json())
      .then(setPostes);
  }, [year]);

  const handleSave = async () => {
    if (!postes) return;
    setSaving(true);
    await fetch("/api/finances/charges-postes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({ year, postes }),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  if (!postes) return null;

  const addPoste = () => {
    if (!postes) return;
    const id = `poste-${Date.now()}`;
    setPostes([
      ...postes,
      { id, label: "Nouveau poste", tvaRate: 0.20, inputMode: "ht", amounts: {} },
    ]);
  };

  const removePoste = (idx: number) => {
    if (!postes) return;
    if (!confirm(`Supprimer "${postes[idx].label}" ?`)) return;
    setPostes(postes.filter((_, i) => i !== idx));
  };

  const renamePoste = (idx: number, label: string) => {
    if (!postes) return;
    const updated = [...postes];
    updated[idx] = { ...updated[idx], label };
    setPostes(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 pt-12">
      <div className="relative w-full max-w-[1200px] border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-foreground">
            Charges fixes {year}
          </h2>
          <button
            onClick={onClose}
            className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-foreground"
          >
            ✕ Fermer
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-left font-mono text-[9px] uppercase tracking-wider text-muted">
                  Poste
                </th>
                <th className="w-[30px] px-1 py-1.5" />
                <th className="px-2 py-1.5 text-center font-mono text-[9px] uppercase tracking-wider text-muted">
                  TVA
                </th>
                <th className="px-2 py-1.5 text-center font-mono text-[9px] uppercase tracking-wider text-muted">
                  Mode
                </th>
                {MONTH_SHORT.map((m, i) => (
                  <th key={i} className="px-1.5 py-1.5 text-right font-mono text-[9px] uppercase tracking-wider text-muted">
                    {m}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-right font-mono text-[9px] uppercase tracking-wider text-accent">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {postes.map((poste, pIdx) => {
                const total = Object.values(poste.amounts).reduce((s, v) => s + v, 0);
                return (
                  <tr key={poste.id} className="group border-t border-[rgba(255,255,255,0.05)]">
                    <td className="sticky left-0 z-10 bg-card px-2 py-1">
                      <input
                        type="text"
                        value={poste.label}
                        onChange={(e) => renamePoste(pIdx, e.target.value)}
                        className="w-[140px] bg-transparent font-mono text-[11px] font-bold text-foreground outline-none hover:bg-surface focus:bg-surface focus:ring-1 focus:ring-[#c9a84c]"
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button
                        onClick={() => removePoste(pIdx)}
                        className="hidden text-[#d95f5f] opacity-60 transition-opacity hover:opacity-100 group-hover:inline"
                        title="Supprimer ce poste"
                      >
                        ✕
                      </button>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <select
                        value={poste.tvaRate}
                        onChange={(e) => {
                          const updated = [...postes];
                          updated[pIdx] = { ...poste, tvaRate: parseFloat(e.target.value) };
                          setPostes(updated);
                        }}
                        className="bg-surface px-1 py-0.5 font-mono text-[10px] text-foreground outline-none"
                      >
                        <option value={0.20}>20%</option>
                        <option value={0.10}>10%</option>
                        <option value={0.055}>5,5%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => {
                          const updated = [...postes];
                          const newMode = poste.inputMode === "ht" ? "ttc" : "ht";
                          updated[pIdx] = { ...poste, inputMode: newMode };
                          setPostes(updated);
                        }}
                        className={`px-1.5 py-0.5 font-mono text-[9px] uppercase ${
                          poste.inputMode === "ht"
                            ? "bg-[rgba(92,184,124,0.12)] text-[#5cb87c]"
                            : "bg-[rgba(201,168,76,0.12)] text-[#c9a84c]"
                        }`}
                      >
                        {poste.inputMode.toUpperCase()}
                      </button>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <td key={month} className="px-1 py-1">
                        <input
                          type="number"
                          className="w-[65px] bg-transparent px-1 py-0.5 text-right font-mono text-[11px] text-foreground outline-none hover:bg-surface focus:bg-surface focus:ring-1 focus:ring-[#c9a84c] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                          value={
                            poste.inputMode === "ttc" && poste.tvaRate > 0
                              ? Math.round((poste.amounts[month] ?? 0) * (1 + poste.tvaRate))
                              : poste.amounts[month] ?? ""
                          }
                          placeholder="—"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const raw = parseFloat(e.target.value) || 0;
                            const ht =
                              poste.inputMode === "ttc"
                                ? Math.round(raw / (1 + poste.tvaRate))
                                : raw;
                            const updated = [...postes];
                            updated[pIdx] = {
                              ...poste,
                              amounts: { ...poste.amounts, [month]: ht },
                            };
                            setPostes(updated);
                          }}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right font-mono text-[11px] font-bold text-accent">
                      {formatEur(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[rgba(255,255,255,0.12)]">
                <td colSpan={4} className="px-2 py-2 font-mono text-[11px] font-bold text-foreground">
                  TOTAL
                </td>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const total = postes.reduce((s, p) => s + (p.amounts[month] ?? 0), 0);
                  return (
                    <td key={month} className="px-1 py-2 text-right font-mono text-[11px] font-bold text-foreground">
                      {formatEur(total)}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right font-mono text-[11px] font-bold text-accent">
                  {formatEur(postes.reduce((s, p) => s + Object.values(p.amounts).reduce((a, b) => a + b, 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={addPoste}
            className="flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
          >
            + Ajouter un poste
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="border border-border px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-foreground"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="border border-accent bg-accent/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-accent/20 disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
