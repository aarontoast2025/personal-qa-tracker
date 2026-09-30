"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  fetchInitDataBrowser,
  DEFAULT_WEB_APP_URL,
  DEFAULT_API_TOKEN,
} from "@/lib/google/browser-gas-client";

interface FetchButtonProps {
  onSyncComplete?: () => void;
  className?: string;
  userEmail?: string;
  webAppUrl?: string;
}

export function FetchButton({
  onSyncComplete,
  className = "",
  userEmail = "",
  webAppUrl = DEFAULT_WEB_APP_URL,
}: FetchButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);

  async function handleFetch() {
    if (isSyncing) return;
    setIsSyncing(true);
    setLastSyncStatus(null);

    try {
      // 1. Fetch live data directly from Google Apps Script via browser session (attaches Toast Okta cookies)
      let initData: any = null;
      let browserError: string | null = null;
      try {
        initData = await fetchInitDataBrowser(webAppUrl, DEFAULT_API_TOKEN, userEmail);
      } catch (browserErr: any) {
        browserError = browserErr.message;
        console.warn("Browser JSONP fetch error:", browserErr);
      }

      if (!initData && browserError) {
        throw new Error(browserError);
      }

      // 2. Ingest and persist data in Supabase via API
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync-live",
          initData,
          qaEmail: userEmail,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to fetch from Google Sheet");
      }

      setLastSyncStatus("Synced successfully");
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      alert(err.message || "Failed to fetch latest data from Google Sheet.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleFetch}
      disabled={isSyncing}
      title={
        isSyncing
          ? "Fetching latest data from Google Sheet..."
          : lastSyncStatus
          ? `Last fetch: ${lastSyncStatus}`
          : "Fetch latest assignments from Google Sheet"
      }
      aria-label="Fetch latest assignments from Google Sheet"
      className={`relative inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <RefreshCw
        className={`w-4 h-4 text-slate-700 dark:text-slate-200 ${
          isSyncing ? "animate-spin text-amber-500" : ""
        }`}
      />
    </button>
  );
}
