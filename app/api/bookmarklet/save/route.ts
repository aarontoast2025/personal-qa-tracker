import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bookmarklet-Token",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const evalData = body.evaluationData || body;

    const interactionId = (evalData.interactionId || evalData.interaction_id || "").trim();
    if (!interactionId) {
      return NextResponse.json(
        { success: false, error: "Missing required Interaction ID." },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();

    const evalId = evalData.id || `EVL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const assignmentId = evalData.assignmentId || evalData.assignment_id || null;

    let agentSnapshot = evalData.agentSnapshot || evalData.agent_snapshot || null;
    if (typeof agentSnapshot === "string") {
      try {
        agentSnapshot = JSON.parse(agentSnapshot);
      } catch {
        // preserve as string or null
      }
    }
    const aEmail = evalData.agentEmail || evalData.agent_email || (agentSnapshot && (agentSnapshot.email || agentSnapshot.toasttab_email)) || "";
    if (aEmail && typeof agentSnapshot === "object" && agentSnapshot !== null) {
      agentSnapshot.email = aEmail;
    } else if (!agentSnapshot && aEmail) {
      agentSnapshot = {
        name: evalData.agentName || evalData.agent_name || "Unknown",
        email: aEmail,
      };
    }

    const evaluationRecord = {
      id: evalId,
      submitted_at: nowIso,
      interaction_id: interactionId,
      assignment_id: assignmentId,
      agent_name: evalData.agentName || evalData.agent_name || "Unknown",
      agent_snapshot: agentSnapshot,
      qa_name: evalData.qaName || evalData.qa_name || "QA Evaluator",
      qa_email: evalData.qaEmail || evalData.qa_email || null,
      score: typeof evalData.score === "number" ? evalData.score : parseFloat(evalData.score) || 0,
      rubric_id: evalData.rubricId || evalData.rubric_id || null,
      evaluation_details: evalData.details || evalData.evaluation_details || {},
      call_duration: evalData.callDuration || evalData.call_duration || null,
      case_no: evalData.caseNo || evalData.case_no || null,
      call_ani_dnis: evalData.callAniDnis || evalData.call_ani_dnis || null,
      date_of_interaction: evalData.dateOfInteraction || evalData.date_of_interaction || null,
      case_category: evalData.caseCategory || evalData.case_category || null,
      case_sub_category: evalData.caseSubCategory || evalData.case_sub_category || null,
      issue_concern: evalData.issueConcern || evalData.issue_concern || null,
      comments: evalData.comments || null,
      evaluation_type: evalData.evaluationType || evalData.evaluation_type || "Manual Audit",
      sync_status: "pending_sheet_sync",
      synced_at: nowIso,
    };

    // 1. Upsert evaluation into Supabase (onConflict on interaction_id or id)
    const { error: evalError } = await supabase
      .from("evaluations")
      .upsert(evaluationRecord, { onConflict: "interaction_id" });

    if (evalError) {
      console.error("Error saving evaluation:", evalError);
      return NextResponse.json(
        { success: false, error: evalError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Mark the associated assignment as 'Partial' in Supabase
    if (assignmentId) {
      const { error: asgError } = await supabase
        .from("assignments")
        .update({
          status: "Partial",
          synced_at: nowIso,
        })
        .eq("id", assignmentId);

      if (asgError) {
        console.warn("Could not update assignment status to Partial:", asgError.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        evaluation_id: evalId,
        assignment_id: assignmentId,
        status: "Partial",
        sync_status: "pending_sheet_sync",
        message: "Evaluation saved in Supabase as Partial.",
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Save evaluation route error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save evaluation." },
      { status: 500, headers: corsHeaders }
    );
  }
}
