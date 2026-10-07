import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getWebAppConfig,
  submitEvaluationToWebApp,
} from "@/lib/google/web-app-client";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const assignmentId = body.assignmentId?.trim();
    if (!assignmentId) {
      return NextResponse.json(
        { error: "Missing required assignmentId." },
        { status: 400 }
      );
    }

    const action = body.action || "full";

    // Handle confirm action: user's browser already submitted to Google Apps Script
    if (action === "confirm") {
      const evaluationId = body.evaluationId;
      const agentSnapshot = body.agentSnapshot;
      const nowIso = new Date().toISOString();

      const asgUpdate: Record<string, any> = {
        status: "Completed",
        synced_at: nowIso,
      };
      if (agentSnapshot && typeof agentSnapshot === "object") {
        asgUpdate.agent_snapshot = agentSnapshot;
      }

      await supabase
        .from("assignments")
        .update(asgUpdate)
        .eq("id", assignmentId);

      if (evaluationId) {
        const evalUpdate: Record<string, any> = {
          sync_status: "synced",
          synced_at: nowIso,
        };
        if (agentSnapshot && typeof agentSnapshot === "object") {
          evalUpdate.agent_snapshot = agentSnapshot;
        }
        await supabase
          .from("evaluations")
          .update(evalUpdate)
          .eq("id", evaluationId);
      }

      await supabase.from("sync_logs").insert({
        user_id: user?.id || null,
        target_table: "google_sheet_evaluations",
        rows_synced: 1,
        status: "success",
        completed_at: nowIso,
      });

      return NextResponse.json({
        success: true,
        message: `Assignment ${assignmentId} successfully marked Completed in Supabase.`,
      });
    }

    // 1. Fetch the assignment record
    const { data: assignment, error: asgErr } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();

    if (asgErr || !assignment) {
      return NextResponse.json(
        { error: `Assignment "${assignmentId}" not found in database.` },
        { status: 404 }
      );
    }

    // 2. Fetch the corresponding drafted evaluation from Supabase
    let { data: evaluation } = await supabase
      .from("evaluations")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!evaluation && assignment.agent_email) {
      // Fallback: check if an evaluation exists matching this QA and agent
      const { data: fallbackEval } = await supabase
        .from("evaluations")
        .select("*")
        .eq("qa_email", assignment.qa_email)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackEval) {
        evaluation = fallbackEval;
      }
    }

    if (!evaluation) {
      return NextResponse.json(
        {
          error:
            "No evaluation draft found for this assignment. Please complete and save the audit via the Bookmarklet before pushing to Google Sheet.",
        },
        { status: 400 }
      );
    }

    // 3. Format payload to match Google Sheet structure & Google Apps Script API
    const config = await getWebAppConfig(supabase);
    let rawSnap = evaluation.agent_snapshot || assignment.agent_snapshot || {};
    if (typeof rawSnap === "string") {
      try {
        rawSnap = JSON.parse(rawSnap);
      } catch {
        rawSnap = {};
      }
    }

    // Lookup agent from database to complete any missing snapshot details
    const lookupEmail = (
      assignment.agent_email ||
      rawSnap.toasttabEmail ||
      rawSnap.toasttab_email ||
      rawSnap.email ||
      ""
    ).trim().toLowerCase();

    const lookupEid = (
      rawSnap.eid ||
      assignment.agent_eid ||
      (/^\d+$/.test(lookupEmail) ? lookupEmail : "")
    ).trim();

    const lookupName = (
      rawSnap.fullName ||
      rawSnap.full_name ||
      rawSnap.displayName ||
      rawSnap.display_name ||
      evaluation.agent_name ||
      assignment.agent_name ||
      ""
    ).trim();

    let dbAgent: any = null;
    if (lookupEid) {
      const { data: matchedByEid } = await supabase
        .from("agents")
        .select("eid, case_safe_id, toasttab_email, internal_ibex_email, full_name, display_name, location, skill, channel, tier, role, wave, production_date, supervisor, manager")
        .eq("eid", lookupEid)
        .maybeSingle();
      if (matchedByEid) dbAgent = matchedByEid;
    }

    if (!dbAgent && lookupEmail && !/^\d+$/.test(lookupEmail)) {
      const { data: matchedAgent } = await supabase
        .from("agents")
        .select("eid, case_safe_id, toasttab_email, internal_ibex_email, full_name, display_name, location, skill, channel, tier, role, wave, production_date, supervisor, manager")
        .or(`toasttab_email.ilike.${lookupEmail},internal_ibex_email.ilike.${lookupEmail}`)
        .maybeSingle();
      if (matchedAgent) dbAgent = matchedAgent;
    }

    if (!dbAgent && lookupName) {
      const { data: matchedByName } = await supabase
        .from("agents")
        .select("eid, case_safe_id, toasttab_email, internal_ibex_email, full_name, display_name, location, skill, channel, tier, role, wave, production_date, supervisor, manager")
        .or(`full_name.ilike.${lookupName},display_name.ilike.${lookupName}`)
        .maybeSingle();
      if (matchedByName) dbAgent = matchedByName;
    }

    const toasttabEmail =
      rawSnap.toasttabEmail ||
      rawSnap.toasttab_email ||
      dbAgent?.toasttab_email ||
      rawSnap.email ||
      (!/^\d+$/.test(lookupEmail) ? lookupEmail : "");

    const fullName =
      rawSnap.fullName ||
      rawSnap.full_name ||
      dbAgent?.full_name ||
      rawSnap.displayName ||
      rawSnap.display_name ||
      dbAgent?.display_name ||
      evaluation.agent_name ||
      "";

    const displayName =
      rawSnap.displayName ||
      rawSnap.display_name ||
      dbAgent?.display_name ||
      rawSnap.fullName ||
      rawSnap.full_name ||
      dbAgent?.full_name ||
      evaluation.agent_name ||
      fullName;

    const canonicalSnapshot = {
      eid: String(rawSnap.eid || dbAgent?.eid || "").trim(),
      role: rawSnap.role || dbAgent?.role || "Agent",
      tier: rawSnap.tier || dbAgent?.tier || "",
      wave: rawSnap.wave || dbAgent?.wave || "",
      skill: rawSnap.skill || dbAgent?.skill || "",
      channel: rawSnap.channel || dbAgent?.channel || "",
      manager: rawSnap.manager || dbAgent?.manager || "",
      fullName,
      location: rawSnap.location || dbAgent?.location || "",
      caseSafeId: rawSnap.caseSafeId || rawSnap.case_safe_id || dbAgent?.case_safe_id || "",
      supervisor: rawSnap.supervisor || dbAgent?.supervisor || "",
      displayName,
      toasttabEmail,
      productionDate: rawSnap.productionDate || rawSnap.production_date || dbAgent?.production_date || "",
      internalIbexEmail: rawSnap.internalIbexEmail || rawSnap.internal_ibex_email || dbAgent?.internal_ibex_email || "",
    };

    const agentName = displayName || fullName || assignment.agent_email;

    const evaluationData = {
      id: evaluation.id,
      assignmentId: assignment.id,
      assignment_id: assignment.id,
      interactionId: evaluation.interaction_id || "",
      agentName,
      agentEmail: assignment.agent_email,
      agentSnapshot: canonicalSnapshot,
      qaName: evaluation.qa_name || "QA Evaluator",
      score:
        typeof evaluation.score === "number"
          ? evaluation.score
          : parseFloat(evaluation.score) || 0,
      rubricId: evaluation.rubric_id || assignment.rubric_id || "toast-standard-qa",
      rubric_id: evaluation.rubric_id || assignment.rubric_id || "toast-standard-qa",
      details: evaluation.evaluation_details || {},
      dateOfInteraction: evaluation.date_of_interaction || "",
      callDuration: evaluation.call_duration || "",
      caseNo: evaluation.case_no || "",
      callAniDnis: evaluation.call_ani_dnis || "",
      caseCategory: evaluation.case_category || "",
      caseSubCategory: evaluation.case_sub_category || "",
      issueConcern: evaluation.issue_concern || "",
      comments: evaluation.comments || "",
      evaluationType:
        evaluation.evaluation_type || assignment.evaluation_type || "Manual Audit",
      status: "Completed",
      assignmentStatus: "Completed",
      isPartial: false,
    };

    const partialEvaluationData = {
      ...evaluationData,
      status: "Partial",
      assignmentStatus: "Partial",
      isPartial: true,
      score: 0,
    };

    const qaEmail = assignment.qa_email || user?.email || "";

    // If browser is requesting the prepared payload for browser-side submission:
    if (action === "prepare") {
      return NextResponse.json({
        success: true,
        evaluationData,
        partialEvaluationData,
        qaEmail,
        webAppUrl: config.url,
      });
    }

    // 4. Push to Google Apps Script Web App
    // Ensure the Assignments sheet row receives the full agent snapshot via partial sync first
    try {
      await submitEvaluationToWebApp(config, qaEmail, partialEvaluationData);
    } catch (partErr: any) {
      console.warn("Server partial snapshot sync notice:", partErr.message);
    }

    const result = await submitEvaluationToWebApp(config, qaEmail, evaluationData);

    if (!result || result.success === false) {
      throw new Error(result?.error || result?.message || "Failed to push evaluation.");
    }

    const nowIso = new Date().toISOString();

    // 5. Update assignment status to 'Completed' in Supabase AND update agent_snapshot
    await supabase
      .from("assignments")
      .update({
        status: "Completed",
        agent_snapshot: canonicalSnapshot,
        synced_at: nowIso,
      })
      .eq("id", assignmentId);

    // 6. Update evaluation sync_status to 'synced' in Supabase AND update agent_snapshot
    await supabase
      .from("evaluations")
      .update({
        sync_status: "synced",
        agent_snapshot: canonicalSnapshot,
        synced_at: nowIso,
      })
      .eq("id", evaluation.id);

    // 7. Log sync action
    await supabase.from("sync_logs").insert({
      user_id: user?.id || null,
      target_table: "google_sheet_evaluations",
      rows_synced: 1,
      status: "success",
      completed_at: nowIso,
    });

    return NextResponse.json({
      success: true,
      message: `Assignment ${assignmentId} successfully pushed to Google Sheet and marked Completed.`,
      evaluationId: result.evaluationId || evaluation.id,
      timestamp: result.timestamp,
    });
  } catch (err: any) {
    console.error("Push evaluation error:", err);
    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to push evaluation to Google Sheet. Please check the Web App connection in Settings.",
      },
      { status: 500 }
    );
  }
}
