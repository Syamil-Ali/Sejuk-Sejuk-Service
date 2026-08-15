-- Delivery status storage for pluggable WhatsApp providers (Meta Cloud API,
-- Twilio, console, etc.). Sends are recorded by the server; provider webhooks
-- upsert the message status. Managers/admins can read status; service-role
-- writes bypass RLS through explicit grants.

create table public.whatsapp_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  recipient_phone text not null,
  provider text not null check (provider in ('meta', 'twilio', 'console')),
  message_id text,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index whatsapp_deliveries_message_idx
  on public.whatsapp_deliveries(provider, message_id)
  where message_id is not null;

alter table public.whatsapp_deliveries enable row level security;

create policy "admin manager whatsapp delivery read" on public.whatsapp_deliveries
for select to authenticated using (public.current_role() in ('admin', 'manager'));

grant select on table public.whatsapp_deliveries to authenticated;
grant select, insert, update on table public.whatsapp_deliveries to service_role;
