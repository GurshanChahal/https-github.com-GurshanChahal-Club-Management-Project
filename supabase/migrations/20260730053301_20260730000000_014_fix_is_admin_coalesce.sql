/*
# Fix is_admin() COALESCE Bug

## Problem
The `is_admin()` helper function used `COALESCE` to combine two checks:
  COALESCE(
    (auth.jwt() ->> 'role')::text = 'admin',
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )

`COALESCE` only falls through on NULL, not FALSE. The first expression
evaluates to FALSE (not NULL) for every anon-key client because the JWT
`role` claim is `authenticated`, not `admin`. So COALESCE(FALSE, ...)
always returns FALSE and the profiles lookup never runs.

This silently blocked every admin action gated by `is_admin()` — including
updating another user's role from the User Management page. The update
failed RLS, the error was swallowed in the client, and the role never
changed (it stayed at the default `member`).

## Fix
Replace `COALESCE` with `OR` so both checks are evaluated:
  (auth.jwt() ->> 'role')::text = 'admin'
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')

The function remains SECURITY DEFINER with a locked search_path so the
inner profiles query bypasses RLS (no recursion risk).

## Tables/Functions Modified
- `public.is_admin()` — logic fix only, no signature change.
- No data changes.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT (auth.jwt() ->> 'role')::text = 'admin'
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;
