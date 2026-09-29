import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Tracker Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure Google Sheet ID, sync intervals, and API preferences.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
          Connected Account
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Current authenticated QA user: <span className="font-mono text-slate-700 dark:text-slate-300">{user?.email}</span>
        </p>
      </div>
    </div>
  );
}
