"use client";

import { useState, useRef, useEffect } from "react";
import { saveGoogleSheetId, saveGeminiApiKey } from "@/app/(dashboard)/settings/actions";
import {
  CheckCircle2,
  FileSpreadsheet,
  Save,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
  Bookmark,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface SettingsFormProps {
  initialSheetId: string;
  initialGeminiKey?: string;
}

export function SettingsForm({
  initialSheetId,
  initialGeminiKey = "",
}: SettingsFormProps) {
  const [sheetId, setSheetId] = useState(initialSheetId);
  const [geminiKey, setGeminiKey] = useState(initialGeminiKey);
  const [showKey, setShowKey] = useState(false);
  const [isSavingSheet, setIsSavingSheet] = useState(false);
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const bookmarkletCode = `javascript:(function(){var s=document.createElement('script');s.src='https://personal-qa-tracker.vercel.app/bookmarklet.js?t='+Date.now();document.body.appendChild(s);})();`;
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (bookmarkletRef.current) {
      bookmarkletRef.current.setAttribute("href", bookmarkletCode);
    }
  }, [bookmarkletCode]);

  async function handleSaveSheet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSavingSheet(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await saveGoogleSheetId(formData);

    setIsSavingSheet(false);
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

  async function handleSaveGemini(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSavingGemini(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const res = await saveGeminiApiKey(formData);

    setIsSavingGemini(false);
    if (res.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({
        type: "success",
        text: "Gemini API Key saved successfully!",
      });
      if (res.geminiApiKey !== undefined) setGeminiKey(res.geminiApiKey);
    }
  }

  function copyBookmarkletCode() {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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

        <form onSubmit={handleSaveSheet} className="space-y-4">
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
              disabled={isSavingSheet}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingSheet ? "Saving..." : "Save Sheet ID"}
            </button>
          </div>
        </form>
      </div>

      {/* Gemini AI API Configuration Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Gemini AI Integration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure your Google Gemini API key for automated interaction summaries and rubric coaching.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGemini} className="space-y-4">
          <div>
            <label
              htmlFor="gemini_api_key"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Google Gemini API Key
            </label>
            <div className="relative">
              <input
                id="gemini_api_key"
                name="gemini_api_key"
                type={showKey ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-3.5 pr-10 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              The Bookmarklet will automatically use this key. You can choose the specific model (e.g. gemini-2.5-flash, gemini-2.5-pro, etc.) directly in the Bookmarklet.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Status:{" "}
              {geminiKey ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Configured
                </span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Key Not Set
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSavingGemini}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingGemini ? "Saving..." : "Save Gemini Key"}
            </button>
          </div>
        </form>
      </div>

      {/* Bookmarklet Installation Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Stella Connect Bookmarklet
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag or copy this bookmarklet into your browser bookmarks bar to grade interactions directly on Stella Connect.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Quick Installation:
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>Show your browser bookmarks bar (<kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">Ctrl + Shift + B</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">⌘ + Shift + B</kbd>).</li>
              <li>
                Drag this button to your bookmarks bar:
                <div className="my-2.5">
                  <a
                    ref={bookmarkletRef}
                    href="#"
                    onClick={(e) => {
                      // Prevent navigation if clicked directly
                      e.preventDefault();
                      alert("Drag this button to your bookmarks bar, or click 'Copy Code' below and paste it as the bookmark's URL.");
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm cursor-grab active:cursor-grabbing select-none"
                    title="Drag to bookmarks bar"
                  >
                    <span>⭐</span>
                    <span>Toast QA Tracker</span>
                  </a>
                </div>
              </li>
              <li>Or create a new bookmark manually and paste the code below into the URL/Location field:</li>
            </ol>

            <div className="mt-3 relative">
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all border border-slate-700">
                {bookmarkletCode}
              </pre>
              <button
                type="button"
                onClick={copyBookmarkletCode}
                className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors border border-slate-600"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Target Site: Stella Connect (*.stellaconnect.net)</span>
            <a
              href="/test-stella-page.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              <span>Open Local Test Page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
