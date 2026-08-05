/*
# Comprehensive RLS Fix for All Tables

Simplify and consolidate RLS policies to ensure:
1. Admins can see everything
2. Managers can see and manage their clubs
3. Members can see their own data and club events
*/

-- ============================================
-- PROFILES - Reset and simplify
-- ============================================
DROP POLICY IF EXISTS "managers_read_club_member_profiles" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_any_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;

-- Everyone can read their own profile, admins can read all
CREATE POLICY "read_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id 
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.club_id = m2.club_id
      WHERE m1.user_id = auth.uid()
      AND m1.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
      AND m1.status = 'active'
      AND m2.user_id = profiles.id
    )
  );

CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (is_admin());

CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- ============================================
-- CLUBS - Reset and simplify
-- ============================================
DROP POLICY IF EXISTS "view_active_clubs" ON clubs;
DROP POLICY IF EXISTS "admin_manager_create_clubs" ON clubs;
DROP POLICY IF EXISTS "admin_update_any_club" ON clubs;
DROP POLICY IF EXISTS "manager_update_managed_club" ON clubs;

CREATE POLICY "read_clubs" ON clubs FOR SELECT
  TO authenticated USING (is_active = true OR is_admin());

CREATE POLICY "create_clubs" ON clubs FOR INSERT
  TO authenticated WITH CHECK (is_admin() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
  ));

CREATE POLICY "update_clubs" ON clubs FOR UPDATE
  TO authenticated USING (
    is_admin() 
    OR has_club_role(id, ARRAY['president', 'vice_president', 'manager'])
  );

-- ============================================
-- MEMBERSHIPS - Reset with clear policies
-- ============================================
DROP POLICY IF EXISTS "admin_all_memberships" ON memberships;
DROP POLICY IF EXISTS "managers_view_all_club_memberships" ON memberships;
DROP POLICY IF EXISTS "users_view_own_memberships" ON memberships;
DROP POLICY IF EXISTS "managers_manage_memberships" ON memberships;
DROP POLICY IF EXISTS "members_join_club" ON memberships;

-- SELECT: Admin sees all, managers see their clubs, users see their own
CREATE POLICY "read_memberships" ON memberships FOR SELECT
  TO authenticated USING (
    is_admin()
    OR user_id = auth.uid()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager'])
  );

-- INSERT: Users can request to join clubs
CREATE POLICY "join_club" ON memberships FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- UPDATE: Admin and club managers can update memberships
CREATE POLICY "update_memberships" ON memberships FOR UPDATE
  TO authenticated USING (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager'])
  );

-- DELETE: Admin and club managers can remove memberships
CREATE POLICY "delete_memberships" ON memberships FOR DELETE
  TO authenticated USING (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager'])
  );

-- ============================================
-- EVENTS - Reset with clear policies
-- ============================================
DROP POLICY IF EXISTS "admin_view_all_events" ON events;
DROP POLICY IF EXISTS "managers_view_all_events" ON events;
DROP POLICY IF EXISTS "view_published_events" ON events;
DROP POLICY IF EXISTS "managers_create_events" ON events;
DROP POLICY IF EXISTS "managers_update_events" ON events;

-- SELECT: Admin sees all, managers see club events, members see published events
CREATE POLICY "read_events" ON events FOR SELECT
  TO authenticated USING (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager'])
    OR (status = 'published' AND EXISTS (
      SELECT 1 FROM memberships 
      WHERE user_id = auth.uid() 
      AND club_id = events.club_id 
      AND status = 'active'
    ))
  );

-- INSERT: Club managers can create events
CREATE POLICY "create_events" ON events FOR INSERT
  TO authenticated WITH CHECK (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'manager'])
  );

-- UPDATE: Club managers can update events
CREATE POLICY "update_events" ON events FOR UPDATE
  TO authenticated USING (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'manager'])
  );

-- DELETE: Club managers can delete events
CREATE POLICY "delete_events" ON events FOR DELETE
  TO authenticated USING (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'manager'])
  );