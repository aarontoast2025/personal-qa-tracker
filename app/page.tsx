export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Environment Ready
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          Personal QA Tracker
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
          Next.js, Supabase, and Google Sheets Productivity Tracker
        </p>
        <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 font-mono text-left">
          <div>Repository: aarontoast2025/personal-qa-tracker</div>
          <div>Database: Supabase (pxtjlqrbyqmswycfjmsd)</div>
          <div>Status: Connected &amp; Initialized</div>
        </div>
      </div>
    </main>
  );
}
