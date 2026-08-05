/*
# Fix Profile Read Access for Club Managers

Managers need to be able to read profiles of members in their clubs
to display member information on the Members page.
*/

-- Allow managers to read profiles of members in clubs they manage
CREATE POLICY "managers_read_club_member_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    -- User can read their own profile
    auth.uid() = id
    OR
    -- Admins can read all profiles
    is_admin()
    OR
    -- Managers can read profiles of members in their clubs
    EXISTS (
      SELECT 1 FROM memberships m1
      JOIN memberships m2 ON m1.club_id = m2.club_id
      WHERE m1.user_id = auth.uid()
      AND m1.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
      AND m1.status = 'active'
      AND m2.user_id = profiles.id
    )
  );

-- Drop the restrictive policy
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;