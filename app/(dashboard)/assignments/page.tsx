import { createClient } from "@/lib/supabase/server";

export default async function AssignmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Evaluation Queue
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <span className="font-medium text-slate-700 dark:text-slate-300">{user?.email}</span>
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center font-bold">
            QA
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Authentication Successful
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You are securely logged into your personal QA dashboard. Next up: connecting your assignments queue with Day, Week, and Month filters!
          </p>
        </div>
      </div>
    </div>
  );
}
