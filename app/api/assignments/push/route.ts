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
      const nowIso = new Date().toISOString();

      await supabase
        .from("assignments")
        .update({
          status: "Completed",
          synced_at: nowIso,
        })
        .eq("id", assignmentId);

      if (evaluationId) {
        await supabase
          .from("evaluations")
          .update({
            sync_status: "synced",
            synced_at: nowIso,
          })
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
    const agentSnapshot = evaluation.agent_snapshot || assignment.agent_snapshot || {};
    const agentName =
      evaluation.agent_name ||
      agentSnapshot.displayName ||
      agentSnapshot.fullName ||
      assignment.agent_email;

    const isActualPartial =
      assignment.status === "Partial" &&
      (!evaluation.evaluation_details ||
        Object.keys(evaluation.evaluation_details).length === 0) &&
      (!evaluation.score || evaluation.score === 0);

    const evaluationData = {
      id: evaluation.id,
      assignmentId: assignment.id,
      interactionId: evaluation.interaction_id || "",
      agentName,
      agentEmail: assignment.agent_email,
      agentSnapshot,
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
      status: isActualPartial ? "Partial" : "Completed",
      isPartial: isActualPartial,
    };

    const qaEmail = assignment.qa_email || user?.email || "";

    // If browser is requesting the prepared payload for browser-side submission:
    if (action === "prepare") {
      return NextResponse.json({
        success: true,
        evaluationData,
        qaEmail,
        webAppUrl: config.url,
      });
    }

    // 4. Push to Google Apps Script Web App
    const result = await submitEvaluationToWebApp(config, qaEmail, evaluationData);

    if (!result || result.success === false) {
      throw new Error(result?.error || result?.message || "Failed to push evaluation.");
    }

    const nowIso = new Date().toISOString();

    // 5. Update assignment status to 'Completed' in Supabase
    await supabase
      .from("assignments")
      .update({
        status: "Completed",
        synced_at: nowIso,
      })
      .eq("id", assignmentId);

    // 6. Update evaluation sync_status to 'synced' in Supabase
    await supabase
      .from("evaluations")
      .update({
        sync_status: "synced",
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
