/*
# Fix Event Visibility and Membership Request Visibility

Issues:
1. Members can't see published events - policy too restrictive
2. Admin can't see pending membership requests

Fixes:
- Allow authenticated users to see published events for clubs they're a member of
- Allow admins to see all memberships including pending ones
*/

-- Drop and recreate event policies
DROP POLICY IF EXISTS "members_view_published_events" ON events;
DROP POLICY IF EXISTS "managers_view_all_club_events" ON events;
DROP POLICY IF EXISTS "admin_view_all_events" ON events;

-- Anyone authenticated can see published events (if they're a member of the club)
CREATE POLICY "view_published_events" ON events FOR SELECT
  TO authenticated USING (
    status = 'published' AND (
      EXISTS (SELECT 1 FROM memberships WHERE user_id = auth.uid() AND club_id = events.club_id AND status = 'active')
    )
  );

-- Managers see all events in their clubs
CREATE POLICY "managers_view_all_events" ON events FOR SELECT
  TO authenticated USING (has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager']));

-- Admins see all events
CREATE POLICY "admin_view_all_events" ON events FOR SELECT
  TO authenticated USING (is_admin());

-- Drop and recreate membership policies
DROP POLICY IF EXISTS "members_view_own_memberships" ON memberships;
DROP POLICY IF EXISTS "club_managers_view_memberships" ON memberships;
DROP POLICY IF EXISTS "admin_view_all_memberships" ON memberships;

-- Users see their own memberships (including pending)
CREATE POLICY "users_view_own_memberships" ON memberships FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- Club managers see all memberships in their clubs
CREATE POLICY "managers_view_club_memberships" ON memberships FOR SELECT
  TO authenticated USING (has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager']));

-- Admins see ALL memberships (including pending)
CREATE POLICY "admin_all_memberships" ON memberships FOR SELECT
  TO authenticated USING (is_admin());