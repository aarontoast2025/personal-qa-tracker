import { createClient } from "@/lib/supabase/server";
import { AssignmentsView } from "@/components/assignments/assignments-view";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("google_web_app_url")
    .limit(1)
    .maybeSingle();

  return (
    <AssignmentsView
      userEmail={user?.email || ""}
      initialWebAppUrl={settings?.google_web_app_url || ""}
    />
  );
}
