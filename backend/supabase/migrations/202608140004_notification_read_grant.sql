-- RLS scopes rows; this column grant permits users to acknowledge only the
-- notifications allowed by the existing notification-read update policy.
grant update(read_at) on public.notifications to authenticated;
