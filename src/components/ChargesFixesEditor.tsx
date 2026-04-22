"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Plus, Save } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChargePoste {
  id: string;
  label: string;
  tvaRate: number; // 0, 0.055, 0.10, 0.20
  inputMode: "ht" | "ttc";
  amounts: Record<number, number>; // month (1-12) → amount in HT
}

export interface ChargesFixesEditorProps {
  year: number;
  postes: ChargePoste[];
  onSave: (postes: ChargePoste[]) => void;
  onClose: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTH_SHORT = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];

const TVA_OPTIONS: { label: string; value: number }[] = [
  { label: "20%", value: 0.20 },
  { label: "10%", value: 0.10 },
  { label: "5,5%", value: 0.055 },
  { label: "0%", value: 0 },
];

const EDF_MONTHLY = [302, 235, 207, 191, 176, 286, 340, 187, 201, 223, 360, 389];

function makeAmounts(monthly: number): Record<number, number> {
  const out: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) out[m] = monthly;
  return out;
}

function makeEdfAmounts(): Record<number, number> {
  const out: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) out[m] = EDF_MONTHLY[m - 1];
  return out;
}

let _nextId = 1;
function uid(): string {
  return `poste-${Date.now()}-${_nextId++}`;
}

export const DEFAULT_CHARGES_POSTES: ChargePoste[] = [
  { id: "loyer",           label: "Loyer",             tvaRate: 0.20, inputMode: "ht", amounts: makeAmounts(5000) },
  { id: "credit-travaux",  label: "Crédit travaux",    tvaRate: 0,    inputMode: "ht", amounts: makeAmounts(5833) },
  { id: "edf",             label: "EDF",               tvaRate: 0.20, inputMode: "ht", amounts: makeEdfAmounts() },
  { id: "assurance",       label: "Assurance",         tvaRate: 0,    inputMode: "ht", amounts: makeAmounts(228) },
  { id: "copro-foncier",   label: "Copro/Foncier",     tvaRate: 0,    inputMode: "ht", amounts: makeAmounts(742) },
  { id: "expert-comptable",label: "Expert-comptable",  tvaRate: 0.20, inputMode: "ht", amounts: makeAmounts(2000) },
  { id: "fibre",           label: "Fibre",             tvaRate: 0.20, inputMode: "ht", amounts: makeAmounts(450) },
  { id: "logiciels",       label: "Logiciels",         tvaRate: 0.20, inputMode: "ht", amounts: makeAmounts(300) },
  { id: "frais-bancaires", label: "Frais bancaires",   tvaRate: 0,    inputMode: "ht", amounts: makeAmounts(132) },
  { id: "divers-cb",       label: "Divers (CB)",       tvaRate: 0.20, inputMode: "ht", amounts: makeAmounts(135) },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatEur(n: number): string {
  if (n === 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function htFromInput(value: number, mode: "ht" | "ttc", tvaRate: number): number {
  if (mode === "ht" || tvaRate === 0) return value;
  return Math.round(value / (1 + tvaRate));
}

function displayValue(htAmount: number, mode: "ht" | "ttc", tvaRate: number): number {
  if (mode === "ht" || tvaRate === 0) return htAmount;
  return Math.round(htAmount * (1 + tvaRate));
}

function posteTotal(poste: ChargePoste): number {
  let sum = 0;
  for (let m = 1; m <= 12; m++) sum += poste.amounts[m] ?? 0;
  return sum;
}

function deepClonePostes(postes: ChargePoste[]): ChargePoste[] {
  return postes.map((p) => ({
    ...p,
    amounts: { ...p.amounts },
  }));
}

// ── Cell Editor ────────────────────────────────────────────────────────────────

function CellEditor({
  value,
  onChange,
  onTab,
  onShiftTab,
}: {
  value: number;
  onChange: (v: number) => void;
  onTab: () => void;
  onShiftTab: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(value === 0 ? "" : String(value));
    setEditing(true);
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    const parsed = parseFloat(draft.replace(/\s/g, "").replace(",", "."));
    onChange(isNaN(parsed) ? 0 : Math.round(parsed));
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      if (e.key === "Enter") commit();
      else setEditing(false);
    }
    if (e.key === "Tab") {
      e.preventDefault();
      commit();
      if (e.shiftKey) onShiftTab();
      else onTab();
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        className="w-full bg-transparent text-right font-mono text-[13px] text-white outline-none border-b border-[#C8A96E] px-1 py-0.5"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <button
      type="button"
      className="w-full text-right font-mono text-[13px] text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.04)] px-1 py-0.5 transition-colors cursor-text"
      onClick={startEdit}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          startEdit();
        }
      }}
    >
      {value === 0 ? "—" : new Intl.NumberFormat("fr-FR").format(value)}
    </button>
  );
}

// ── Poste Row ──────────────────────────────────────────────────────────────────

function PosteRow({
  poste,
  rowIndex,
  onUpdate,
  onDelete,
  onCellTab,
}: {
  poste: ChargePoste;
  rowIndex: number;
  onUpdate: (updated: ChargePoste) => void;
  onDelete: () => void;
  onCellTab: (rowIndex: number, month: number, direction: 1 | -1) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(poste.label);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingLabel && labelRef.current) {
      labelRef.current.focus();
      labelRef.current.select();
    }
  }, [editingLabel]);

  function commitLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== poste.label) {
      onUpdate({ ...poste, amounts: { ...poste.amounts }, label: trimmed });
    }
    setEditingLabel(false);
  }

  function setTvaRate(rate: number) {
    onUpdate({ ...poste, amounts: { ...poste.amounts }, tvaRate: rate });
  }

  function setInputMode(mode: "ht" | "ttc") {
    onUpdate({ ...poste, amounts: { ...poste.amounts }, inputMode: mode });
  }

  function setCellValue(month: number, inputValue: number) {
    const ht = htFromInput(inputValue, poste.inputMode, poste.tvaRate);
    const newAmounts = { ...poste.amounts, [month]: ht };
    onUpdate({ ...poste, amounts: newAmounts });
  }

  const total = posteTotal(poste);

  return (
    <tr className="group border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
      {/* Poste name — sticky */}
      <td className="sticky left-0 z-10 bg-[#1A1A1A] group-hover:bg-[#1e1e1e] min-w-[160px] max-w-[200px] border-r border-[rgba(255,255,255,0.08)] px-2 py-1.5 transition-colors">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 text-[#d95f5f] hover:text-red-400 transition-opacity shrink-0"
            title="Supprimer"
          >
            <X size={12} />
          </button>
          {editingLabel ? (
            <input
              ref={labelRef}
              type="text"
              className="flex-1 bg-transparent font-mono text-[11px] text-white uppercase tracking-wider outline-none border-b border-[#C8A96E] px-0.5"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitLabel();
                if (e.key === "Escape") {
                  setLabelDraft(poste.label);
                  setEditingLabel(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="flex-1 text-left font-mono text-[11px] text-[rgba(255,255,255,0.6)] uppercase tracking-wider hover:text-white truncate cursor-text transition-colors"
              onClick={() => {
                setLabelDraft(poste.label);
                setEditingLabel(true);
              }}
              title={poste.label}
            >
              {poste.label}
            </button>
          )}
        </div>
      </td>

      {/* TVA rate dropdown */}
      <td className="sticky left-[160px] z-10 bg-[#1A1A1A] group-hover:bg-[#1e1e1e] min-w-[64px] border-r border-[rgba(255,255,255,0.08)] px-1 py-1.5 transition-colors">
        <select
          value={poste.tvaRate}
          onChange={(e) => setTvaRate(parseFloat(e.target.value))}
          className="w-full bg-transparent font-mono text-[10px] text-[rgba(255,255,255,0.5)] uppercase cursor-pointer outline-none appearance-none text-center hover:text-[#C8A96E] transition-colors"
        >
          {TVA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#1A1A1A] text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </td>

      {/* HT / TTC toggle */}
      <td className="sticky left-[224px] z-10 bg-[#1A1A1A] group-hover:bg-[#1e1e1e] min-w-[72px] border-r border-[rgba(255,255,255,0.08)] px-1 py-1.5 transition-colors">
        <div className="flex gap-0.5 justify-center">
          <button
            type="button"
            onClick={() => setInputMode("ht")}
            className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 transition-colors ${
              poste.inputMode === "ht"
                ? "bg-[#C8A96E] text-[#1A1A1A]"
                : "text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)]"
            }`}
          >
            HT
          </button>
          <button
            type="button"
            onClick={() => setInputMode("ttc")}
            className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 transition-colors ${
              poste.inputMode === "ttc"
                ? "bg-[#C8A96E] text-[#1A1A1A]"
                : "text-[rgba(255,255,255,0.3)] hover:text-[rgba(255,255,255,0.6)]"
            }`}
          >
            TTC
          </button>
        </div>
      </td>

      {/* 12 month cells */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
        const htAmount = poste.amounts[month] ?? 0;
        const shown = displayValue(htAmount, poste.inputMode, poste.tvaRate);
        return (
          <td key={month} className="min-w-[80px] px-1 py-1.5 border-r border-[rgba(255,255,255,0.04)]">
            <CellEditor
              value={shown}
              onChange={(v) => setCellValue(month, v)}
              onTab={() => onCellTab(rowIndex, month, 1)}
              onShiftTab={() => onCellTab(rowIndex, month, -1)}
            />
          </td>
        );
      })}

      {/* Total */}
      <td className="min-w-[96px] px-2 py-1.5 text-right font-mono text-[13px] text-white font-medium">
        {formatEur(total)}
      </td>
    </tr>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ChargesFixesEditor({
  year,
  postes: initialPostes,
  onSave,
  onClose,
}: ChargesFixesEditorProps) {
  const [postes, setPostes] = useState<ChargePoste[]>(() =>
    deepClonePostes(initialPostes)
  );
  const [dirty, setDirty] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);

  // Track changes
  function updatePostes(fn: (prev: ChargePoste[]) => ChargePoste[]) {
    setPostes((prev) => {
      const next = fn(prev);
      setDirty(true);
      return next;
    });
  }

  function handleUpdatePoste(index: number, updated: ChargePoste) {
    updatePostes((prev) => prev.map((p, i) => (i === index ? updated : p)));
  }

  function handleDeletePoste(index: number) {
    updatePostes((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddPoste() {
    updatePostes((prev) => [
      ...prev,
      {
        id: uid(),
        label: "Nouveau poste",
        tvaRate: 0.20,
        inputMode: "ht" as const,
        amounts: makeAmounts(0),
      },
    ]);
  }

  function handleSave() {
    onSave(deepClonePostes(postes));
    setDirty(false);
  }

  // Tab navigation across cells
  const handleCellTab = useCallback(
    (rowIndex: number, month: number, direction: 1 | -1) => {
      // Focus next/prev cell in the table
      if (!tableRef.current) return;
      let nextMonth = month + direction;
      let nextRow = rowIndex;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextRow = rowIndex + 1;
      } else if (nextMonth < 1) {
        nextMonth = 12;
        nextRow = rowIndex - 1;
      }
      if (nextRow < 0 || nextRow >= postes.length) return;
      // Find the button in the target cell and click it
      const rows = tableRef.current.querySelectorAll("tbody tr");
      const targetRow = rows[nextRow];
      if (!targetRow) return;
      // 3 sticky cols (name, tva, ht/ttc) + month cells
      const cells = targetRow.querySelectorAll("td");
      const cellIndex = 3 + (nextMonth - 1); // 0-indexed
      const targetCell = cells[cellIndex];
      if (!targetCell) return;
      const btn = targetCell.querySelector("button");
      if (btn) btn.click();
    },
    [postes.length]
  );

  // Monthly totals
  const monthlyTotals = useMemo(() => {
    const totals: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      totals[m] = postes.reduce((sum, p) => sum + (p.amounts[m] ?? 0), 0);
    }
    return totals;
  }, [postes]);

  const grandTotal = useMemo(
    () => postes.reduce((sum, p) => sum + posteTotal(p), 0),
    [postes]
  );

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(0,0,0,0.8)] backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-[1400px] my-6 mx-4 bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] shadow-2xl flex flex-col max-h-[calc(100vh-48px)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.08)] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-[14px] uppercase tracking-widest text-white">
              Charges fixes {year}
            </h2>
            {dirty && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#C8A96E] bg-[rgba(200,169,110,0.1)] px-2 py-0.5">
                Modifie
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[rgba(255,255,255,0.4)] hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* HT notice */}
        <div className="px-5 py-2 border-b border-[rgba(255,255,255,0.04)] shrink-0">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]">
            Tous les montants sont stockes en HT. Le mode TTC convertit automatiquement a la saisie.
          </p>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto min-h-0">
          <table ref={tableRef} className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.08)]">
                {/* Sticky header cells */}
                <th className="sticky left-0 top-0 z-30 bg-[#1A1A1A] min-w-[160px] max-w-[200px] border-r border-[rgba(255,255,255,0.08)] px-2 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                  Poste
                </th>
                <th className="sticky left-[160px] top-0 z-30 bg-[#1A1A1A] min-w-[64px] border-r border-[rgba(255,255,255,0.08)] px-1 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                  TVA
                </th>
                <th className="sticky left-[224px] top-0 z-30 bg-[#1A1A1A] min-w-[72px] border-r border-[rgba(255,255,255,0.08)] px-1 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)]">
                  Mode
                </th>
                {/* Month headers */}
                {MONTH_SHORT.map((m, i) => (
                  <th
                    key={i}
                    className="sticky top-0 z-20 bg-[#1A1A1A] min-w-[80px] px-1 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] border-r border-[rgba(255,255,255,0.04)]"
                  >
                    {m}
                  </th>
                ))}
                {/* Total header */}
                <th className="sticky top-0 z-20 bg-[#1A1A1A] min-w-[96px] px-2 py-2 text-right font-mono text-[10px] uppercase tracking-wider text-[#C8A96E]">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {postes.map((poste, index) => (
                <PosteRow
                  key={poste.id}
                  poste={poste}
                  rowIndex={index}
                  onUpdate={(updated) => handleUpdatePoste(index, updated)}
                  onDelete={() => handleDeletePoste(index)}
                  onCellTab={handleCellTab}
                />
              ))}
            </tbody>

            {/* Footer totals */}
            <tfoot>
              <tr className="border-t-2 border-[rgba(255,255,255,0.12)]">
                <td
                  className="sticky left-0 z-10 bg-[#1A1A1A] min-w-[160px] border-r border-[rgba(255,255,255,0.08)] px-2 py-2 font-mono text-[11px] uppercase tracking-wider text-[#C8A96E]"
                  colSpan={1}
                >
                  Total
                </td>
                <td className="sticky left-[160px] z-10 bg-[#1A1A1A] min-w-[64px] border-r border-[rgba(255,255,255,0.08)]" />
                <td className="sticky left-[224px] z-10 bg-[#1A1A1A] min-w-[72px] border-r border-[rgba(255,255,255,0.08)]" />
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <td
                    key={month}
                    className="min-w-[80px] px-1 py-2 text-right font-mono text-[13px] text-[#C8A96E] font-medium border-r border-[rgba(255,255,255,0.04)]"
                  >
                    {formatEur(monthlyTotals[month])}
                  </td>
                ))}
                <td className="min-w-[96px] px-2 py-2 text-right font-mono text-[14px] text-[#C8A96E] font-bold">
                  {formatEur(grandTotal)}
                </td>
              </tr>

              {/* Average per month */}
              <tr className="border-t border-[rgba(255,255,255,0.04)]">
                <td
                  className="sticky left-0 z-10 bg-[#1A1A1A] min-w-[160px] border-r border-[rgba(255,255,255,0.08)] px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.3)]"
                  colSpan={1}
                >
                  Moy/mois
                </td>
                <td className="sticky left-[160px] z-10 bg-[#1A1A1A] min-w-[64px] border-r border-[rgba(255,255,255,0.08)]" />
                <td className="sticky left-[224px] z-10 bg-[#1A1A1A] min-w-[72px] border-r border-[rgba(255,255,255,0.08)]" />
                <td colSpan={12} />
                <td className="min-w-[96px] px-2 py-1.5 text-right font-mono text-[12px] text-[rgba(255,255,255,0.4)]">
                  {formatEur(Math.round(grandTotal / 12))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(255,255,255,0.08)] shrink-0">
          <button
            type="button"
            onClick={handleAddPoste}
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-[#C8A96E] transition-colors px-3 py-1.5 border border-[rgba(255,255,255,0.08)] hover:border-[rgba(200,169,110,0.3)]"
          >
            <Plus size={13} />
            Ajouter un poste
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[11px] uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white transition-colors px-4 py-1.5 border border-[rgba(255,255,255,0.08)]"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty}
              className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-4 py-1.5 transition-colors ${
                dirty
                  ? "bg-[#C8A96E] text-[#1A1A1A] hover:bg-[#d4b87a]"
                  : "bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.2)] cursor-not-allowed"
              }`}
            >
              <Save size={13} />
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
