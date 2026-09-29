"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface FetchButtonProps {
  onSyncComplete?: () => void;
  className?: string;
}

export function FetchButton({ onSyncComplete, className = "" }: FetchButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);

  async function handleFetch() {
    if (isSyncing) return;
    setIsSyncing(true);
    setLastSyncStatus(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-live" }),
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
