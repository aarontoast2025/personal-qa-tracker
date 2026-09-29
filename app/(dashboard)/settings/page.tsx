import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("google_sheet_id, gemini_api_key")
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Tracker Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your Google Sheet connection, Gemini AI API, and Bookmarklet setup.
        </p>
      </div>

      <SettingsForm
        initialSheetId={settings?.google_sheet_id || ""}
        initialGeminiKey={settings?.gemini_api_key || ""}
      />
    </div>
  );
}
