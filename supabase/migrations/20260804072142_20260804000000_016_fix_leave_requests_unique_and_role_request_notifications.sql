/*
# Fix leave_requests unique constraint and add role request admin notifications

## Problem
1. The `leave_requests` table has a UNIQUE constraint on `(user_id, club_id)` that prevents
   a user from ever submitting a new leave request after a previous one was approved/rejected.
   This means once a manager's leave request is processed, they can never request leave again
   for the same club — the insert fails with a 23505 unique violation.
2. Role requests submitted by members/managers do NOT notify admins. The admin has no way to
   know a role request was submitted unless they manually visit the club detail page.

## Changes

### leave_requests unique constraint
- Drop the existing unconditional UNIQUE constraint `leave_requests_user_id_club_id_key`.
- Add a partial unique index `leave_requests_one_pending_per_user_club` that only prevents
  duplicate PENDING requests for the same (user_id, club_id). Once a request is approved or
  rejected, the user can submit a new leave request for the same club.

### role_requests RLS
- No schema changes to role_requests. The table already exists and supports the flow.
- The frontend will be updated to insert admin notifications when a role request is created.

## Security
- No new tables. RLS on leave_requests and role_requests remains unchanged.
- The partial unique index is safe and does not expose any new data.
*/

-- Drop the old unconditional unique constraint
ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_user_id_club_id_key;

-- Add a partial unique index: only one PENDING leave request per (user_id, club_id) at a time.
-- Once a request is approved or rejected, a new request can be created.
CREATE UNIQUE INDEX IF NOT EXISTS leave_requests_one_pending_per_user_club
  ON leave_requests (user_id, club_id)
  WHERE status = 'pending';