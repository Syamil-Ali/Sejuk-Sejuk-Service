-- RLS decides row visibility; authenticated users still need explicit table privileges.
grant select on table
  public.branches,
  public.orders,
  public.service_completions,
  public.service_checklist_templates,
  public.order_checklist_items,
  public.job_evidence,
  public.payments,
  public.schedule_events,
  public.reviews,
  public.notifications,
  public.audit_events,
  public.conversations,
  public.conversation_members,
  public.messages,
  public.message_attachments
to authenticated;
