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

    const assignmentId = evalData.assignmentId || evalData.assignment_id || null;
    let evalId = evalData.id || evalData.evalId;
    if (!evalId && assignmentId) {
      const { data: existingAsgEval } = await supabase
        .from("evaluations")
        .select("id")
        .eq("assignment_id", assignmentId)
        .maybeSingle();
      if (existingAsgEval?.id) {
        evalId = existingAsgEval.id;
      }
    }
    if (!evalId) {
      const { data: existingIntEval } = await supabase
        .from("evaluations")
        .select("id")
        .eq("interaction_id", interactionId)
        .maybeSingle();
      if (existingIntEval?.id) {
        evalId = existingIntEval.id;
      }
    }
    if (!evalId) {
      evalId = `EVL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const nowIso = new Date().toISOString();

    let agentSnapshot = evalData.agentSnapshot || evalData.agent_snapshot || null;
    if (typeof agentSnapshot === "string") {
      try {
        agentSnapshot = JSON.parse(agentSnapshot);
      } catch {
        // preserve as string or null
      }
    }
    const aEmail = (
      evalData.agentEmail ||
      evalData.agent_email ||
      (agentSnapshot && (agentSnapshot.toasttabEmail || agentSnapshot.email || agentSnapshot.toasttab_email)) ||
      ""
    ).trim().toLowerCase();

    let dbAgent: any = null;
    if (aEmail) {
      const { data: matchedAgent } = await supabase
        .from("agents")
        .select("eid, case_safe_id, toasttab_email, internal_ibex_email, full_name, display_name, location, skill, channel, tier, role, wave, production_date, supervisor, manager")
        .or(`toasttab_email.ilike.${aEmail},internal_ibex_email.ilike.${aEmail}`)
        .maybeSingle();
      dbAgent = matchedAgent;
    }

    const toasttabEmail =
      (agentSnapshot && agentSnapshot.toasttabEmail) ||
      dbAgent?.toasttab_email ||
      (agentSnapshot && agentSnapshot.email) ||
      aEmail;

    const fullName =
      (agentSnapshot && agentSnapshot.fullName) ||
      dbAgent?.full_name ||
      (agentSnapshot && agentSnapshot.displayName) ||
      dbAgent?.display_name ||
      evalData.agentName ||
      evalData.agent_name ||
      "";

    const displayName =
      (agentSnapshot && agentSnapshot.displayName) ||
      dbAgent?.display_name ||
      fullName;

    const canonicalSnapshot = {
      eid: String((agentSnapshot && agentSnapshot.eid) || dbAgent?.eid || "").trim(),
      role: (agentSnapshot && agentSnapshot.role) || dbAgent?.role || "Agent",
      tier: (agentSnapshot && agentSnapshot.tier) || dbAgent?.tier || "",
      wave: (agentSnapshot && agentSnapshot.wave) || dbAgent?.wave || "",
      skill: (agentSnapshot && agentSnapshot.skill) || dbAgent?.skill || "",
      channel: (agentSnapshot && agentSnapshot.channel) || dbAgent?.channel || "",
      manager: (agentSnapshot && agentSnapshot.manager) || dbAgent?.manager || "",
      fullName,
      location: (agentSnapshot && agentSnapshot.location) || dbAgent?.location || "",
      caseSafeId: (agentSnapshot && agentSnapshot.caseSafeId) || dbAgent?.case_safe_id || "",
      supervisor: (agentSnapshot && agentSnapshot.supervisor) || dbAgent?.supervisor || "",
      displayName,
      toasttabEmail,
      productionDate: (agentSnapshot && agentSnapshot.productionDate) || dbAgent?.production_date || "",
      internalIbexEmail: (agentSnapshot && agentSnapshot.internalIbexEmail) || dbAgent?.internal_ibex_email || "",
    };

    const evaluationRecord = {
      id: evalId,
      submitted_at: nowIso,
      interaction_id: interactionId,
      assignment_id: assignmentId,
      agent_name: displayName || fullName || evalData.agentName || evalData.agent_name || "Unknown",
      agent_snapshot: canonicalSnapshot,
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

    // 1. Upsert evaluation into Supabase by primary key 'id'
    const { error: evalError } = await supabase
      .from("evaluations")
      .upsert(evaluationRecord, { onConflict: "id" });

    if (evalError) {
      console.error("Error saving evaluation:", evalError);
      const isDuplicate =
        evalError.message.includes("evaluations_interaction_id_key") ||
        evalError.message.includes("duplicate key") ||
        evalError.code === "23505";
      const errorMsg = isDuplicate
        ? "Interaction ID already exists."
        : evalError.message;
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 500, headers: corsHeaders }
      );
    }

    // 2. Mark the associated assignment as 'Partial' in Supabase and update agent_snapshot
    if (assignmentId) {
      const { error: asgError } = await supabase
        .from("assignments")
        .update({
          status: "Partial",
          agent_snapshot: canonicalSnapshot,
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
