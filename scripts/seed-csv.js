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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseCsv(text) {
  const lines = [];
  let row = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (c === '"' && inQ && n === '"') {
      row += '"';
      i++;
    } else if (c === '"') {
      inQ = !inQ;
      row += '"';
    } else if ((c === "\r" || c === "\n") && !inQ) {
      if (c === "\r" && n === "\n") i++;
      if (row.trim()) lines.push(row);
      row = "";
    } else {
      row += c;
    }
  }
  if (row.trim()) lines.push(row);
  if (lines.length < 2) return [];

  function parseLine(line) {
    const cols = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (c === "," && !q) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += c;
      }
    }
    cols.push(cur.trim());
    return cols;
  }

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cols = parseLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx] : "";
    });
    return obj;
  });
}

function normalizeDate(d) {
  if (!d) return null;
  const t = d.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.split("T")[0];
  const p = t.split("/");
  if (p.length === 3)
    return p[2] + "-" + p[0].padStart(2, "0") + "-" + p[1].padStart(2, "0");
  return t;
}

function safeJson(v, fallback = {}) {
  if (!v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

async function run() {
  console.log("=== Seeding CSV Data into Supabase ===");

  // 1. Agents
  const agentsPath = path.join(__dirname, "..", "CSV", "Dev QA Tracker - Agents.csv");
  if (fs.existsSync(agentsPath)) {
    const raw = parseCsv(fs.readFileSync(agentsPath, "utf-8"));
    const agents = raw
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
        production_date: normalizeDate(r["Production Date"]),
        supervisor: r.Supervisor || null,
        manager: r.Manager || null,
      }));

    for (let i = 0; i < agents.length; i += 100) {
      const chunk = agents.slice(i, i + 100);
      const { error } = await supabase.from("agents").upsert(chunk, { onConflict: "eid" });
      if (error) console.error("Agents error:", error.message);
    }
    console.log(`✓ Seeded ${agents.length} agents`);
  }

  // 2. Rubrics
  const rubricsPath = path.join(__dirname, "..", "CSV", "Dev QA Tracker - Rubrics.csv");
  if (fs.existsSync(rubricsPath)) {
    const raw = parseCsv(fs.readFileSync(rubricsPath, "utf-8"));
    const rubrics = raw
      .filter((r) => r.ID && r.Name)
      .map((r) => ({
        id: String(r.ID).trim(),
        name: r.Name.trim(),
        structure: safeJson(r.Structure, []),
        version: parseInt(r.Version) || 1,
        status: r.Status || "Active",
        is_default: String(r["Is Default"]).toLowerCase() === "true",
      }));
    const { error } = await supabase.from("rubrics").upsert(rubrics, { onConflict: "id" });
    if (error) console.error("Rubrics error:", error.message);
    console.log(`✓ Seeded ${rubrics.length} rubrics`);
  }

  // 3. Rubric Descriptions
  const rdPath = path.join(__dirname, "..", "CSV", "Dev QA Tracker - RubricDescriptions.csv");
  if (fs.existsSync(rdPath)) {
    const raw = parseCsv(fs.readFileSync(rdPath, "utf-8"));
    const rds = raw
      .filter((r) => r.ID && r["Rubric ID"])
      .map((r) => ({
        id: String(r.ID).trim(),
        rubric_id: String(r["Rubric ID"]).trim(),
        section_index: parseInt(r["Section Index"]) || 0,
        item_index: parseInt(r["Item Index"]) || 0,
        option_index: parseInt(r["Option Index"]) || 0,
        description: safeJson(r.Description, []),
      }));
    const { error } = await supabase.from("rubric_descriptions").upsert(rds, { onConflict: "id" });
    if (error) console.error("Rubric Descriptions error:", error.message);
    console.log(`✓ Seeded ${rds.length} rubric descriptions`);
  }

  // 4. Feedback Templates
  const ftPath = path.join(__dirname, "..", "CSV", "Dev QA Tracker - FeedbackTemplates.csv");
  if (fs.existsSync(ftPath)) {
    const raw = parseCsv(fs.readFileSync(ftPath, "utf-8"));
    const fts = raw
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
      }));
    for (let i = 0; i < fts.length; i += 100) {
      const chunk = fts.slice(i, i + 100);
      const { error } = await supabase.from("feedback_templates").upsert(chunk, { onConflict: "id" });
      if (error) console.error("Feedback Templates error:", error.message);
    }
    console.log(`✓ Seeded ${fts.length} feedback templates`);
  }

  // 5. Assignments
  const asgPath = path.join(__dirname, "..", "CSV", "Dev QA Tracker - Assignments.csv");
  if (fs.existsSync(asgPath)) {
    const raw = parseCsv(fs.readFileSync(asgPath, "utf-8"));
    const asgs = raw
      .filter((r) => r.ID && r["QA Email"])
      .map((r) => ({
        id: String(r.ID).trim(),
        date: normalizeDate(r.Date),
        qa_email: String(r["QA Email"]).trim().toLowerCase(),
        agent_email: String(r["Agent Email"] || "").trim().toLowerCase(),
        agent_snapshot: safeJson(r["Agent Snapshot"]),
        rubric_id: r["Rubric ID"] || null,
        status: r.Status || "Pending",
        swap_data: r["Swap Data"] ? safeJson(r["Swap Data"]) : null,
        assigned_by: r["Assigned By"] || null,
        evaluation_type: r["Evaluation Type"] || "Manual Audit",
        timestamp: r.Timestamp || new Date().toISOString(),
      }));
    for (let i = 0; i < asgs.length; i += 100) {
      const chunk = asgs.slice(i, i + 100);
      const { error } = await supabase.from("assignments").upsert(chunk, { onConflict: "id" });
      if (error) console.error("Assignments error:", error.message);
    }
    console.log(`✓ Seeded ${asgs.length} assignments`);
  }

  // 6. Evaluations
  const evalPath = path.join(__dirname, "..", "CSV", "Dev QA Tracker - Evaluations.csv");
  if (fs.existsSync(evalPath)) {
    const raw = parseCsv(fs.readFileSync(evalPath, "utf-8"));
    const evals = raw
      .filter((r) => r.ID && r["Interaction ID"])
      .map((r) => ({
        id: String(r.ID).trim(),
        submitted_at: r["Submitted At"] || new Date().toISOString(),
        agent_name: r["Agent Name"] || "Unknown",
        agent_snapshot: safeJson(r["Agent Snapshot"]),
        score: parseFloat(r.Score) || 0,
        shift_snapshot: r["Shift Snapshot"] || null,
        rubric_id: r["Rubric ID"] || null,
        evaluation_details: safeJson(r["Evaluation Details"]),
        assignment_id: r["Assignment ID"] || null,
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
        sync_status: "synced",
      }));
    for (let i = 0; i < evals.length; i += 100) {
      const chunk = evals.slice(i, i + 100);
      const { error } = await supabase.from("evaluations").upsert(chunk, { onConflict: "interaction_id" });
      if (error) console.error("Evaluations error:", error.message);
    }
    console.log(`✓ Seeded ${evals.length} evaluations`);
  }

  console.log("=== Seed Completed Successfully ===");
}

run();
