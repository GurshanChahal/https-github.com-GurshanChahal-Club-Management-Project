/*
# COSC Club Event Management System - Initial Schema

This migration creates the complete database schema for a university club event management system.

## Tables Created:
1. `profiles` - User profiles extending auth.users with role information
2. `clubs` - Club/organization information
3. `memberships` - User-club relationships with roles
4. `events` - Club events and activities
5. `event_attendance` - Attendance tracking for events
6. `budget_items` - Budget allocations and expense tracking
7. `notifications` - User notifications

## Security:
- RLS enabled on all tables
- Role-based access control (Administrator, Club Manager, Club Member)
- Owner-scoped data access using auth.uid()
- Membership-based access for club-related data

## Role Definitions:
- Administrator: Full system access, can manage all clubs and users
- Club Manager: Can manage their clubs, events, budgets, and members
- Club Member: Can view and RSVP to events, view club information
*/

-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  student_id text UNIQUE,
  phone text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  logo_url text,
  banner_url text,
  founded_date date,
  meeting_schedule text,
  contact_email text,
  website_url text,
  social_links jsonb DEFAULT '{}',
  max_members integer DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Memberships table (user-club relationship)
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'banned')),
  joined_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, club_id)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text CHECK (event_type IN ('meeting', 'workshop', 'social', 'competition', 'fundraiser', 'other')),
  location text,
  is_virtual boolean DEFAULT false,
  virtual_link text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  max_attendees integer,
  registration_deadline timestamptz,
  image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event Attendance table
CREATE TABLE IF NOT EXISTS event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'absent', 'cancelled')),
  registered_at timestamptz DEFAULT now(),
  attended_at timestamptz,
  notes text,
  UNIQUE(event_id, user_id)
);

-- Budget Items table
CREATE TABLE IF NOT EXISTS budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  amount decimal(10,2) NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  date date NOT NULL,
  receipt_url text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Budget Categories table
CREATE TABLE IF NOT EXISTS budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  budget_limit decimal(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(club_id, name)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('event', 'membership', 'budget', 'system', 'announcement')),
  reference_id uuid,
  reference_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Events summary view for analytics
CREATE OR REPLACE VIEW event_summary AS
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

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================
-- PROFILES Policies
-- =====================
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_update_any_profile" ON profiles;
CREATE POLICY "admin_update_any_profile" ON profiles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- =====================
-- CLUBS Policies
-- =====================
DROP POLICY IF EXISTS "anyone_can_view_active_clubs" ON clubs;
CREATE POLICY "anyone_can_view_active_clubs" ON clubs FOR SELECT
  TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "admin_view_all_clubs" ON clubs;
CREATE POLICY "admin_view_all_clubs" ON clubs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "manager_create_clubs" ON clubs;
CREATE POLICY "manager_create_clubs" ON clubs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

DROP POLICY IF EXISTS "admin_update_any_club" ON clubs;
CREATE POLICY "admin_update_any_club" ON clubs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "manager_update_managed_club" ON clubs;
CREATE POLICY "manager_update_managed_club" ON clubs FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = clubs.id 
      AND m.role IN ('president', 'vice_president', 'manager')
    )
  );

-- =====================
-- MEMBERSHIPS Policies
-- =====================
DROP POLICY IF EXISTS "members_view_own_memberships" ON memberships;
CREATE POLICY "members_view_own_memberships" ON memberships FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "club_managers_view_club_memberships" ON memberships;
CREATE POLICY "club_managers_view_club_memberships" ON memberships FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = memberships.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    )
  );

DROP POLICY IF EXISTS "admin_view_all_memberships" ON memberships;
CREATE POLICY "admin_view_all_memberships" ON memberships FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "members_join_club" ON memberships;
CREATE POLICY "members_join_club" ON memberships FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "managers_manage_memberships" ON memberships;
CREATE POLICY "managers_manage_memberships" ON memberships FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = memberships.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    )
  );

-- =====================
-- EVENTS Policies
-- =====================
DROP POLICY IF EXISTS "members_view_published_events" ON events;
CREATE POLICY "members_view_published_events" ON events FOR SELECT
  TO authenticated USING (
    status = 'published' AND EXISTS (
      SELECT 1 FROM memberships WHERE user_id = auth.uid() AND club_id = events.club_id
    )
  );

DROP POLICY IF EXISTS "managers_view_all_club_events" ON events;
CREATE POLICY "managers_view_all_club_events" ON events FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = events.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    )
  );

DROP POLICY IF EXISTS "admin_view_all_events" ON events;
CREATE POLICY "admin_view_all_events" ON events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "managers_create_events" ON events;
CREATE POLICY "managers_create_events" ON events FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = events.club_id 
      AND m.role IN ('president', 'vice_president', 'manager')
    )
  );

DROP POLICY IF EXISTS "managers_update_events" ON events;
CREATE POLICY "managers_update_events" ON events FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = events.club_id 
      AND m.role IN ('president', 'vice_president', 'manager')
    )
  );

-- =====================
-- EVENT ATTENDANCE Policies
-- =====================
DROP POLICY IF EXISTS "users_view_own_attendance" ON event_attendance;
CREATE POLICY "users_view_own_attendance" ON event_attendance FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "managers_view_attendance" ON event_attendance;
CREATE POLICY "managers_view_attendance" ON event_attendance FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN events e ON e.club_id = m.club_id
      WHERE m.user_id = auth.uid() 
      AND e.id = event_attendance.event_id
      AND m.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    )
  );

DROP POLICY IF EXISTS "users_register_for_events" ON event_attendance;
CREATE POLICY "users_register_for_events" ON event_attendance FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_cancel_own_registration" ON event_attendance;
CREATE POLICY "users_cancel_own_registration" ON event_attendance FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "managers_update_attendance" ON event_attendance;
CREATE POLICY "managers_update_attendance" ON event_attendance FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN events e ON e.club_id = m.club_id
      WHERE m.user_id = auth.uid() 
      AND e.id = event_attendance.event_id
      AND m.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    )
  );

-- =====================
-- BUDGET ITEMS Policies
-- =====================
DROP POLICY IF EXISTS "treasurers_view_budget" ON budget_items;
CREATE POLICY "treasurers_view_budget" ON budget_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = budget_items.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
    )
  );

DROP POLICY IF EXISTS "admin_view_all_budgets" ON budget_items;
CREATE POLICY "admin_view_all_budgets" ON budget_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "treasurers_create_budget_items" ON budget_items;
CREATE POLICY "treasurers_create_budget_items" ON budget_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = budget_items.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
    )
  );

DROP POLICY IF EXISTS "treasurers_update_budget_items" ON budget_items;
CREATE POLICY "treasurers_update_budget_items" ON budget_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = budget_items.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
    )
  );

-- =====================
-- BUDGET CATEGORIES Policies
-- =====================
DROP POLICY IF EXISTS "managers_view_categories" ON budget_categories;
CREATE POLICY "managers_view_categories" ON budget_categories FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = budget_categories.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer', 'manager')
    )
  );

DROP POLICY IF EXISTS "managers_manage_categories" ON budget_categories;
CREATE POLICY "managers_manage_categories" ON budget_categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.user_id = auth.uid() 
      AND m.club_id = budget_categories.club_id 
      AND m.role IN ('president', 'vice_president', 'treasurer')
    )
  );

-- =====================
-- NOTIFICATIONS Policies
-- =====================
DROP POLICY IF EXISTS "users_read_own_notifications" ON notifications;
CREATE POLICY "users_read_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_notifications" ON notifications;
CREATE POLICY "system_insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_club ON memberships(club_id);
CREATE INDEX IF NOT EXISTS idx_events_club ON events(club_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_user ON event_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_club ON budget_items(club_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();