-- 004_add_web_app_url.sql
-- Add google_web_app_url to app_settings table for Google Apps Script Web App bridge integration

ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS google_web_app_url TEXT DEFAULT 'https://script.google.com/macros/s/AKfycbyI2cDSGLZokRPesN_f-LmdSp2YLXzY3aXYpyrq2_Kzh9_vYCQOsyQtw0L-7wwHQ3lFEQ/exec';
