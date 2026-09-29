import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { ClipboardList, LogOut, Settings, Sparkles, User } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/assignments"
              className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span>QA Tracker</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/assignments"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Assignments
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </Link>
            </nav>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-medium text-slate-700 dark:text-slate-300 max-w-[180px] truncate">
                {user.email}
              </span>
            </div>

            <form action={signOut}>
              <button
                type="submit"
                title="Sign Out"
                className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
