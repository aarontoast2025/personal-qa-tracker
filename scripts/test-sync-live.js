const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      process.env[key.trim()] = vals.join("=").trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseCsv(text) {
  if (!text) return [];
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.some((f) => f.trim())) rows.push(currentRow);
        currentRow = [];
      } else if (char === "\n") {
        currentRow.push(currentField);
        currentField = "";
        if (currentRow.some((f) => f.trim())) rows.push(currentRow);
        currentRow = [];
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((f) => f.trim())) rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx] : "";
    });
    return obj;
  });
}

function normalizeDate(d) {
  if (!d) return null;
  const t = d.trim();
  if (!t || t.toLowerCase() === "n/a" || t.toLowerCase() === "none" || t === "-") return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.split("T")[0];
  const p = t.split("/");
  if (p.length === 3) {
    let y = p[2];
    if (y.length === 2) y = "20" + y;
    return y + "-" + p[0].padStart(2, "0") + "-" + p[1].padStart(2, "0");
  }
  return null;
}

function safeJson(v, fallback = {}) {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

async function run() {
  const sheetId = "15KNHO7P5aafxWbY-t1QZzjKEIPvLDQSEslu9npQbgP4";
  console.log("=== Syncing Live Data from Google Sheet:", sheetId, "===");

  // 1. Sync Rubrics first
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Rubrics`);
    const rows = parseCsv(await res.text());
    const rubrics = rows.filter(r => r.ID && r.Name).map(r => ({
      id: String(r.ID).trim(),
      name: r.Name.trim(),
      structure: safeJson(r.Structure, []),
      version: parseInt(r.Version) || 1,
      status: r.Status || "Active",
      is_default: String(r["Is Default"]).toLowerCase() === "true"
    }));
    const { error } = await supabase.from("rubrics").upsert(rubrics, { onConflict: "id" });
    console.log("Rubrics synced:", rubrics.length, "Error:", error?.message || "None");
  } catch (e) {
    console.error("Rubrics fetch failed:", e.message);
  }

  // 2. Sync Agents
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Agents`);
    const rows = parseCsv(await res.text());
    const agents = rows.filter(r => r.EID && r["Full Name"]).map(r => ({
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
      production_date: normalizeDate(r["Production Date"]),
      supervisor: r.Supervisor || null,
      manager: r.Manager || null
    }));
    for (let i = 0; i < agents.length; i += 100) {
      const { error } = await supabase.from("agents").upsert(agents.slice(i, i + 100), { onConflict: "eid" });
      if (error) console.error("Agents chunk error:", error.message);
    }
    console.log("Agents synced:", agents.length);
  } catch (e) {
    console.error("Agents fetch failed:", e.message);
  }

  // 3. Sync Assignments
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Assignments`);
    const rows = parseCsv(await res.text());
    const assignments = rows.filter(r => r.ID && r["QA Email"]).map(r => ({
      id: String(r.ID).trim(),
      date: normalizeDate(r.Date) || new Date().toISOString().split("T")[0],
      qa_email: String(r["QA Email"]).trim().toLowerCase(),
      agent_email: String(r["Agent Email"] || "").trim().toLowerCase(),
      agent_snapshot: safeJson(r["Agent Snapshot"]),
      rubric_id: r["Rubric ID"] || null,
      status: r.Status || "Pending",
      swap_data: r["Swap Data"] ? safeJson(r["Swap Data"]) : null,
      assigned_by: r["Assigned By"] || null,
      evaluation_type: r["Evaluation Type"] || "Manual Audit",
      timestamp: r.Timestamp || new Date().toISOString()
    }));
    for (let i = 0; i < assignments.length; i += 100) {
      const { error } = await supabase.from("assignments").upsert(assignments.slice(i, i + 100), { onConflict: "id" });
      if (error) console.error("Assignments chunk error:", error.message);
    }
    console.log("Assignments synced:", assignments.length);
  } catch (e) {
    console.error("Assignments fetch failed:", e.message);
  }

  // 4. Sync Evaluations
  try {
    const { data: knownAsgs } = await supabase.from("assignments").select("id");
    const knownAsgIds = new Set((knownAsgs || []).map((a) => a.id));

    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Evaluations`);
    const rows = parseCsv(await res.text());
    const evaluations = rows.filter(r => r.ID && r["Interaction ID"]).map(r => {
      const rawAsgId = r["Assignment ID"] ? String(r["Assignment ID"]).trim() : null;
      const validAsgId = rawAsgId && knownAsgIds.has(rawAsgId) ? rawAsgId : null;

      return {
        id: String(r.ID).trim(),
        submitted_at: r["Submitted At"] || new Date().toISOString(),
        agent_name: r["Agent Name"] || "Unknown",
        agent_snapshot: safeJson(r["Agent Snapshot"]),
        score: parseFloat(r.Score) || 0,
        shift_snapshot: r["Shift Snapshot"] || null,
        rubric_id: r["Rubric ID"] || null,
        evaluation_details: safeJson(r["Evaluation Details"]),
        assignment_id: validAsgId,
        interaction_id: String(r["Interaction ID"]).trim(),
        date_of_interaction: normalizeDate(r["Date of Interaction"]),
        call_ani_dnis: r["Call ANI/DNIS"] || null,
        case_no: r["Case No."] || null,
        call_duration: r["Call Duration"] || null,
        case_category: r["Case Category"] || null,
        case_sub_category: r["Case Sub-Category"] || null,
        issue_concern: r["Issue/Concern"] || null,
        qa_name: r["QA Name"] || "Unknown",
        qa_email: r["QA Email"] || null,
        dispute_status: r["Dispute Status"] || "None",
        dispute_data: r["Dispute Data"] ? safeJson(r["Dispute Data"]) : null,
        evaluation_type: r["Evaluation Type"] || "Manual Audit",
        consultation_status: r["Consultation Status"] || "None",
        consultation_data: r["Consultation Data"] ? safeJson(r["Consultation Data"]) : null,
        comments: r.Comments || null,
        ticket_link: r["Ticket Link"] || null,
        supervisor_ack_status: r["Supervisor Ack Status"] || "None",
        supervisor_ack_data: r["Supervisor Ack Data"] ? safeJson(r["Supervisor Ack Data"]) : null,
        sync_status: "synced"
      };
    });
    for (let i = 0; i < evaluations.length; i += 100) {
      const { error } = await supabase.from("evaluations").upsert(evaluations.slice(i, i + 100), { onConflict: "interaction_id" });
      if (error) console.error("Evaluations chunk error:", error.message);
    }
    console.log("Evaluations synced:", evaluations.length);
  } catch (e) {
    console.error("Evaluations fetch failed:", e.message);
  }

  // Check counts in Supabase
  const { count: asgCount } = await supabase.from("assignments").select("*", { count: "exact", head: true });
  const { count: evalCount } = await supabase.from("evaluations").select("*", { count: "exact", head: true });
  const { count: agentCount } = await supabase.from("agents").select("*", { count: "exact", head: true });
  console.log(`\n=== Verified Supabase Counts ===\nAssignments: ${asgCount}\nEvaluations: ${evalCount}\nAgents: ${agentCount}`);
}

run();
