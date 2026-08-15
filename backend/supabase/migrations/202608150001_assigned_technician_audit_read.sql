-- Technicians see audit history for orders they are assigned to, matching the
-- order-scoped authorization used by the other operational tables. Admins and
-- managers keep the existing unrestricted read via "admin manager audit read".
create policy "assigned technician audit read" on public.audit_events
for select to authenticated
using (public.current_role() = 'technician' and public.can_access_order(order_id));
