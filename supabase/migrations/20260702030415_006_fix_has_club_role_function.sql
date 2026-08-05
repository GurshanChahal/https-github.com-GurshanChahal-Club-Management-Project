/*
# Fix has_club_role function to check membership status

The has_club_role function was not checking if the membership is active,
so managers with active memberships were not being recognized properly.
*/

-- Update the has_club_role function to check for active status
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
    AND status = 'active'
  );
$$;

-- Also add a function for managers to see pending memberships in their clubs
-- This allows managers to see pending requests for clubs they manage
DROP POLICY IF EXISTS "managers_view_club_memberships" ON memberships;

CREATE POLICY "managers_view_all_club_memberships" ON memberships FOR SELECT
  TO authenticated USING (has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager']));