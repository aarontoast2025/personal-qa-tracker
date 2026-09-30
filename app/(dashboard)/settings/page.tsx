import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";
import { DEFAULT_WEB_APP_URL } from "@/lib/google/web-app-client";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [
    { count: rubricsCount },
    { count: feedbackTemplatesCount },
    { count: rubricDescriptionsCount },
    { count: assignmentsCount },
    { count: evaluationsCount },
    { count: agentsCount },
    { data: settings },
    { data: userData },
  ] = await Promise.all([
    supabase.from("rubrics").select("*", { count: "exact", head: true }),
    supabase.from("feedback_templates").select("*", { count: "exact", head: true }),
    supabase.from("rubric_descriptions").select("*", { count: "exact", head: true }),
    supabase.from("assignments").select("*", { count: "exact", head: true }),
    supabase.from("evaluations").select("*", { count: "exact", head: true }),
    supabase.from("agents").select("*", { count: "exact", head: true }),
    supabase
      .from("app_settings")
      .select("*")
      .limit(1)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const user = userData?.user;
  const userEmail = user?.email || "";
  const userMeta = user?.user_metadata || {};
  const rawName = userMeta.full_name || userMeta.name || "";
  const userName =
    rawName ||
    (userEmail
      ? userEmail
          .split("@")[0]
          .split(".")
          .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ")
      : "");

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
        initialWebAppUrl={(settings as any)?.google_web_app_url || DEFAULT_WEB_APP_URL}
        initialGeminiKey={settings?.gemini_api_key || ""}
        userEmail={userEmail}
        userName={userName}
        initialCounts={{
          rubrics: rubricsCount || 0,
          feedbackTemplates: feedbackTemplatesCount || 0,
          rubricDescriptions: rubricDescriptionsCount || 0,
          assignments: assignmentsCount || 0,
          evaluations: evaluationsCount || 0,
          agents: agentsCount || 0,
        }}
      />
    </div>
  );
}
