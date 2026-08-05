/*
# Security Fixes: Views, Functions, and Notifications Policy

## Summary

This migration addresses several security findings:
1. Recreates the `event_summary` view as a SECURITY INVOKER view so it respects RLS
2. Tightens the `notifications` INSERT policy that was always-true (`WITH CHECK (true)`)
3. Revokes EXECUTE on `has_club_role` and `is_admin` from `anon`/PUBLIC so unauthenticated
   users cannot call them, while keeping them callable by `authenticated`

## 1. event_summary View — SECURITY INVOKER

The `event_summary` view was created as a regular (SECURITY DEFINER-style) view,
meaning it ran with its owner's privileges and bypassed row-level security.
Recreated with `security_invoker = true` so it respects the caller's RLS policies.

The view is not currently used by the application frontend, so this change has
no functional impact — it is a hardening fix.

## 2. notifications INSERT Policy — Restrict to Self / Admin / Club Managers

The previous INSERT policy had `WITH CHECK (true)`, meaning any authenticated
user could insert a notification row addressed to ANY other user. This is an
unrestricted write that bypasses row-level security.

The new policy restricts INSERT to:
- The recipient themselves (`user_id = auth.uid()`)
- Admins (`is_admin()`)
- Active club managers (president, vice president, treasurer, secretary, manager)

This covers all legitimate notification-sending flows in the app:
- Self-notifications
- Admin → any user (leave approvals, announcements)
- Club manager → members (membership approvals, leave requests to admins)

A regular member can no longer insert notifications addressed to arbitrary users.

## 3. SECURITY DEFINER Functions — Revoke anon/PUBLIC EXECUTE

`has_club_role` and `is_admin` are SECURITY DEFINER functions that must remain
so to avoid RLS recursion (see migration 004). However, Postgres grants EXECUTE
to PUBLIC by default, and `anon` inherits from PUBLIC — meaning unauthenticated
users could call these functions via the REST API.

Fix: revoke EXECUTE from PUBLIC and anon, grant only to authenticated. Both
functions already guard with `auth.uid()` checks, so authenticated-only access
is the correct posture.

## Important Notes

1. `has_club_role` and `is_admin` remain SECURITY DEFINER by design — switching
   them to SECURITY INVOKER would re-introduce the RLS recursion fixed in
   migration 004. The risk is mitigated by restricting EXECUTE to authenticated
   and the `auth.uid()` guards in the function bodies.
2. The `event_summary` view change requires Postgres 15+ (security_invoker option).
3. Leaked password protection (HaveIBeenPwned) is a dashboard-level Auth setting
   and cannot be toggled via SQL — it must be enabled in the Supabase dashboard
   under Authentication → Email → Prevent Leaked Passwords.
*/

-- ── 1. event_summary view: SECURITY INVOKER ──────────────────────────────

DROP VIEW IF EXISTS event_summary;

CREATE VIEW event_summary WITH (security_invoker = true) AS
SELECT e.id,
    e.club_id,
    c.name AS club_name,
    e.title,
    e.event_type,
    e.start_time,
    e.status,
    count(DISTINCT ea.id) AS total_registrations,
    count(DISTINCT
        CASE
            WHEN (ea.status = 'attended'::text) THEN ea.id
            ELSE NULL::uuid
        END) AS attended_count
   FROM ((events e
     LEFT JOIN clubs c ON ((e.club_id = c.id)))
     LEFT JOIN event_attendance ea ON ((e.id = ea.event_id)))
  GROUP BY e.id, e.club_id, c.name, e.title, e.event_type, e.start_time, e.status;

-- ── 2. notifications INSERT policy ───────────────────────────────────────

DROP POLICY IF EXISTS "authenticated_insert_notifications" ON notifications;

CREATE POLICY "restricted_insert_notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.user_id = auth.uid()
    AND memberships.role IN ('president', 'vice_president', 'treasurer', 'secretary', 'manager')
    AND memberships.status = 'active'
  )
);

-- ── 3. Revoke EXECUTE on SECURITY DEFINER functions from anon/PUBLIC ──────

REVOKE EXECUTE ON FUNCTION public.has_club_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_club_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
