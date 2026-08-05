/*
# Create leave_requests table

1. New Tables
- `leave_requests`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to profiles, the user requesting to leave)
  - `club_id` (uuid, FK to clubs, the club they want to leave)
  - `reason` (text, optional reason for leaving)
  - `status` (text, pending/approved/rejected, default pending)
  - `requested_at` (timestamptz, default now)
  - `reviewed_at` (timestamptz, when reviewed)
  - `reviewed_by` (uuid, FK to profiles, who reviewed)
  - UNIQUE constraint on (user_id, club_id) to prevent duplicate requests

2. Security
- Enable RLS on leave_requests
- Users can create their own leave requests
- Club managers can view/approve leave requests for their club's members
- Admins can view/approve all leave requests

3. Notes
- Members request leave -> Manager approves
- Managers request leave -> Admin approves
- When approved, the membership status becomes 'inactive'
*/

CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id, club_id)
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_club ON leave_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- RLS Policies for leave_requests

-- Users can view their own leave requests
DROP POLICY IF EXISTS "read_own_leave_requests" ON leave_requests;
CREATE POLICY "read_own_leave_requests" ON leave_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Club managers can view leave requests for their club
DROP POLICY IF EXISTS "managers_read_leave_requests" ON leave_requests;
CREATE POLICY "managers_read_leave_requests" ON leave_requests FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.club_id = leave_requests.club_id
      AND m.user_id = auth.uid()
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
      AND m.status = 'active'
    )
  );

-- Admins can view all leave requests
DROP POLICY IF EXISTS "admin_read_leave_requests" ON leave_requests;
CREATE POLICY "admin_read_leave_requests" ON leave_requests FOR SELECT
  TO authenticated USING (is_admin());

-- Users can create their own leave requests
DROP POLICY IF EXISTS "insert_own_leave_requests" ON leave_requests;
CREATE POLICY "insert_own_leave_requests" ON leave_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Club managers can approve leave requests for their club
DROP POLICY IF EXISTS "managers_update_leave_requests" ON leave_requests;
CREATE POLICY "managers_update_leave_requests" ON leave_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.club_id = leave_requests.club_id
      AND m.user_id = auth.uid()
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
      AND m.status = 'active'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.club_id = leave_requests.club_id
      AND m.user_id = auth.uid()
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
      AND m.status = 'active'
    )
  );

-- Admins can update all leave requests
DROP POLICY IF EXISTS "admin_update_leave_requests" ON leave_requests;
CREATE POLICY "admin_update_leave_requests" ON leave_requests FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());