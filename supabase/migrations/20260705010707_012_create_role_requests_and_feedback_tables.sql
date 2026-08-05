/*
# Create role_requests and event_feedback tables

1. New Tables

## role_requests
- `id` (uuid, primary key)
- `user_id` (uuid, FK to profiles, the user requesting access)
- `club_id` (uuid, FK to clubs, the club they want access to)
- `requested_role` (text, the role being requested: manager, secretary, treasurer, vice_president, president)
- `status` (text, pending/approved/rejected, default pending)
- `notes` (text, optional notes from user or admin)
- `reviewed_at` (timestamptz, when the request was reviewed)
- `reviewed_by` (uuid, FK to profiles, admin who reviewed)
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz)

## event_feedback
- `id` (uuid, primary key)
- `event_id` (uuid, FK to events)
- `user_id` (uuid, FK to profiles, the attendee providing feedback)
- `rating` (integer, 1-5 stars)
- `comment` (text, optional feedback comment)
- `created_at` (timestamptz, default now)

2. Security
- Enable RLS on both tables
- role_requests: Users can create their own requests, admins can read/update all, users can view their own
- event_feedback: Members can create feedback for events they attended, club managers can view feedback for their events

3. Notes
- A unique constraint prevents duplicate requests for the same user/club/role combination
- A unique constraint prevents duplicate feedback for the same event/user
*/

-- Create role_requests table
CREATE TABLE IF NOT EXISTS role_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('manager', 'secretary', 'treasurer', 'vice_president', 'president')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, club_id, requested_role)
);

-- Create event_feedback table
CREATE TABLE IF NOT EXISTS event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_feedback ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_requests_user ON role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_club ON role_requests(club_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_feedback_event ON event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_user ON event_feedback(user_id);

-- RLS Policies for role_requests

-- Users can view their own requests
DROP POLICY IF EXISTS "read_own_role_requests" ON role_requests;
CREATE POLICY "read_own_role_requests" ON role_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admins can view all requests
DROP POLICY IF EXISTS "admin_read_role_requests" ON role_requests;
CREATE POLICY "admin_read_role_requests" ON role_requests FOR SELECT
  TO authenticated USING (is_admin());

-- Users can create their own requests
DROP POLICY IF EXISTS "insert_own_role_requests" ON role_requests;
CREATE POLICY "insert_own_role_requests" ON role_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can update (approve/reject) requests
DROP POLICY IF EXISTS "admin_update_role_requests" ON role_requests;
CREATE POLICY "admin_update_role_requests" ON role_requests FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- RLS Policies for event_feedback

-- Members can view feedback they submitted
DROP POLICY IF EXISTS "read_own_feedback" ON event_feedback;
CREATE POLICY "read_own_feedback" ON event_feedback FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Club managers can view feedback for their events
DROP POLICY IF EXISTS "managers_read_event_feedback" ON event_feedback;
CREATE POLICY "managers_read_event_feedback" ON event_feedback FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN memberships m ON m.club_id = e.club_id
      WHERE e.id = event_feedback.event_id
      AND m.user_id = auth.uid()
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
      AND m.status = 'active'
    )
  );

-- Admins can view all feedback
DROP POLICY IF EXISTS "admin_read_event_feedback" ON event_feedback;
CREATE POLICY "admin_read_event_feedback" ON event_feedback FOR SELECT
  TO authenticated USING (is_admin());

-- Users can submit feedback for events they attended (registered and attended)
DROP POLICY IF EXISTS "insert_event_feedback" ON event_feedback;
CREATE POLICY "insert_event_feedback" ON event_feedback FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM event_attendance ea
      WHERE ea.event_id = event_feedback.event_id
      AND ea.user_id = auth.uid()
      AND ea.status IN ('attended', 'late')
    )
  );