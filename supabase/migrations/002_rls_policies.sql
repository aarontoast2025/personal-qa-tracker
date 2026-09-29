-- Fix Row Level Security (RLS) policies to allow inserts and sync operations

-- Agents
DROP POLICY IF EXISTS "Allow all authenticated users to read agents" ON public.agents;
CREATE POLICY "Allow read agents" ON public.agents FOR SELECT USING (true);
CREATE POLICY "Allow write agents" ON public.agents FOR ALL USING (true) WITH CHECK (true);

-- Rubrics
DROP POLICY IF EXISTS "Allow all users to read rubrics" ON public.rubrics;
CREATE POLICY "Allow read rubrics" ON public.rubrics FOR SELECT USING (true);
CREATE POLICY "Allow write rubrics" ON public.rubrics FOR ALL USING (true) WITH CHECK (true);

-- Rubric Descriptions
DROP POLICY IF EXISTS "Allow all users to read rubric descriptions" ON public.rubric_descriptions;
CREATE POLICY "Allow read rubric descriptions" ON public.rubric_descriptions FOR SELECT USING (true);
CREATE POLICY "Allow write rubric descriptions" ON public.rubric_descriptions FOR ALL USING (true) WITH CHECK (true);

-- Feedback Templates
DROP POLICY IF EXISTS "Allow all users to read feedback templates" ON public.feedback_templates;
CREATE POLICY "Allow read feedback templates" ON public.feedback_templates FOR SELECT USING (true);
CREATE POLICY "Allow write feedback templates" ON public.feedback_templates FOR ALL USING (true) WITH CHECK (true);

-- Assignments
DROP POLICY IF EXISTS "Allow users to read their own assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow service/users to update assignments" ON public.assignments;
CREATE POLICY "Allow read assignments" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Allow write assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);

-- Evaluations
DROP POLICY IF EXISTS "Allow all users to read evaluations for uniqueness check" ON public.evaluations;
DROP POLICY IF EXISTS "Allow evaluators to insert evaluations" ON public.evaluations;
DROP POLICY IF EXISTS "Allow evaluators to update evaluations" ON public.evaluations;
CREATE POLICY "Allow read evaluations" ON public.evaluations FOR SELECT USING (true);
CREATE POLICY "Allow write evaluations" ON public.evaluations FOR ALL USING (true) WITH CHECK (true);

-- App Settings
DROP POLICY IF EXISTS "Allow users to view settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow users to insert/update own settings" ON public.app_settings;
CREATE POLICY "Allow read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow write settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Sync Logs
DROP POLICY IF EXISTS "Allow read sync logs" ON public.sync_logs;
CREATE POLICY "Allow read sync logs" ON public.sync_logs FOR SELECT USING (true);
CREATE POLICY "Allow write sync logs" ON public.sync_logs FOR ALL USING (true) WITH CHECK (true);
