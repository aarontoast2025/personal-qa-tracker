import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [
    { data: settings },
    { count: assignmentsCount },
    { count: evaluationsCount },
    { count: agentsCount },
    { count: rubricsCount },
    { data: lastLog },
  ] = await Promise.all([
    supabase.from("app_settings").select("*").limit(1).maybeSingle(),
    supabase.from("assignments").select("*", { count: "exact", head: true }),
    supabase.from("evaluations").select("*", { count: "exact", head: true }),
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase.from("rubrics").select("*", { count: "exact", head: true }),
    supabase
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Tracker Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your Google Sheet connection, sync settings, and local database cache.
        </p>
      </div>

      <SettingsForm
        initialSheetId={settings?.google_sheet_id || ""}
        initialCounts={{
          assignments: assignmentsCount || 0,
          evaluations: evaluationsCount || 0,
          agents: agentsCount || 0,
          rubrics: rubricsCount || 0,
        }}
        lastSyncedAt={
          lastLog?.completed_at
            ? new Date(lastLog.completed_at).toLocaleString()
            : null
        }
      />
    </div>
  );
}
