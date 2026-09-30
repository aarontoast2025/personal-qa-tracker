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
  browserJsonpRequest,
  DEFAULT_WEB_APP_URL,
  DEFAULT_API_TOKEN,
} from "@/lib/google/browser-gas-client";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

interface AssignmentsViewProps {
  userEmail: string;
  initialWebAppUrl?: string;
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

export function AssignmentsView({ userEmail, initialWebAppUrl }: AssignmentsViewProps) {
  const supabase = createClient();
  const [webAppUrl, setWebAppUrl] = useState(initialWebAppUrl || DEFAULT_WEB_APP_URL);

  useEffect(() => {
    if (!initialWebAppUrl) {
      supabase
        .from("app_settings")
        .select("google_web_app_url")
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.google_web_app_url) {
            setWebAppUrl(data.google_web_app_url);
          }
        });
    }
  }, [initialWebAppUrl]);

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const [evalMap, setEvalMap] = useState<Record<string, any>>({});
  const [interactionInputs, setInteractionInputs] = useState<Record<string, string>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});

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
        const asgList = (data as Assignment[]) || [];
        setAssignments(asgList);

        // Fetch corresponding evaluations to load Interaction IDs and drafted details
        if (asgList.length > 0) {
          const asgIds = asgList.map((a) => a.id);
          const { data: evals } = await supabase
            .from("evaluations")
            .select("id, assignment_id, interaction_id, score, evaluation_type, rubric_id, evaluation_details, sync_status")
            .in("assignment_id", asgIds);

          const map: Record<string, any> = {};
          const inputs: Record<string, string> = {};
          if (evals && evals.length > 0) {
            evals.forEach((ev) => {
              if (ev.assignment_id) {
                map[ev.assignment_id] = ev;
                if (ev.interaction_id) {
                  inputs[ev.assignment_id] = ev.interaction_id;
                }
              }
            });
          }
          setEvalMap(map);
          setInteractionInputs((prev) => ({ ...inputs, ...prev }));

          // Auto-resolve missing Interaction IDs for Completed or Partial assignments directly from Google Sheet
          const missingCompleted = asgList.filter(
            (a) => (a.status === "Completed" || a.status === "Partial") && !map[a.id]?.interaction_id
          );

          if (missingCompleted.length > 0) {
            const targetUrl = (webAppUrl || DEFAULT_WEB_APP_URL).trim();
            if (targetUrl) {
              missingCompleted.forEach(async (asg) => {
                try {
                  const res = await browserJsonpRequest<{ success: boolean; exists?: boolean; data?: any }>(
                    targetUrl,
                    {
                      action: "check_existing",
                      token: DEFAULT_API_TOKEN,
                      assignment_id: asg.id,
                    },
                    15000
                  );
                  if (res && res.exists && res.data?.interactionId) {
                    const ev = res.data;
                    const iId = String(ev.interactionId).trim();
                    setEvalMap((prev) => ({
                      ...prev,
                      [asg.id]: {
                        id: ev.id || `EVL-${asg.id}`,
                        assignment_id: asg.id,
                        interaction_id: iId,
                        score: parseFloat(ev.score) || 0,
                        evaluation_type: ev.evaluationType || asg.evaluation_type,
                        rubric_id: ev.rubricId || asg.rubric_id,
                        evaluation_details: ev.details || ev.evaluationDetails || {},
                        sync_status: "synced",
                      },
                    }));
                    setInteractionInputs((prev) => ({
                      ...prev,
                      [asg.id]: iId,
                    }));

                    // Persist to Supabase evaluations so future reloads are instant
                    const snap = ev.agentSnapshot || asg.agent_snapshot || {};
                    const agentName = snap?.displayName || snap?.fullName || asg.agent_email;
                    await supabase.from("evaluations").upsert(
                      {
                        id: ev.id || `EVL-${asg.id}`,
                        assignment_id: asg.id,
                        interaction_id: iId,
                        score: parseFloat(ev.score) || 0,
                        submitted_at: ev.submittedAt || new Date().toISOString(),
                        agent_name: agentName,
                        agent_snapshot: snap,
                        rubric_id: ev.rubricId || asg.rubric_id,
                        evaluation_type: ev.evaluationType || asg.evaluation_type,
                        evaluation_details: ev.details || ev.evaluationDetails || {},
                        qa_name: ev.qaName || userEmail.split("@")[0] || "QA Specialist",
                        qa_email: asg.qa_email,
                        sync_status: "synced",
                        synced_at: new Date().toISOString(),
                      },
                      { onConflict: "interaction_id" }
                    );
                  }
                } catch (gasErr) {
                  console.warn(`Could not resolve interaction ID for ${asg.id}:`, gasErr);
                }
              });
            }
          }
        }
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

  // Close delete modal on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && assignmentToDelete && !deletingId) {
        setAssignmentToDelete(null);
        setDeleteModalError(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [assignmentToDelete, deletingId]);

  // Handle successful sync from the icon-only fetch button
  function handleSyncSuccess() {
    setSyncNotice("Google Sheet data successfully fetched and stored in Supabase!");
    setTimeout(() => setSyncNotice(null), 5000);
    loadAssignments();
  }

  // Handle submitting/claiming an Interaction ID for an assignment
  async function handleInteractionSubmit(asg: Assignment, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;

    // If unchanged and already saved, ignore
    if (evalMap[asg.id]?.interaction_id === trimmed) return;

    setCheckingId(asg.id);
    setRowErrors((prev) => ({ ...prev, [asg.id]: null }));

    try {
      // 1. Dual-check: Check Supabase evaluations for uniqueness
      const { data: existingSupabase } = await supabase
        .from("evaluations")
        .select("id, interaction_id, assignment_id, qa_email")
        .eq("interaction_id", trimmed)
        .maybeSingle();

      if (existingSupabase && existingSupabase.assignment_id !== asg.id) {
        setRowErrors((prev) => ({
          ...prev,
          [asg.id]: `Interaction ID "${trimmed}" has already been evaluated or claimed!`,
        }));
        return;
      }

      // 2. Background check Google Apps Script Web App (action: 'check_existing')
      const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;
      if (targetUrl) {
        try {
          const liveCheck = await browserJsonpRequest<{ success: boolean; exists?: boolean; data?: any }>(
            targetUrl,
            {
              action: "check_existing",
              token: DEFAULT_API_TOKEN,
              interaction_id: trimmed,
            },
            15000
          );
          if (liveCheck && liveCheck.exists) {
            const existingAsg = liveCheck.data?.assignmentId || liveCheck.data?.["Assignment ID"];
            if (existingAsg && existingAsg !== asg.id) {
              setRowErrors((prev) => ({
                ...prev,
                [asg.id]: `Interaction ID "${trimmed}" already claimed in Google Sheet!`,
              }));
              return;
            }
          }
        } catch (gasErr) {
          console.warn("Live sheet duplicate check warning:", gasErr);
        }
      }

      // 3. Unique! Upsert Partial evaluation in Supabase
      const nowIso = new Date().toISOString();
      const evalId = evalMap[asg.id]?.id || `EVL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const agentName =
        asg.agent_snapshot?.displayName ||
        asg.agent_snapshot?.fullName ||
        asg.agent_email;

      const evalRecord = {
        id: evalId,
        submitted_at: nowIso,
        interaction_id: trimmed,
        assignment_id: asg.id,
        agent_name: agentName,
        agent_snapshot: asg.agent_snapshot || null,
        qa_email: userEmail,
        qa_name: userEmail,
        score: 0,
        evaluation_type: asg.evaluation_type || "Manual Audit",
        rubric_id: asg.rubric_id || null,
        evaluation_details: evalMap[asg.id]?.evaluation_details || {},
        sync_status: "pending_sheet_sync",
        synced_at: nowIso,
      };

      const { error: evalErr } = await supabase
        .from("evaluations")
        .upsert(evalRecord, { onConflict: "interaction_id" });

      if (evalErr) {
        throw new Error(`Failed to save evaluation: ${evalErr.message}`);
      }

      // 4. Update assignment status to Partial in Supabase
      const { error: asgErr } = await supabase
        .from("assignments")
        .update({ status: "Partial", synced_at: nowIso })
        .eq("id", asg.id);

      if (asgErr) {
        console.warn("Failed to update assignment status:", asgErr.message);
      }

      // 5. Push Partial claim immediately to Google Sheet (so teammates see it claimed with updated timestamp)
      let sheetPushed = false;
      if (targetUrl) {
        try {
          await submitEvaluationBrowser(
            targetUrl,
            DEFAULT_API_TOKEN,
            userEmail,
            {
              assignmentId: asg.id,
              interactionId: trimmed,
              agentName: agentName,
              agentEmail: asg.agent_email,
              agentSnapshot: asg.agent_snapshot,
              evaluationType: asg.evaluation_type || "Manual Audit",
              rubricId: asg.rubric_id,
              score: 0,
              status: "Partial",
              isPartial: true,
            }
          );
          sheetPushed = true;
        } catch (pushErr: any) {
          console.warn("Could not push partial claim to sheet:", pushErr.message);
        }
      }

      // 6. Update local state
      setEvalMap((prev) => ({ ...prev, [asg.id]: evalRecord }));
      setAssignments((prev) =>
        prev.map((a) => (a.id === asg.id ? { ...a, status: "Partial" } : a))
      );
      if (sheetPushed) {
        setSyncNotice(`Interaction ID "${trimmed}" claimed and synced to Google Sheet as Partial!`);
      } else {
        setSyncNotice(`Interaction ID "${trimmed}" saved in Supabase as Partial (Google Sheet sync pending).`);
      }
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (err: any) {
      console.error("Interaction submit error:", err);
      setRowErrors((prev) => ({
        ...prev,
        [asg.id]: err.message || "Failed to claim Interaction ID.",
      }));
    } finally {
      setCheckingId(null);
    }
  }

  // Handle pushing a Partial assignment to Google Sheet
  async function handlePush(asgId: string) {
    if (pushingId) return;
    setPushingId(asgId);
    setRowErrors((prev) => ({ ...prev, [asgId]: null }));

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
      const targetUrl = prepData.webAppUrl || webAppUrl || DEFAULT_WEB_APP_URL;
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

  // Trigger delete modal for an assignment
  function handleDeleteClick(asg: Assignment) {
    if (deletingId || pushingId) return;
    setDeleteModalError(null);
    setAssignmentToDelete(asg);
  }

  // Confirm and execute deleting an assignment and its evaluations from Supabase
  async function confirmDelete(asg: Assignment) {
    if (deletingId || pushingId) return;

    setDeletingId(asg.id);
    setDeleteModalError(null);
    setRowErrors((prev) => ({ ...prev, [asg.id]: null }));

    try {
      const evalRecord = evalMap[asg.id];
      const res = await fetch("/api/assignments/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: asg.id,
          evaluationId: evalRecord?.id,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        // Fallback: direct client deletion if API route encounters an error
        const { error: clientEvalErr } = await supabase
          .from("evaluations")
          .delete()
          .eq("assignment_id", asg.id);
        if (clientEvalErr) console.warn("Client fallback eval delete warning:", clientEvalErr.message);

        const { error: clientAsgErr } = await supabase
          .from("assignments")
          .delete()
          .eq("id", asg.id);

        if (clientAsgErr) {
          throw new Error(resData?.error || clientAsgErr.message || "Failed to delete assignment record.");
        }
      }

      // Update local state
      setAssignments((prev) => prev.filter((a) => a.id !== asg.id));
      setEvalMap((prev) => {
        const next = { ...prev };
        delete next[asg.id];
        return next;
      });
      setInteractionInputs((prev) => {
        const next = { ...prev };
        delete next[asg.id];
        return next;
      });
      setTotalUserAssignments((prev) => Math.max(0, prev - 1));
      setAssignmentToDelete(null);
      setSyncNotice(`Assignment ${asg.id} successfully deleted from Supabase.`);
      setTimeout(() => setSyncNotice(null), 4000);
    } catch (err: any) {
      console.error("Delete error:", err);
      const errMsg = err.message || "Failed to delete assignment.";
      setDeleteModalError(errMsg);
      setRowErrors((prev) => ({
        ...prev,
        [asg.id]: errMsg,
      }));
    } finally {
      setDeletingId(null);
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
          <FetchButton webAppUrl={webAppUrl} userEmail={userEmail} onSyncComplete={handleSyncSuccess} />
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
                  <th className="py-3 px-4">Interaction ID</th>
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
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 min-w-[150px]">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={interactionInputs[asg.id] !== undefined ? interactionInputs[asg.id] : (evalMap[asg.id]?.interaction_id ?? "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInteractionInputs((prev) => ({ ...prev, [asg.id]: val }));
                                if (rowErrors[asg.id]) {
                                  setRowErrors((prev) => ({ ...prev, [asg.id]: null }));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleInteractionSubmit(asg, e.currentTarget.value);
                                }
                              }}
                              disabled={checkingId === asg.id}
                              placeholder="Enter ID & Enter..."
                              className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-blue-500 disabled:opacity-50 transition-all"
                            />
                            {checkingId === asg.id && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 absolute right-2.5" />
                            )}
                          </div>
                          {rowErrors[asg.id] && (
                            <div className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 animate-fadeIn">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate" title={rowErrors[asg.id]!}>
                                {rowErrors[asg.id]}
                              </span>
                            </div>
                          )}
                        </div>
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
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {(asg.status === "Partial" || asg.status === "Completed") && (
                            <button
                              type="button"
                              onClick={() => handlePush(asg.id)}
                              disabled={pushingId === asg.id || deletingId === asg.id}
                              title={
                                asg.status === "Completed"
                                  ? "Push latest updates to Google Sheet"
                                  : "Push evaluated record to Google Sheet"
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-white shadow-sm transition-all disabled:opacity-50 ${
                                asg.status === "Completed"
                                  ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                                  : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                              }`}
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
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(asg)}
                            disabled={deletingId === asg.id || pushingId === asg.id}
                            title="Delete assignment and evaluation from Supabase"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                          >
                            {deletingId === asg.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {assignmentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            if (!deletingId) {
              setAssignmentToDelete(null);
              setDeleteModalError(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                if (!deletingId) {
                  setAssignmentToDelete(null);
                  setDeleteModalError(null);
                }
              }}
              disabled={!!deletingId}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with warning badge */}
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="pr-6">
                <h3
                  id="delete-modal-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  Delete Assignment?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This action permanently removes the assignment and any drafted evaluation records from Supabase.
                </p>
              </div>
            </div>

            {/* Target Assignment Details Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2 mb-5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Agent:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {assignmentToDelete.agent_snapshot?.displayName ||
                    assignmentToDelete.agent_snapshot?.fullName ||
                    assignmentToDelete.agent_email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Assignment ID:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {assignmentToDelete.id}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Date:</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {formatTableDate(assignmentToDelete.date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    assignmentToDelete.status === "Completed"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : assignmentToDelete.status === "Partial"
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {assignmentToDelete.status}
                </span>
              </div>
              {evalMap[assignmentToDelete.id]?.interaction_id && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400">Interaction ID:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                    {evalMap[assignmentToDelete.id].interaction_id}
                  </span>
                </div>
              )}
            </div>

            {/* Error Message inside modal if deletion fails */}
            {deleteModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteModalError}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAssignmentToDelete(null);
                  setDeleteModalError(null);
                }}
                disabled={!!deletingId}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(assignmentToDelete)}
                disabled={!!deletingId}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm transition-all disabled:opacity-50"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
