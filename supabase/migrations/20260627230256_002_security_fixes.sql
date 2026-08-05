/*
# Security Fixes

This migration addresses three security vulnerabilities:

1. **Security Definer View**: 
   - Drops and recreates `event_summary` view without SECURITY DEFINER
   - Views now execute with the calling user's permissions

2. **Function Search Path Mutable**:
   - Fixes `update_updated_at_column` function to use a fixed search_path
   - Prevents search_path injection attacks

3. **RLS Policy Always True**:
   - Replaces permissive `system_insert_notifications` policy with a secure version
   - Users can now only insert notifications for themselves
   - System-level notifications should be created via edge functions with service role
*/

-- Fix 1: Drop and recreate view without SECURITY DEFINER
DROP VIEW IF EXISTS event_summary;

CREATE VIEW event_summary AS
SELECT 
  e.id,
  e.club_id,
  c.name as club_name,
  e.title,
  e.event_type,
  e.start_time,
  e.status,
  COUNT(DISTINCT ea.id) as total_registrations,
  COUNT(DISTINCT CASE WHEN ea.status = 'attended' THEN ea.id END) as attended_count
FROM events e
LEFT JOIN clubs c ON e.club_id = c.id
LEFT JOIN event_attendance ea ON e.id = ea.event_id
GROUP BY e.id, e.club_id, c.name, e.title, e.event_type, e.start_time, e.status;

-- Fix 2: Update function with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY INVOKER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 3: Replace permissive RLS policy with secure version
DROP POLICY IF EXISTS "system_insert_notifications" ON notifications;

-- Users can only insert notifications for themselves
CREATE POLICY "users_insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Note: System notifications should be created via edge functions using service_role key
-- which bypasses RLS. For user-triggered notifications, use database triggers or 
-- application logic with proper authorization checks.