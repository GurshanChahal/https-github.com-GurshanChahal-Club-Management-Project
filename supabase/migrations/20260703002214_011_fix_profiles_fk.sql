/*
# Add Missing Foreign Key to Profiles

The memberships.user_id references auth.users but not profiles.
PostgREST needs a direct FK to allow the nested select.
Since profiles.id also references auth.users, we can add this FK safely.
*/

-- Drop the existing FK to auth.users
ALTER TABLE memberships 
DROP CONSTRAINT memberships_user_id_fkey;

-- Add FK to profiles instead (profiles.id references auth.users)
ALTER TABLE memberships 
ADD CONSTRAINT memberships_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Also add event_attendance -> profiles FK
ALTER TABLE event_attendance 
DROP CONSTRAINT IF EXISTS event_attendance_user_id_fkey;

ALTER TABLE event_attendance 
ADD CONSTRAINT event_attendance_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;