/*
# Fix RLS Infinite Recursion

The RLS policies were causing infinite recursion by querying the profiles table
while checking permissions, which triggered the same RLS policies again.

Solution: Use a SECURITY DEFINER function to check admin status, and simplify policies
to avoid self-referencing queries.
*/

-- Create a helper function to check if user is admin (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Create a helper function to check if user has club management role
CREATE OR REPLACE FUNCTION has_club_role(club_id uuid, roles text[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND club_id = $1 
    AND role = ANY($2)
  );
$$;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_any_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;

DROP POLICY IF EXISTS "anyone_can_view_active_clubs" ON clubs;
DROP POLICY IF EXISTS "admin_view_all_clubs" ON clubs;
DROP POLICY IF EXISTS "manager_create_clubs" ON clubs;
DROP POLICY IF EXISTS "admin_update_any_club" ON clubs;
DROP POLICY IF EXISTS "manager_update_managed_club" ON clubs;

DROP POLICY IF EXISTS "members_view_own_memberships" ON memberships;
DROP POLICY IF EXISTS "club_managers_view_club_memberships" ON memberships;
DROP POLICY IF EXISTS "admin_view_all_memberships" ON memberships;
DROP POLICY IF EXISTS "members_join_club" ON memberships;
DROP POLICY IF EXISTS "managers_manage_memberships" ON memberships;

DROP POLICY IF EXISTS "members_view_published_events" ON events;
DROP POLICY IF EXISTS "managers_view_all_club_events" ON events;
DROP POLICY IF EXISTS "admin_view_all_events" ON events;
DROP POLICY IF EXISTS "managers_create_events" ON events;
DROP POLICY IF EXISTS "managers_update_events" ON events;

DROP POLICY IF EXISTS "users_view_own_attendance" ON event_attendance;
DROP POLICY IF EXISTS "managers_view_attendance" ON event_attendance;
DROP POLICY IF EXISTS "users_register_for_events" ON event_attendance;
DROP POLICY IF EXISTS "users_cancel_own_registration" ON event_attendance;
DROP POLICY IF EXISTS "managers_update_attendance" ON event_attendance;

DROP POLICY IF EXISTS "treasurers_view_budget" ON budget_items;
DROP POLICY IF EXISTS "admin_view_all_budgets" ON budget_items;
DROP POLICY IF EXISTS "treasurers_create_budget_items" ON budget_items;
DROP POLICY IF EXISTS "treasurers_update_budget_items" ON budget_items;

DROP POLICY IF EXISTS "managers_view_categories" ON budget_categories;
DROP POLICY IF EXISTS "managers_manage_categories" ON budget_categories;

DROP POLICY IF EXISTS "users_read_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "system_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "users_insert_own_notifications" ON notifications;

-- =====================
-- PROFILES Policies (Fixed - no recursion)
-- =====================
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (is_admin());

CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_update_any_profile" ON profiles FOR UPDATE
  TO authenticated USING (is_admin());

CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- =====================
-- CLUBS Policies (Fixed)
-- =====================
CREATE POLICY "view_active_clubs" ON clubs FOR SELECT
  TO authenticated USING (is_active = true OR is_admin());

CREATE POLICY "admin_manager_create_clubs" ON clubs FOR INSERT
  TO authenticated WITH CHECK (is_admin() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "admin_update_any_club" ON clubs FOR UPDATE
  TO authenticated USING (is_admin());

CREATE POLICY "manager_update_managed_club" ON clubs FOR UPDATE
  TO authenticated USING (has_club_role(id, ARRAY['president', 'vice_president', 'manager']));

-- =====================
-- MEMBERSHIPS Policies (Fixed)
-- =====================
CREATE POLICY "members_view_own_memberships" ON memberships FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "club_managers_view_memberships" ON memberships FOR SELECT
  TO authenticated USING (has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager']));

CREATE POLICY "admin_view_all_memberships" ON memberships FOR SELECT
  TO authenticated USING (is_admin());

CREATE POLICY "members_join_club" ON memberships FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "managers_manage_memberships" ON memberships FOR UPDATE
  TO authenticated USING (has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager']));

-- =====================
-- EVENTS Policies (Fixed)
-- =====================
CREATE POLICY "members_view_published_events" ON events FOR SELECT
  TO authenticated USING (
    status = 'published' AND (
      is_admin() OR
      has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager', 'member']) OR
      EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND club_id = events.club_id AND status = 'active')
    )
  );

CREATE POLICY "managers_view_all_club_events" ON events FOR SELECT
  TO authenticated USING (has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager']));

CREATE POLICY "admin_view_all_events" ON events FOR SELECT
  TO authenticated USING (is_admin());

CREATE POLICY "managers_create_events" ON events FOR INSERT
  TO authenticated WITH CHECK (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'manager']));

CREATE POLICY "managers_update_events" ON events FOR UPDATE
  TO authenticated USING (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'manager']));

-- =====================
-- EVENT ATTENDANCE Policies (Fixed)
-- =====================
CREATE POLICY "users_view_own_attendance" ON event_attendance FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "managers_view_attendance" ON event_attendance FOR SELECT
  TO authenticated USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN events e ON e.club_id = m.club_id
      WHERE m.user_id = auth.uid() 
      AND e.id = event_attendance.event_id
      AND m.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    )
  );

CREATE POLICY "users_register_for_events" ON event_attendance FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_cancel_own_registration" ON event_attendance FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "managers_update_attendance" ON event_attendance FOR UPDATE
  TO authenticated USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN events e ON e.club_id = m.club_id
      WHERE m.user_id = auth.uid() 
      AND e.id = event_attendance.event_id
      AND m.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    )
  );

-- =====================
-- BUDGET ITEMS Policies (Fixed)
-- =====================
CREATE POLICY "treasurers_view_budget" ON budget_items FOR SELECT
  TO authenticated USING (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'manager']));

CREATE POLICY "treasurers_create_budget_items" ON budget_items FOR INSERT
  TO authenticated WITH CHECK (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'manager']));

CREATE POLICY "treasurers_update_budget_items" ON budget_items FOR UPDATE
  TO authenticated USING (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'manager']));

CREATE POLICY "treasurers_delete_budget_items" ON budget_items FOR DELETE
  TO authenticated USING (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'manager']));

-- =====================
-- BUDGET CATEGORIES Policies (Fixed)
-- =====================
CREATE POLICY "managers_view_categories" ON budget_categories FOR SELECT
  TO authenticated USING (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'manager']));

CREATE POLICY "managers_manage_categories" ON budget_categories FOR ALL
  TO authenticated USING (is_admin() OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer']));

-- =====================
-- NOTIFICATIONS Policies (Fixed)
-- =====================
CREATE POLICY "users_read_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

-- Allow authenticated users to insert notifications (for club managers sending notifications)
CREATE POLICY "authenticated_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);