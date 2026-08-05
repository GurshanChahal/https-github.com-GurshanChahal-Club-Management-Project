/*
# Fix is_admin and has_club_role for RLS recursion

The is_admin function may be causing issues when called from RLS policies.
Use auth.jwt() to get role directly from JWT claims instead of querying profiles.
*/

-- Update is_admin to check JWT claims directly (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role')::text = 'admin',
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
$$;

-- Also verify has_club_role is correct
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