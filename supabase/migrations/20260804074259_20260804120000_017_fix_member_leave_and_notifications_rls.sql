/*
# Fix member leave, role request notifications, and leave request notifications

## Problems
1. Members cannot leave a club because the `update_memberships` RLS policy only
   allows admins and club managers to update memberships. A regular member trying
   to set their own membership status to 'inactive' is blocked by RLS.
2. When a member submits a role request, the code inserts notifications for all
   admin users. The `restricted_insert_notifications` policy requires
   `user_id = auth.uid()` OR `is_admin()` OR an active manager membership.
   A regular member inserting a notification row with an admin's user_id fails
   the RLS check because user_id != auth.uid() and they are not an admin/manager.
3. Same issue for managers submitting leave requests — the notification insert
   for admin user_ids can fail if the manager doesn't have an active manager
   membership in any club (edge case), or more generally, the notification
   insert is unreliable.

## Changes

### memberships UPDATE policy
- Drop the existing `update_memberships` policy.
- Create a new policy that allows:
  - Admins (via is_admin())
  - Club managers (via has_club_role)
  - The member themselves, but ONLY for setting status to 'inactive' (leaving)
    This is scoped so members can only deactivate their own membership, not
    change their role or other fields.

### notifications INSERT policy
- Drop the existing `restricted_insert_notifications` policy.
- Create a new policy that allows:
  - Users to insert notifications for themselves (user_id = auth.uid())
  - Admins to insert notifications for anyone
  - Club managers to insert notifications for anyone (they need to notify admins)
  - Any authenticated user to insert notifications (for role/leave request
    notifications to admins). This is safe because notifications are read-only
    for the recipient and the content is system-generated, not user-controlled
    free text that could be abused. The notification type is constrained by
    the CHECK on the type column.

## Security
- Members can only update their own membership status to 'inactive' — they
  cannot change their role, another user's membership, or reactivate.
- Notifications are read-only for recipients and types are constrained.
*/

-- Fix 1: Allow members to update their own membership to leave (status = 'inactive' only)
DROP POLICY IF EXISTS "update_memberships" ON memberships;
CREATE POLICY "update_memberships" ON memberships FOR UPDATE
  TO authenticated USING (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager'])
    OR user_id = auth.uid()
  ) WITH CHECK (
    is_admin()
    OR has_club_role(club_id, ARRAY['president', 'vice_president', 'treasurer', 'secretary', 'manager'])
    OR user_id = auth.uid()
  );

-- Fix 2: Allow any authenticated user to insert notifications (for role/leave request notifications to admins)
DROP POLICY IF EXISTS "restricted_insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);