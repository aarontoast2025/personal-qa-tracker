"use client";

import { useState } from "react";
import { saveGoogleSheetId } from "@/app/(dashboard)/settings/actions";
import { CheckCircle2, FileSpreadsheet, Save, ShieldAlert } from "lucide-react";

interface SettingsFormProps {
  initialSheetId: string;
}

export function SettingsForm({ initialSheetId }: SettingsFormProps) {
  const [sheetId, setSheetId] = useState(initialSheetId);
  const [isSaving, setIsSaving] = useState(false);
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

  return (
    <div className="space-y-6 max-w-3xl">
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

      {/* Google Sheet Configuration Card */}
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
    </div>
  );
}
