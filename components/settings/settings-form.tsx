"use client";

import { useState } from "react";
import { saveGoogleSheetId } from "@/app/(dashboard)/settings/actions";
import {
  CheckCircle2,
  Database,
  FileSpreadsheet,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from "lucide-react";

interface SettingsFormProps {
  initialSheetId: string;
  initialCounts: {
    assignments: number;
    evaluations: number;
    agents: number;
    rubrics: number;
  };
  lastSyncedAt?: string | null;
}

export function SettingsForm({
  initialSheetId,
  initialCounts,
  lastSyncedAt,
}: SettingsFormProps) {
  const [sheetId, setSheetId] = useState(initialSheetId);
  const [counts, setCounts] = useState(initialCounts);
  const [lastSync, setLastSync] = useState(lastSyncedAt);

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await saveGoogleSheetId(formData);

    setIsSaving(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({
        type: "success",
        text: "Google Sheet ID saved successfully!",
      });
      if (res.sheetId) setSheetId(res.sheetId);
    }
  }

  async function handleSync(action: "sync-live" | "seed-csv") {
    if (action === "seed-csv") {
      setIsSeeding(true);
    } else {
      setIsSyncing(true);
    }
    setMessage(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, sheetId }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Sync failed");
      }

      setMessage({
        type: "success",
        text: data.message || "Data synchronization completed successfully!",
      });

      // Refresh stats
      const statsRes = await fetch("/api/sync");
      const statsData = await statsRes.json();
      if (statsData.counts) setCounts(statsData.counts);
      setLastSync(new Date().toLocaleString());
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Failed to sync data.",
      });
    } finally {
      setIsSyncing(false);
      setIsSeeding(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-xs font-medium border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Card 1: Google Sheet Configuration */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Google Sheet Integration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect your domain-shared Toast QA Tracker Google Spreadsheet.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="google_sheet_id"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Google Sheet ID or Spreadsheet URL
            </label>
            <div className="relative">
              <input
                id="google_sheet_id"
                name="google_sheet_id"
                type="text"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="Paste your Google Sheet ID or full spreadsheet URL..."
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              Supports raw 44-character IDs or full Google Sheets URLs (e.g., https://docs.google.com/spreadsheets/d/1abc.../edit).
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Status:{" "}
              {sheetId ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Configured
                </span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Not Configured
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Saving..." : "Save Sheet ID"}
            </button>
          </div>
        </form>
      </div>

      {/* Card 2: Synchronization & Cache Status */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Data Synchronization &amp; Cache
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supabase acts as a high-speed local cache to protect Google Sheets API quotas.
            </p>
          </div>
        </div>

        {/* Cache Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {counts.assignments}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Assignments
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {counts.evaluations}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Evaluations
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {counts.agents}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Agents
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
              {counts.rubrics}
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Rubrics
            </div>
          </div>
        </div>

        {lastSync && (
          <p className="text-[11px] text-slate-400 mb-4">
            Last Synced: <span className="font-mono text-slate-600 dark:text-slate-300">{lastSync}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Live Sync Button */}
          <button
            type="button"
            onClick={() => handleSync("sync-live")}
            disabled={isSyncing || isSeeding || !sheetId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-medium text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing Google Sheet..." : "Sync from Google Sheet"}
          </button>

          {/* Seed Initial Data Button (from CSV structure) */}
          <button
            type="button"
            onClick={() => handleSync("seed-csv")}
            disabled={isSyncing || isSeeding}
            title="Populates Supabase with the CSV dataset structure provided"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-xs transition-colors disabled:opacity-50 border border-slate-200 dark:border-slate-700"
          >
            <UploadCloud
              className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`}
            />
            {isSeeding ? "Seeding CSV Data..." : "Load Initial CSV Data into Supabase"}
          </button>
        </div>
      </div>
    </div>
  );
}
