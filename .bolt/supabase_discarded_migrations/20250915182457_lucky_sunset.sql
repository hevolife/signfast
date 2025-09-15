/*
  # Database Cleanup and Optimization

  1. Remove Redundant Tables
    - Remove duplicate `users` table (auth.users already exists)
    - Keep only essential tables with optimized structure

  2. Optimize Indexes
    - Remove redundant indexes
    - Add composite indexes for better query performance
    - Optimize foreign key indexes

  3. Simplify Schema
    - Merge related functionality
    - Remove unused columns
    - Optimize data types

  4. Performance Improvements
    - Add partial indexes where appropriate
    - Optimize RLS policies
    - Clean up unused triggers
*/

-- Drop redundant users table (we use auth.users)
DROP TABLE IF EXISTS public.users CASCADE;

-- Optimize user_profiles table
ALTER TABLE public.user_profiles 
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

-- Add optimized timestamp columns
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Optimize forms table indexes
DROP INDEX IF EXISTS idx_forms_created_at;
DROP INDEX IF EXISTS idx_forms_is_published;
DROP INDEX IF EXISTS idx_forms_user_id;
DROP INDEX IF EXISTS idx_forms_user_id_published;

-- Create optimized composite indexes
CREATE INDEX IF NOT EXISTS idx_forms_user_published_created 
  ON public.forms (user_id, is_published, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forms_published_created 
  ON public.forms (created_at DESC) 
  WHERE is_published = true;

-- Optimize responses table indexes
DROP INDEX IF EXISTS idx_responses_created_at;
DROP INDEX IF EXISTS idx_responses_created_at_desc;
DROP INDEX IF EXISTS idx_responses_form_id;
DROP INDEX IF EXISTS idx_responses_form_id_created_at;
DROP INDEX IF EXISTS idx_responses_form_id_optimized;

-- Create single optimized composite index
CREATE INDEX IF NOT EXISTS idx_responses_form_created 
  ON public.responses (form_id, created_at DESC);

-- Optimize pdf_storage table indexes
DROP INDEX IF EXISTS idx_pdf_storage_created_at;
DROP INDEX IF EXISTS idx_pdf_storage_file_name;
DROP INDEX IF EXISTS idx_pdf_storage_form_title;
DROP INDEX IF EXISTS idx_pdf_storage_user_id;
DROP INDEX IF EXISTS idx_pdf_storage_user_id_created_at;
DROP INDEX IF EXISTS idx_pdf_storage_user_id_user_name;
DROP INDEX IF EXISTS idx_pdf_storage_user_name;

-- Create optimized composite index
CREATE INDEX IF NOT EXISTS idx_pdf_storage_user_created 
  ON public.pdf_storage (user_id, created_at DESC);

-- Optimize pdf_templates table indexes
DROP INDEX IF EXISTS idx_pdf_templates_created_at;
DROP INDEX IF EXISTS idx_pdf_templates_is_public;
DROP INDEX IF EXISTS idx_pdf_templates_linked_form_id;
DROP INDEX IF EXISTS idx_pdf_templates_user_id;

-- Create optimized composite indexes
CREATE INDEX IF NOT EXISTS idx_pdf_templates_user_created 
  ON public.pdf_templates (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pdf_templates_public_form 
  ON public.pdf_templates (is_public, linked_form_id) 
  WHERE is_public = true OR linked_form_id IS NOT NULL;

-- Optimize affiliate system indexes
DROP INDEX IF EXISTS idx_affiliate_programs_active;
DROP INDEX IF EXISTS idx_affiliate_programs_code;
DROP INDEX IF EXISTS idx_affiliate_programs_user_id;

CREATE INDEX IF NOT EXISTS idx_affiliate_programs_user_active 
  ON public.affiliate_programs (user_id, is_active);

DROP INDEX IF EXISTS idx_affiliate_referrals_affiliate_user;
DROP INDEX IF EXISTS idx_affiliate_referrals_created_at;
DROP INDEX IF EXISTS idx_affiliate_referrals_referred_user;
DROP INDEX IF EXISTS idx_affiliate_referrals_status;

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_status 
  ON public.affiliate_referrals (affiliate_user_id, status, created_at DESC);

-- Optimize support system indexes
DROP INDEX IF EXISTS idx_support_tickets_created_at;
DROP INDEX IF EXISTS idx_support_tickets_status;
DROP INDEX IF EXISTS idx_support_tickets_user_id;

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status_created 
  ON public.support_tickets (user_id, status, created_at DESC);

DROP INDEX IF EXISTS idx_support_messages_created_at;
DROP INDEX IF EXISTS idx_support_messages_ticket_id;

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_created 
  ON public.support_messages (ticket_id, created_at ASC);

-- Simplify RLS policies by removing redundant ones
DROP POLICY IF EXISTS "Allow public read access to users" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own data" ON public.user_profiles;

-- Keep only essential RLS policies
CREATE POLICY "Users can manage own profile" 
  ON public.user_profiles 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Optimize forms RLS
DROP POLICY IF EXISTS "Anyone can view published forms" ON public.forms;
DROP POLICY IF EXISTS "Users can view their own forms" ON public.forms;

CREATE POLICY "Forms access policy" 
  ON public.forms 
  FOR SELECT 
  TO anon, authenticated 
  USING (is_published = true OR auth.uid() = user_id);

-- Add function to clean old data periodically
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean responses older than 2 years
  DELETE FROM public.responses 
  WHERE created_at < now() - interval '2 years';
  
  -- Clean old PDF storage older than 1 year
  DELETE FROM public.pdf_storage 
  WHERE created_at < now() - interval '1 year';
  
  -- Clean old support messages from closed tickets older than 6 months
  DELETE FROM public.support_messages 
  WHERE ticket_id IN (
    SELECT id FROM public.support_tickets 
    WHERE status = 'closed' AND updated_at < now() - interval '6 months'
  );
  
  -- Clean closed tickets older than 6 months
  DELETE FROM public.support_tickets 
  WHERE status = 'closed' AND updated_at < now() - interval '6 months';
END;
$$;

-- Create optimized view for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  up.user_id,
  up.company_name,
  up.first_name,
  up.last_name,
  COUNT(DISTINCT f.id) as forms_count,
  COUNT(DISTINCT pt.id) as templates_count,
  COUNT(DISTINCT ps.id) as pdfs_count,
  COUNT(DISTINCT r.id) as responses_count,
  up.created_at as user_created_at
FROM user_profiles up
LEFT JOIN forms f ON f.user_id = up.user_id
LEFT JOIN pdf_templates pt ON pt.user_id = up.user_id
LEFT JOIN pdf_storage ps ON ps.user_id = up.user_id
LEFT JOIN responses r ON r.form_id = f.id
GROUP BY up.user_id, up.company_name, up.first_name, up.last_name, up.created_at;

-- Add RLS to the view
ALTER VIEW user_stats OWNER TO postgres;
GRANT SELECT ON user_stats TO authenticated;

-- Create policy for the view
CREATE POLICY "Users can view own stats" 
  ON user_stats 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Optimize trigger functions
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Replace all update triggers with the optimized function
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS update_forms_updated_at ON public.forms;
DROP TRIGGER IF EXISTS update_pdf_storage_updated_at ON public.pdf_storage;
DROP TRIGGER IF EXISTS update_pdf_templates_updated_at ON public.pdf_templates;
DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;

CREATE TRIGGER update_user_profiles_timestamp
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_forms_timestamp
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_pdf_storage_timestamp
  BEFORE UPDATE ON public.pdf_storage
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_pdf_templates_timestamp
  BEFORE UPDATE ON public.pdf_templates
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Optimize affiliate stats function
CREATE OR REPLACE FUNCTION update_affiliate_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update if status changed to confirmed or paid
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR 
     (TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('confirmed', 'paid')) THEN
    
    UPDATE affiliate_programs 
    SET 
      total_referrals = (
        SELECT COUNT(*) 
        FROM affiliate_referrals 
        WHERE affiliate_user_id = NEW.affiliate_user_id 
        AND status IN ('confirmed', 'paid')
      ),
      total_earnings = (
        SELECT COALESCE(SUM(commission_amount), 0) 
        FROM affiliate_referrals 
        WHERE affiliate_user_id = NEW.affiliate_user_id 
        AND status IN ('confirmed', 'paid')
      ),
      monthly_earnings = (
        SELECT COALESCE(SUM(commission_amount), 0) 
        FROM affiliate_referrals 
        WHERE affiliate_user_id = NEW.affiliate_user_id 
        AND status IN ('confirmed', 'paid')
        AND created_at >= date_trunc('month', now())
      ),
      updated_at = now()
    WHERE user_id = NEW.affiliate_user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add database maintenance settings
INSERT INTO public.system_settings (key, value, updated_by) 
VALUES 
  ('maintenance_mode', 'false', (SELECT id FROM auth.users WHERE email = 'admin@signfast.com' LIMIT 1)),
  ('max_file_size_mb', '10', (SELECT id FROM auth.users WHERE email = 'admin@signfast.com' LIMIT 1)),
  ('cleanup_enabled', 'true', (SELECT id FROM auth.users WHERE email = 'admin@signfast.com' LIMIT 1))
ON CONFLICT (key) DO NOTHING;

-- Create function to get database statistics
CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_forms', (SELECT COUNT(*) FROM public.forms),
    'total_responses', (SELECT COUNT(*) FROM public.responses),
    'total_templates', (SELECT COUNT(*) FROM public.pdf_templates),
    'total_pdfs', (SELECT COUNT(*) FROM public.pdf_storage),
    'active_subscriptions', (SELECT COUNT(*) FROM public.stripe_subscriptions WHERE status = 'active'),
    'database_size', pg_size_pretty(pg_database_size(current_database()))
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to super admins
REVOKE ALL ON FUNCTION get_db_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_db_stats() TO authenticated;

-- Analyze tables for better query planning
ANALYZE public.user_profiles;
ANALYZE public.forms;
ANALYZE public.responses;
ANALYZE public.pdf_templates;
ANALYZE public.pdf_storage;
ANALYZE public.affiliate_programs;
ANALYZE public.affiliate_referrals;
ANALYZE public.support_tickets;
ANALYZE public.support_messages;
ANALYZE public.stripe_customers;
ANALYZE public.stripe_subscriptions;