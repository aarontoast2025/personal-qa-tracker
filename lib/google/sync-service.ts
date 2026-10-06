import { SupabaseClient } from "@supabase/supabase-js";
import { fetchSheetValues, rowsToObjects } from "./sheets";

// Helper to normalize Date string like "8/31/2026" or "2026-08-31" to "2026-08-31"
export function normalizeDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === "n/a" ||
    trimmed.toLowerCase() === "none" ||
    trimmed === "-"
  ) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.split("T")[0];
  }
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return null;
}

// Helper to safely parse JSON
export function safeJsonParse(val: any, fallback: any = {}) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export interface CanonicalAgentSnapshot {
  eid: string;
  role: string;
  tier: string;
  wave: string;
  skill: string;
  channel: string;
  manager: string;
  fullName: string;
  location: string;
  caseSafeId: string;
  supervisor: string;
  displayName: string;
  toasttabEmail: string;
  productionDate: string;
  internalIbexEmail: string;
}

/**
 * Normalizes agent snapshot to canonical 15 Google Sheet schema fields.
 * Explicitly maps to toasttabEmail and never creates an 'email' key.
 */
export function normalizeAgentSnapshot(
  rawSnap: any,
  fallbackEmail: string = "",
  fallbackName: string = "",
  agentLookupMap?: Record<string, any>
): CanonicalAgentSnapshot | null {
  let snap: any = safeJsonParse(rawSnap, null);
  const email = (fallbackEmail || "").trim().toLowerCase();
  const name = (fallbackName || "").trim().toLowerCase();

  let rosterAgent: any = null;
  if (agentLookupMap) {
    rosterAgent =
      (email && agentLookupMap[email]) ||
      (name && agentLookupMap[name]) ||
      (snap?.eid && agentLookupMap[String(snap.eid).toLowerCase().trim()]) ||
      (snap?.toasttabEmail && agentLookupMap[String(snap.toasttabEmail).toLowerCase().trim()]) ||
      (snap?.email && agentLookupMap[String(snap.email).toLowerCase().trim()]) ||
      null;
  }

  if (!snap && !rosterAgent && !fallbackEmail && !fallbackName) {
    return null;
  }

  const toasttabEmail =
    snap?.toasttabEmail ||
    rosterAgent?.toasttab_email ||
    rosterAgent?.toasttabEmail ||
    snap?.email ||
    snap?.toasttab_email ||
    fallbackEmail ||
    "";

  const fullName =
    snap?.fullName ||
    rosterAgent?.full_name ||
    rosterAgent?.fullName ||
    snap?.displayName ||
    rosterAgent?.display_name ||
    fallbackName ||
    "";

  const displayName =
    snap?.displayName ||
    rosterAgent?.display_name ||
    rosterAgent?.displayName ||
    fullName ||
    fallbackName ||
    "";

  return {
    eid: String(snap?.eid || rosterAgent?.eid || "").trim(),
    role: snap?.role || rosterAgent?.role || "Agent",
    tier: snap?.tier || rosterAgent?.tier || "",
    wave: snap?.wave || rosterAgent?.wave || "",
    skill: snap?.skill || rosterAgent?.skill || "",
    channel: snap?.channel || rosterAgent?.channel || "",
    manager: snap?.manager || rosterAgent?.manager || "",
    fullName,
    location: snap?.location || rosterAgent?.location || "",
    caseSafeId: snap?.caseSafeId || rosterAgent?.case_safe_id || rosterAgent?.caseSafeId || "",
    supervisor: snap?.supervisor || rosterAgent?.supervisor || "",
    displayName,
    toasttabEmail,
    productionDate: snap?.productionDate || rosterAgent?.production_date || rosterAgent?.productionDate || "",
    internalIbexEmail: snap?.internalIbexEmail || rosterAgent?.internal_ibex_email || rosterAgent?.internalIbexEmail || "",
  };
}

export async function syncAgents(
  supabase: SupabaseClient,
  rows: any[]
): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  const records = rows
    .filter((r) => (r.EID || r.eid) && (r["Full Name"] || r.fullName || r.full_name))
    .map((r) => ({
      eid: String(r.EID || r.eid).trim(),
      case_safe_id: r["Case Safe ID"] || r.caseSafeId || r.case_safe_id || null,
      toasttab_email: r["Toasttab Email"] || r.toasttabEmail || r.toastEmail || r.toasttab_email || r.email || null,
      internal_ibex_email: r["Internal IBEX Email"] || r.internalIbexEmail || r.internal_ibex_email || null,
      full_name: String(r["Full Name"] || r.fullName || r.full_name || "").trim(),
      display_name: r["Display Name"] || r.displayName || r.display_name || r["Full Name"] || r.fullName,
      location: r.Location || r.location || null,
      skill: r.Skill || r.skill || null,
      channel: r.Channel || r.channel || null,
      tier: r.Tier || r.tier || null,
      role: r.Role || r.role || "Agent",
      status: r.Status || r.status || "Active",
      wave: r.Wave || r.wave || null,
      production_date: normalizeDate(r["Production Date"] || r.productionDate || r.production_date),
      supervisor: r.Supervisor || r.supervisor || null,
      manager: r.Manager || r.manager || null,
      created_at: r["Created At"] || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("agents")
    .upsert(records, { onConflict: "eid", ignoreDuplicates: true });

  if (error) {
    console.error("Error syncing agents:", error);
    throw error;
  }

  return records.length;
}

export async function syncAssignments(
  supabase: SupabaseClient,
  rows: any[]
): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  // Load agent roster from Supabase to enrich assignments missing full snapshot details
  const { data: dbAgents } = await supabase
    .from("agents")
    .select("eid, case_safe_id, toasttab_email, internal_ibex_email, full_name, display_name, location, skill, channel, tier, role, wave, production_date, supervisor, manager");

  const agentLookupMap: Record<string, any> = {};
  if (dbAgents && Array.isArray(dbAgents)) {
    dbAgents.forEach((a) => {
      if (a.eid) agentLookupMap[String(a.eid).toLowerCase().trim()] = a;
      if (a.toasttab_email) agentLookupMap[String(a.toasttab_email).toLowerCase().trim()] = a;
      if (a.internal_ibex_email) agentLookupMap[String(a.internal_ibex_email).toLowerCase().trim()] = a;
      if (a.full_name) agentLookupMap[String(a.full_name).toLowerCase().trim()] = a;
      if (a.display_name) agentLookupMap[String(a.display_name).toLowerCase().trim()] = a;
    });
  }

  const records = rows
    .filter((r) => (r.ID || r.id) && (r["QA Email"] || r.qaEmail || r.qa_email))
    .map((r) => {
      const agentEmail = String(r["Agent Email"] || r.agentEmail || r.agent_email || "").trim().toLowerCase();
      const agentName = String(r["Agent Name"] || r.agentName || r.agent_name || "");
      const snap = normalizeAgentSnapshot(
        r["Agent Snapshot"] || r.agentSnapshot || r.agent_snapshot,
        agentEmail,
        agentName,
        agentLookupMap
      );
      return {
        id: String(r.ID || r.id).trim(),
        date: normalizeDate(r.Date || r.date),
        qa_email: String(r["QA Email"] || r.qaEmail || r.qa_email).trim().toLowerCase(),
        agent_email: agentEmail,
        agent_snapshot: snap,
        rubric_id: r["Rubric ID"] || r.rubricId || r.rubric_id || null,
        status: r.Status || r.status || "Pending",
        swap_data: r["Swap Data"]
          ? safeJsonParse(r["Swap Data"])
          : (r.swapData ? safeJsonParse(r.swapData) : null),
        assigned_by: r["Assigned By"] || r.assignedBy || r.assigned_by || null,
        evaluation_type: r["Evaluation Type"] || r.evaluationType || r.evaluation_type || "Manual Audit",
        timestamp: r.Timestamp || r.timestamp || new Date().toISOString(),
        synced_at: new Date().toISOString(),
      };
    });

  const { error } = await supabase
    .from("assignments")
    .upsert(records, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("Error syncing assignments:", error);
    throw error;
  }

  // Auto-persist evaluations for any assignment carrying an Interaction ID (from Google Sheet sync)
  const derivedEvals = rows
    .filter((r) => {
      const iId = String(r.interactionId || r.interaction_id || r["Interaction ID"] || "").trim();
      const asgId = String(r.ID || r.id || "").trim();
      return iId && asgId;
    })
    .map((r) => {
      const asgId = String(r.ID || r.id).trim();
      const iId = String(r.interactionId || r.interaction_id || r["Interaction ID"]).trim();
      const agentEmail = String(r["Agent Email"] || r.agentEmail || r.agent_email || "").trim().toLowerCase();
      const agentName = String(r["Agent Name"] || r.agentName || r.agent_name || "");
      const snap = normalizeAgentSnapshot(
        r["Agent Snapshot"] || r.agentSnapshot || r.agent_snapshot,
        agentEmail,
        agentName,
        agentLookupMap
      );
      const qaMail = String(r["QA Email"] || r.qaEmail || r.qa_email || "").trim().toLowerCase();
      const rawDetails = r["Evaluation Details"] || r.evaluationDetails || r.details;
      return {
        id: String(r.evalId || r.evaluationId || `EVL-${asgId}`).trim(),
        assignment_id: asgId,
        interaction_id: iId,
        score: parseFloat(r.Score ?? r.score) || 0,
        submitted_at: r["Submitted At"] || r.submittedAt || r.submitted_at || new Date().toISOString(),
        agent_name: snap?.displayName || snap?.fullName || agentName || agentEmail || "Unknown",
        agent_snapshot: snap,
        rubric_id: r["Rubric ID"] || r.rubricId || r.rubric_id || null,
        evaluation_type: r["Evaluation Type"] || r.evaluationType || r.evaluation_type || "Manual Audit",
        evaluation_details: safeJsonParse(rawDetails, typeof rawDetails === "object" && rawDetails !== null ? rawDetails : {}),
        qa_email: qaMail || null,
        qa_name: r["QA Name"] || r.qaName || r.qa_name || (qaMail ? qaMail.split("@")[0] : "QA Specialist"),
        sync_status: "synced",
        synced_at: new Date().toISOString(),
      };
    });

  if (derivedEvals.length > 0) {
    const { error: evalUpsertErr } = await supabase.from("evaluations").upsert(derivedEvals, {
      onConflict: "id",
      ignoreDuplicates: false,
    });
    if (evalUpsertErr) {
      console.warn("syncAssignments derived evaluations upsert warning:", evalUpsertErr.message);
    }
  }

  return records.length;
}

export async function syncEvaluations(
  supabase: SupabaseClient,
  rows: any[]
): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  // Fetch all known assignment IDs to prevent foreign key violations on historical evaluations
  const { data: knownAsgs } = await supabase.from("assignments").select("id");
  const knownAsgIds = new Set((knownAsgs || []).map((a) => a.id));

  // Load agent roster from Supabase to enrich evaluation snapshots missing details
  const { data: dbAgents } = await supabase
    .from("agents")
    .select("eid, case_safe_id, toasttab_email, internal_ibex_email, full_name, display_name, location, skill, channel, tier, role, wave, production_date, supervisor, manager");

  const agentLookupMap: Record<string, any> = {};
  if (dbAgents && Array.isArray(dbAgents)) {
    dbAgents.forEach((a) => {
      if (a.eid) agentLookupMap[String(a.eid).toLowerCase().trim()] = a;
      if (a.toasttab_email) agentLookupMap[String(a.toasttab_email).toLowerCase().trim()] = a;
      if (a.internal_ibex_email) agentLookupMap[String(a.internal_ibex_email).toLowerCase().trim()] = a;
      if (a.full_name) agentLookupMap[String(a.full_name).toLowerCase().trim()] = a;
      if (a.display_name) agentLookupMap[String(a.display_name).toLowerCase().trim()] = a;
    });
  }

  const records = rows
    .filter((r) => (r.ID || r.id) && (r["Interaction ID"] || r.interactionId || r.interaction_id))
    .map((r) => {
      const rawAsgId = r["Assignment ID"] || r.assignmentId || r.assignment_id
        ? String(r["Assignment ID"] || r.assignmentId || r.assignment_id).trim()
        : null;
      const validAsgId = rawAsgId && knownAsgIds.has(rawAsgId) ? rawAsgId : null;
      const agentEmail = String(r["Agent Email"] || r.agentEmail || r.agent_email || "").trim().toLowerCase();
      const agentName = String(r["Agent Name"] || r.agentName || r.agent_name || "");
      const agentSnap = normalizeAgentSnapshot(
        r["Agent Snapshot"] || r.agentSnapshot || r.agent_snapshot,
        agentEmail,
        agentName,
        agentLookupMap
      );
      const rawDetails = r["Evaluation Details"] || r.evaluationDetails || r.details;
      const evalDetails = safeJsonParse(rawDetails, typeof rawDetails === "object" && rawDetails !== null ? rawDetails : {});

      return {
        id: String(r.ID || r.id).trim(),
        submitted_at: r["Submitted At"] || r.submittedAt || r.submitted_at || new Date().toISOString(),
        agent_name: r["Agent Name"] || r.agentName || r.agent_name || agentSnap?.displayName || agentSnap?.fullName || "Unknown",
        agent_snapshot: agentSnap,
        score: parseFloat(r.Score ?? r.score) || 0,
        shift_snapshot: r["Shift Snapshot"] || r.shiftSnapshot || r.shift_snapshot || null,
        rubric_id: r["Rubric ID"] || r.rubricId || r.rubric_id || null,
        evaluation_details: evalDetails,
        assignment_id: validAsgId,
        interaction_id: String(r["Interaction ID"] || r.interactionId || r.interaction_id).trim(),
        date_of_interaction: (r["Date of Interaction"] || r.dateOfInteraction || r.date_of_interaction)
          ? normalizeDate(r["Date of Interaction"] || r.dateOfInteraction || r.date_of_interaction)
          : null,
        call_ani_dnis: r["Call ANI/DNIS"] || r.callAniDnis || r.call_ani_dnis || null,
        case_no: r["Case No."] || r.caseNo || r.case_no || null,
        call_duration: r["Call Duration"] || r.callDuration || r.call_duration || null,
        case_category: r["Case Category"] || r.caseCategory || r.case_category || null,
        case_sub_category: r["Case Sub-Category"] || r.caseSubCategory || r.case_sub_category || null,
        issue_concern: r["Issue/Concern"] || r.issueConcern || r.issue_concern || null,
        qa_name: r["QA Name"] || r.qaName || r.qa_name || "Unknown",
        qa_email: r["QA Email"] || r.qaEmail || r.qa_email || null,
        dispute_status: r["Dispute Status"] || r.disputeStatus || r.dispute_status || "None",
        dispute_data: (r["Dispute Data"] || r.disputeData) ? safeJsonParse(r["Dispute Data"] || r.disputeData) : null,
        evaluation_type: r["Evaluation Type"] || r.evaluationType || r.evaluation_type || "Manual Audit",
        consultation_status: r["Consultation Status"] || r.consultationStatus || r.consultation_status || "None",
        consultation_data: (r["Consultation Data"] || r.consultationData)
          ? safeJsonParse(r["Consultation Data"] || r.consultationData)
          : null,
        comments: r.Comments || r.comments || null,
        ticket_link: r["Ticket Link"] || r.ticketLink || r.ticket_link || null,
        supervisor_ack_status: r["Supervisor Ack Status"] || r.supervisorAckStatus || r.supervisor_ack_status || "None",
        supervisor_ack_data: (r["Supervisor Ack Data"] || r.supervisorAckData)
          ? safeJsonParse(r["Supervisor Ack Data"] || r.supervisorAckData)
          : null,
        sync_status: "synced",
        synced_at: new Date().toISOString(),
      };
    });

  if (records.length === 0) return 0;

  const { error } = await supabase
    .from("evaluations")
    .upsert(records, { onConflict: "interaction_id", ignoreDuplicates: false });

  if (error) {
    console.error("Error syncing evaluations:", error);
    throw error;
  }

  return records.length;
}

export async function syncRubrics(
  supabase: SupabaseClient,
  rows: any[]
): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  const records = rows
    .filter((r) => (r.ID || r.id) && (r.Name || r.name))
    .map((r) => ({
      id: String(r.ID || r.id).trim(),
      name: String(r.Name || r.name).trim(),
      structure: safeJsonParse(r.Structure || r.structure, []),
      version: parseInt(r.Version || r.version) || 1,
      status: r.Status || r.status || "Active",
      is_default:
        String(r["Is Default"] || r.is_default || r.isDefault).toLowerCase() === "true" ||
        String(r["Is Default"] || r.is_default || r.isDefault) === "1",
      created_at: r["Created At"] || r.created_at || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("rubrics")
    .upsert(records, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("Error syncing rubrics:", error);
    throw error;
  }

  return records.length;
}

export async function syncRubricDescriptions(
  supabase: SupabaseClient,
  rows: any[]
): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  const records = rows
    .filter((r) => (r.ID || r.id) && (r["Rubric ID"] || r.rubric_id))
    .map((r) => {
      const rawDesc = r.Description || r.description;
      let parsedDesc = safeJsonParse(rawDesc, null);
      if (!parsedDesc && typeof rawDesc === "string" && rawDesc.trim()) {
        parsedDesc = [{ sections: [{ name: "Guidelines", content: [{ type: "text", value: rawDesc.trim() }] }] }];
      }
      return {
        id: String(r.ID || r.id).trim(),
        rubric_id: String(r["Rubric ID"] || r.rubric_id).trim(),
        section_index: parseInt(String(r["Section Index"] ?? r.section_index ?? 0), 10) || 0,
        item_index: parseInt(String(r["Item Index"] ?? r.item_index ?? 0), 10) || 0,
        option_index: parseInt(String(r["Option Index"] ?? r.option_index ?? 0), 10) || 0,
        description: parsedDesc || [],
        synced_at: new Date().toISOString(),
      };
    });

  const { error } = await supabase
    .from("rubric_descriptions")
    .upsert(records, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("Error syncing rubric descriptions:", error);
    throw error;
  }

  return records.length;
}

export async function syncFeedbackTemplates(
  supabase: SupabaseClient,
  rows: any[]
): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  const records = rows
    .filter((r) => (r.ID || r.id) && (r["Feedback Text"] || r.feedback_text || r.feedbackText))
    .map((r) => ({
      id: String(r.ID || r.id).trim(),
      created_by: r["Created By"] || r.created_by || r.createdBy || null,
      rubric_id: r["Rubric ID"] || r.rubric_id || r.rubricId || null,
      section_index: parseInt(String(r["Section Index"] ?? r.section_index ?? r.sectionIndex ?? 0), 10) || 0,
      item_index: parseInt(String(r["Item Index"] ?? r.item_index ?? r.itemIndex ?? 0), 10) || 0,
      option_index: parseInt(String(r["Option Index"] ?? r.option_index ?? r.optionIndex ?? 0), 10) || 0,
      button_label: (r["Button Label"] || r.button_label || r.buttonLabel || "").trim() || null,
      feedback_text: String(r["Feedback Text"] || r.feedback_text || r.feedbackText).trim(),
      created_at: r["Created At"] || r.created_at || new Date().toISOString(),
      updated_at: r["Last Updated"] || r.updated_at || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("feedback_templates")
    .upsert(records, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("Error syncing feedback templates:", error);
    throw error;
  }

  return records.length;
}
