export interface Agent {
  eid: string;
  case_safe_id?: string;
  toasttab_email?: string;
  internal_ibex_email?: string;
  full_name: string;
  display_name?: string;
  location?: string;
  skill?: string;
  channel?: string;
  tier?: string;
  role?: string;
  status?: string;
  wave?: string;
  production_date?: string;
  supervisor?: string;
  manager?: string;
  created_at?: string;
  synced_at?: string;
}

export interface Assignment {
  id: string;
  date: string;
  qa_email: string;
  agent_email: string;
  agent_snapshot: {
    eid?: string;
    caseSafeId?: string;
    toasttabEmail?: string;
    internalIbexEmail?: string;
    fullName?: string;
    displayName?: string;
    location?: string;
    skill?: string;
    channel?: string;
    tier?: string;
    role?: string;
    status?: string;
    wave?: string;
    productionDate?: string;
    supervisor?: string;
    manager?: string;
  };
  rubric_id: string;
  status: "Pending" | "Partial" | "Completed";
  swap_data?: any;
  assigned_by?: string;
  evaluation_type?: string;
  timestamp?: string;
  synced_at?: string;
}

export interface Evaluation {
  id: string;
  submitted_at: string;
  agent_name: string;
  agent_snapshot: any;
  score: number;
  shift_snapshot?: string;
  rubric_id: string;
  evaluation_details: any;
  assignment_id?: string;
  interaction_id: string;
  date_of_interaction?: string;
  call_ani_dnis?: string;
  case_no?: string;
  call_duration?: string;
  case_category?: string;
  case_sub_category?: string;
  issue_concern?: string;
  qa_name: string;
  qa_email?: string;
  dispute_status?: string;
  dispute_data?: any;
  evaluation_type?: string;
  consultation_status?: string;
  consultation_data?: any;
  comments?: string;
  ticket_link?: string;
  supervisor_ack_status?: string;
  supervisor_ack_data?: any;
  sync_status?: string;
  synced_at?: string;
}

export interface AppSettings {
  id?: string;
  user_id?: string;
  google_sheet_id: string;
  sheet_name_assignments: string;
  sheet_name_evaluations: string;
  sheet_name_agents: string;
  sheet_name_rubrics: string;
  sheet_name_templates: string;
  sheet_name_rubric_desc: string;
  sheet_name_settings: string;
  sync_interval_seconds: number;
  sync_cooldown_seconds: number;
  google_service_account_email?: string;
  google_private_key?: string;
  google_apps_script_url?: string;
  google_web_app_url?: string;
  gemini_api_key?: string;
  gemini_model?: string;
  updated_at?: string;
}
