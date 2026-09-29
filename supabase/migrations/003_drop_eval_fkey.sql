-- Drop strict assignment foreign key on evaluations so historical evaluations from other sheets/weeks are preserved
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_assignment_id_fkey;
