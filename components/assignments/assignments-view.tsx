"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Assignment } from "@/lib/types";
import { ViewMode, getDateRange } from "@/lib/date-utils";
import { format } from "date-fns";
import { DateNavigation } from "./date-navigation";
import { FetchButton } from "./fetch-button";
import {
  submitEvaluationBrowser,
  DEFAULT_WEB_APP_URL,
  DEFAULT_API_TOKEN,
} from "@/lib/google/browser-gas-client";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  UploadCloud,
} from "lucide-react";

interface AssignmentsViewProps {
  userEmail: string;
}

// Format date for table display: e.g. "Sep 29, 2026, Tue"
function formatTableDate(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return format(d, "MMM d, yyyy, EEE");
  }
  return dateStr;
}

export function AssignmentsView({ userEmail }: AssignmentsViewProps) {
  const supabase = createClient();

  // Requirement: Default tab should be "Day"
  const [mode, setMode] = useState<ViewMode>("day");
  // Requirement: Default to current date/week/month
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [totalUserAssignments, setTotalUserAssignments] = useState<number>(0);
  const [latestAssignmentDate, setLatestAssignmentDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [pushingId, setPushingId] = useState<string | null>(null);

  const { startStr, endStr } = getDateRange(currentDate, mode);

  async function loadAssignments() {
    setIsLoading(true);
    try {
      // 1. Fetch assignments in current date range for the logged-in user
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .ilike("qa_email", userEmail)
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error loading assignments:", error);
      } else {
        setAssignments((data as Assignment[]) || []);
      }

      // 2. Fetch total assignments count for this user across all dates
      const { count: totalCount } = await supabase
        .from("assignments")
        .select("*", { count: "exact", head: true })
        .ilike("qa_email", userEmail);

      setTotalUserAssignments(totalCount || 0);

      // 3. Find latest assignment date for quick jump
      const { data: latest } = await supabase
        .from("assignments")
        .select("date")
        .ilike("qa_email", userEmail)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest?.date) {
        setLatestAssignmentDate(latest.date);
      }
    } catch (err) {
      console.error("Query failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, [mode, currentDate, userEmail]);

  // Handle successful sync from the icon-only fetch button
  function handleSyncSuccess() {
    setSyncNotice("Google Sheet data successfully fetched and stored in Supabase!");
    setTimeout(() => setSyncNotice(null), 5000);
    loadAssignments();
  }

  // Handle pushing a Partial assignment to Google Sheet
  async function handlePush(asgId: string) {
    if (pushingId) return;
    setPushingId(asgId);

    try {
      // 1. Prepare evaluation data from Supabase
      const prepRes = await fetch("/api/assignments/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prepare", assignmentId: asgId }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok || !prepData.success) {
        throw new Error(prepData.error || "Failed to prepare evaluation for push.");
      }

      // 2. Submit to Google Apps Script directly from the browser using active Toast session
      const targetUrl = prepData.webAppUrl || DEFAULT_WEB_APP_URL;
      await submitEvaluationBrowser(
        targetUrl,
        DEFAULT_API_TOKEN,
        prepData.qaEmail || userEmail,
        prepData.evaluationData
      );

      // 3. Confirm update in Supabase
      const confirmRes = await fetch("/api/assignments/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          assignmentId: asgId,
          evaluationId: prepData.evaluationData?.id,
        }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok || !confirmData.success) {
        throw new Error(confirmData.error || "Submitted to sheet, but Supabase update failed.");
      }

      setAssignments((prev) =>
        prev.map((a) => (a.id === asgId ? { ...a, status: "Completed" } : a))
      );
      setSyncNotice(`Assignment ${asgId} successfully pushed to Google Sheet and marked Completed!`);
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      console.error("Push error:", err);
      alert(err.message || "Failed to push evaluation to Google Sheet.");
    } finally {
      setPushingId(null);
    }
  }

  // Filtered by status and search
  const filteredAssignments = assignments.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const agentName = (
        item.agent_snapshot?.fullName ||
        item.agent_snapshot?.displayName ||
        ""
      ).toLowerCase();
      const agentEmail = (item.agent_email || "").toLowerCase();
      const id = (item.id || "").toLowerCase();
      if (!agentName.includes(q) && !agentEmail.includes(q) && !id.includes(q)) {
        return false;
      }
    }
    return true;
  });

  const pendingCount = assignments.filter((a) => a.status === "Pending").length;
  const partialCount = assignments.filter((a) => a.status === "Partial").length;
  const completedCount = assignments.filter((a) => a.status === "Completed").length;

  return (
    <div className="space-y-5">
      {/* Sync Success Alert */}
      {syncNotice && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Header with Title, Status Pills, and Icon-Only Fetch Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Evaluation Queue
          </h1>
        </div>

        {/* Right side controls: Status counts and Icon-Only Fetch Button */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
              {pendingCount} Pending
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-medium">
              {completedCount} Completed
            </span>
          </div>

          {/* Icon-Only Fetch Button (Requirement: Icon only, no text) */}
          <FetchButton userEmail={userEmail} onSyncComplete={handleSyncSuccess} />
        </div>
      </div>

      {/* Date Navigation & Timeframe Selector (Default: Day) */}
      <DateNavigation
        mode={mode}
        onModeChange={setMode}
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onToday={() => setCurrentDate(new Date())}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by agent name or email..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `All (${assignments.length})` },
            { id: "Pending", label: `Pending (${pendingCount})` },
            { id: "Partial", label: `Partial (${partialCount})` },
            { id: "Completed", label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto px-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Filter className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
              No assignments found for this {mode}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {totalUserAssignments > 0 ? (
                <>
                  You have <span className="font-semibold text-slate-700 dark:text-slate-300">{totalUserAssignments}</span> total assignments in your queue.
                </>
              ) : (
                "Click the fetch icon above to pull your assignments from the Google Sheet."
              )}
            </p>

            {/* Quick helper jumpers if user has assignments on other dates */}
            {latestAssignmentDate && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m, d] = latestAssignmentDate.split("-").map(Number);
                    setCurrentDate(new Date(y, m - 1, d));
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-medium border border-amber-500/20 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Jump to {latestAssignmentDate}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("month")}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-medium transition-colors"
                >
                  Switch to Month View
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">EID</th>
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Channel / Skill</th>
                  <th className="py-3 px-4">Tier</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredAssignments.map((asg) => {
                  const agentName =
                    asg.agent_snapshot?.displayName ||
                    asg.agent_snapshot?.fullName ||
                    asg.agent_email;
                  const channel = asg.agent_snapshot?.channel || "Voice";
                  const skill = asg.agent_snapshot?.skill || "-";
                  const tier = asg.agent_snapshot?.tier || "Agent";
                  const location = asg.agent_snapshot?.location;
                  const eid = asg.agent_snapshot?.eid || "-";

                  return (
                    <tr
                      key={asg.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatTableDate(asg.date)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {eid}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {agentName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{asg.agent_email}</span>
                          {location && (
                            <>
                              <span>•</span>
                              <span>{location}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {channel}
                        </span>
                        <div className="text-[11px] text-slate-400">{skill}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {tier}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {asg.evaluation_type || "Manual Audit"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                            asg.status === "Completed"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : asg.status === "Partial"
                              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {asg.status === "Completed" ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {asg.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {asg.status === "Partial" ? (
                          <button
                            type="button"
                            onClick={() => handlePush(asg.id)}
                            disabled={pushingId === asg.id}
                            title="Push evaluated record to Google Sheet"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all disabled:opacity-50"
                          >
                            {pushingId === asg.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Pushing...</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Push</span>
                              </>
                            )}
                          </button>
                        ) : asg.status === "Completed" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Done
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
