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

export async function syncAgents(
  supabase: SupabaseClient,
  rows: any[]
): Promise<number> {
  if (!rows || rows.length === 0) return 0;

  const records = rows
    .filter((r) => r.EID && r["Full Name"])
    .map((r) => ({
      eid: String(r.EID).trim(),
      case_safe_id: r["Case Safe ID"] || null,
      toasttab_email: r["Toasttab Email"] || null,
      internal_ibex_email: r["Internal IBEX Email"] || null,
      full_name: r["Full Name"].trim(),
      display_name: r["Display Name"] || r["Full Name"],
      location: r.Location || null,
      skill: r.Skill || null,
      channel: r.Channel || null,
      tier: r.Tier || null,
      role: r.Role || "Agent",
      status: r.Status || "Active",
      wave: r.Wave || null,
      production_date: r["Production Date"]
        ? normalizeDate(r["Production Date"])
        : null,
      supervisor: r.Supervisor || null,
      manager: r.Manager || null,
      created_at: r["Created At"] || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("agents")
    .upsert(records, { onConflict: "eid" });

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

  const records = rows
    .filter((r) => r.ID && r["QA Email"])
    .map((r) => ({
      id: String(r.ID).trim(),
      date: normalizeDate(r.Date),
      qa_email: String(r["QA Email"]).trim().toLowerCase(),
      agent_email: String(r["Agent Email"] || "").trim().toLowerCase(),
      agent_snapshot: safeJsonParse(r["Agent Snapshot"]),
      rubric_id: r["Rubric ID"] || null,
      status: r.Status || "Pending",
      swap_data: r["Swap Data"] ? safeJsonParse(r["Swap Data"]) : null,
      assigned_by: r["Assigned By"] || null,
      evaluation_type: r["Evaluation Type"] || "Manual Audit",
      timestamp: r.Timestamp || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("assignments")
    .upsert(records, { onConflict: "id" });

  if (error) {
    console.error("Error syncing assignments:", error);
    throw error;
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

  const records = rows
    .filter((r) => r.ID && r["Interaction ID"])
    .map((r) => {
      const rawAsgId = r["Assignment ID"] ? String(r["Assignment ID"]).trim() : null;
      const validAsgId = rawAsgId && knownAsgIds.has(rawAsgId) ? rawAsgId : null;

      return {
        id: String(r.ID).trim(),
        submitted_at: r["Submitted At"] || new Date().toISOString(),
        agent_name: r["Agent Name"] || "Unknown",
        agent_snapshot: safeJsonParse(r["Agent Snapshot"]),
        score: parseFloat(r.Score) || 0,
        shift_snapshot: r["Shift Snapshot"] || null,
        rubric_id: r["Rubric ID"] || null,
        evaluation_details: safeJsonParse(r["Evaluation Details"]),
        assignment_id: validAsgId,
        interaction_id: String(r["Interaction ID"]).trim(),
        date_of_interaction: r["Date of Interaction"]
          ? normalizeDate(r["Date of Interaction"])
          : null,
      call_ani_dnis: r["Call ANI/DNIS"] || null,
      case_no: r["Case No."] || null,
      call_duration: r["Call Duration"] || null,
      case_category: r["Case Category"] || null,
      case_sub_category: r["Case Sub-Category"] || null,
      issue_concern: r["Issue/Concern"] || null,
      qa_name: r["QA Name"] || "Unknown",
      qa_email: r["QA Email"] || null,
      dispute_status: r["Dispute Status"] || "None",
      dispute_data: r["Dispute Data"] ? safeJsonParse(r["Dispute Data"]) : null,
      evaluation_type: r["Evaluation Type"] || "Manual Audit",
      consultation_status: r["Consultation Status"] || "None",
      consultation_data: r["Consultation Data"]
        ? safeJsonParse(r["Consultation Data"])
        : null,
      comments: r.Comments || null,
      ticket_link: r["Ticket Link"] || null,
      supervisor_ack_status: r["Supervisor Ack Status"] || "None",
      supervisor_ack_data: r["Supervisor Ack Data"]
        ? safeJsonParse(r["Supervisor Ack Data"])
        : null,
      sync_status: "synced",
      synced_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from("evaluations")
    .upsert(records, { onConflict: "interaction_id" });

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
    .filter((r) => r.ID && r.Name)
    .map((r) => ({
      id: String(r.ID).trim(),
      name: r.Name.trim(),
      structure: safeJsonParse(r.Structure, []),
      version: parseInt(r.Version) || 1,
      status: r.Status || "Active",
      is_default:
        String(r["Is Default"]).toLowerCase() === "true" ||
        String(r["Is Default"]) === "1",
      created_at: r["Created At"] || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("rubrics")
    .upsert(records, { onConflict: "id" });

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
    .filter((r) => r.ID && r["Rubric ID"])
    .map((r) => ({
      id: String(r.ID).trim(),
      rubric_id: String(r["Rubric ID"]).trim(),
      section_index: parseInt(r["Section Index"]) || 0,
      item_index: parseInt(r["Item Index"]) || 0,
      option_index: parseInt(r["Option Index"]) || 0,
      description: safeJsonParse(r.Description, []),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("rubric_descriptions")
    .upsert(records, { onConflict: "id" });

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
    .filter((r) => r.ID && r["Feedback Text"])
    .map((r) => ({
      id: String(r.ID).trim(),
      created_by: r["Created By"] || null,
      rubric_id: r["Rubric ID"] || null,
      section_index: parseInt(r["Section Index"]) || 0,
      item_index: parseInt(r["Item Index"]) || 0,
      option_index: parseInt(r["Option Index"]) || 0,
      button_label: r["Button Label"] || null,
      feedback_text: r["Feedback Text"],
      created_at: r["Created At"] || new Date().toISOString(),
      updated_at: r["Last Updated"] || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    }));

  const { error } = await supabase
    .from("feedback_templates")
    .upsert(records, { onConflict: "id" });

  if (error) {
    console.error("Error syncing feedback templates:", error);
    throw error;
  }

  return records.length;
}
