-- Fix notifications CHECK constraint to allow 'leave_request' and 'role_request' types
-- The code inserts these types but the DB rejects them, so no notifications reach admins
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY['event', 'membership', 'budget', 'system', 'announcement', 'leave_request', 'role_request']));