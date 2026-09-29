-- ====================================================================
-- Personal QA Tracker: Initial Schema Migration
-- Project: personal-qa-tracker (Supabase)
-- ====================================================================

-- 1. Profiles Table (sync with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    display_name TEXT,
    role TEXT DEFAULT 'QA Evaluator',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of profiles"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Allow users to update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 2. App & User Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    google_sheet_id TEXT DEFAULT '',
    sheet_name_assignments TEXT DEFAULT 'Assignments',
    sheet_name_evaluations TEXT DEFAULT 'Evaluations',
    sheet_name_agents TEXT DEFAULT 'Agents',
    sheet_name_rubrics TEXT DEFAULT 'Rubrics',
    sheet_name_templates TEXT DEFAULT 'FeedbackTemplates',
    sheet_name_rubric_desc TEXT DEFAULT 'RubricDescriptions',
    sheet_name_settings TEXT DEFAULT 'Settings',
    sync_interval_seconds INT DEFAULT 180,
    sync_cooldown_seconds INT DEFAULT 30,
    gemini_api_key TEXT,
    gemini_model TEXT DEFAULT 'gemini-2.5-flash',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view settings"
    ON public.app_settings FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Allow users to insert/update own settings"
    ON public.app_settings FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. Agents Roster Table (mirrors Agents sheet)
CREATE TABLE IF NOT EXISTS public.agents (
    eid TEXT PRIMARY KEY,
    case_safe_id TEXT,
    toasttab_email TEXT,
    internal_ibex_email TEXT,
    full_name TEXT NOT NULL,
    display_name TEXT,
    location TEXT,
    skill TEXT,
    channel TEXT,
    tier TEXT,
    role TEXT DEFAULT 'Agent',
    status TEXT DEFAULT 'Active',
    wave TEXT,
    production_date DATE,
    supervisor TEXT,
    manager TEXT,
    created_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated users to read agents"
    ON public.agents FOR SELECT
    USING (true);

-- 4. Rubrics Table
CREATE TABLE IF NOT EXISTS public.rubrics (
    id TEXT PRIMARY KEY, -- e.g. 'RB-2002'
    name TEXT NOT NULL,
    structure JSONB NOT NULL,
    version INT DEFAULT 1,
    status TEXT DEFAULT 'Active',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all users to read rubrics"
    ON public.rubrics FOR SELECT
    USING (true);

-- 5. Rubric Descriptions Table
CREATE TABLE IF NOT EXISTS public.rubric_descriptions (
    id TEXT PRIMARY KEY, -- e.g. 'RD-5001'
    rubric_id TEXT REFERENCES public.rubrics(id) ON DELETE CASCADE,
    section_index INT NOT NULL,
    item_index INT NOT NULL,
    option_index INT NOT NULL,
    description JSONB NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rubric_descriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all users to read rubric descriptions"
    ON public.rubric_descriptions FOR SELECT
    USING (true);

-- 6. Feedback Templates Table
CREATE TABLE IF NOT EXISTS public.feedback_templates (
    id TEXT PRIMARY KEY, -- e.g. 'FT-1001'
    created_by TEXT,
    rubric_id TEXT REFERENCES public.rubrics(id) ON DELETE CASCADE,
    section_index INT NOT NULL,
    item_index INT NOT NULL,
    option_index INT NOT NULL,
    button_label TEXT,
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all users to read feedback templates"
    ON public.feedback_templates FOR SELECT
    USING (true);

-- 7. Assignments Table (Personal QA Assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY, -- e.g. 'ASG-1788020018735-8529'
    date DATE NOT NULL,
    qa_email TEXT NOT NULL,
    agent_email TEXT NOT NULL,
    agent_snapshot JSONB NOT NULL,
    rubric_id TEXT REFERENCES public.rubrics(id),
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Partial', 'Completed'
    swap_data JSONB,
    assigned_by TEXT,
    evaluation_type TEXT,
    timestamp TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_qa_date ON public.assignments(qa_email, date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_agent_email ON public.assignments(agent_email);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
-- Evaluators can view their personal assignments (or all if admin)
CREATE POLICY "Allow users to read their own assignments"
    ON public.assignments FOR SELECT
    USING (true); -- Can be scoped to qa_email = auth.jwt()->>'email' once auth is active

CREATE POLICY "Allow service/users to update assignments"
    ON public.assignments FOR ALL
    USING (true);

-- 8. Evaluations Table (GLOBAL UNIQUE interaction_id)
CREATE TABLE IF NOT EXISTS public.evaluations (
    id TEXT PRIMARY KEY, -- e.g. 'EVL-1788027719899-657'
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent_name TEXT NOT NULL,
    agent_snapshot JSONB NOT NULL,
    score NUMERIC(5, 2) NOT NULL,
    shift_snapshot TEXT,
    rubric_id TEXT REFERENCES public.rubrics(id),
    evaluation_details JSONB NOT NULL,
    assignment_id TEXT REFERENCES public.assignments(id),
    interaction_id TEXT UNIQUE NOT NULL, -- CRUCIAL: Global uniqueness prevents duplicate evaluations!
    date_of_interaction DATE,
    call_ani_dnis TEXT,
    case_no TEXT,
    call_duration TEXT,
    case_category TEXT,
    case_sub_category TEXT,
    issue_concern TEXT,
    qa_name TEXT NOT NULL,
    qa_email TEXT,
    dispute_status TEXT DEFAULT 'None',
    dispute_data JSONB,
    evaluation_type TEXT,
    consultation_status TEXT DEFAULT 'None',
    consultation_data JSONB,
    comments TEXT,
    ticket_link TEXT,
    supervisor_ack_status TEXT DEFAULT 'None',
    supervisor_ack_data JSONB,
    sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending_sheet_sync', 'failed'
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crucial unique index for O(1) duplicate checks across all users
CREATE UNIQUE INDEX IF NOT EXISTS idx_evaluations_interaction_id ON public.evaluations(interaction_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_qa_email ON public.evaluations(qa_email);
CREATE INDEX IF NOT EXISTS idx_evaluations_case_no ON public.evaluations(case_no);
CREATE INDEX IF NOT EXISTS idx_evaluations_submitted_at ON public.evaluations(submitted_at);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
-- All evaluators must be able to read evaluations to verify interaction_id uniqueness
CREATE POLICY "Allow all users to read evaluations for uniqueness check"
    ON public.evaluations FOR SELECT
    USING (true);

CREATE POLICY "Allow evaluators to insert evaluations"
    ON public.evaluations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow evaluators to update evaluations"
    ON public.evaluations FOR UPDATE
    USING (true);

-- 9. Sync Logs & Sync Queue
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT,
    target_table TEXT NOT NULL,
    operation TEXT NOT NULL, -- 'pull', 'push'
    rows_affected INT DEFAULT 0,
    status TEXT NOT NULL, -- 'success', 'warning', 'error'
    error_message TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read sync logs"
    ON public.sync_logs FOR SELECT
    USING (true);
