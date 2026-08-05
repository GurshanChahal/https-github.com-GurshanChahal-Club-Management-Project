-- Add RLS policies for club managers to read and update role_requests
-- Currently only admins can read/update role_requests, but club managers
-- should also be able to review role requests for their club.

-- Managers can read role requests for their club
CREATE POLICY "managers_read_role_requests" ON role_requests FOR SELECT
  TO authenticated USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.club_id = role_requests.club_id
        AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['president', 'vice_president', 'treasurer', 'manager'])
        AND m.status = 'active'
    )
  );

-- Managers can update role requests for their club
CREATE POLICY "managers_update_role_requests" ON role_requests FOR UPDATE
  TO authenticated USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.club_id = role_requests.club_id
        AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['president', 'vice_president', 'treasurer', 'manager'])
        AND m.status = 'active'
    )
  ) WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.club_id = role_requests.club_id
        AND m.user_id = auth.uid()
        AND m.role = ANY (ARRAY['president', 'vice_president', 'treasurer', 'manager'])
        AND m.status = 'active'
    )
  );

-- Clean up old member leave requests - members should leave immediately,
-- not create leave requests. These were created due to a bug.
DELETE FROM leave_requests
WHERE user_id IN (
  SELECT lr.user_id
  FROM leave_requests lr
  JOIN memberships m ON m.user_id = lr.user_id AND m.club_id = lr.club_id
  WHERE m.role = 'member'
);