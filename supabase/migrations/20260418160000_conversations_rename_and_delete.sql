-- Sohbet adı güncelleme (üye olan herkes) + güvenli silme (RPC, mesaj RLS engelini aşar)

create policy conv_u on public.conversations for
update using (
  public.can_access_student (student_id)
  and exists (
    select 1
    from public.conversation_members cm
    where
      cm.conversation_id = conversations.id
      and cm.user_id = auth.uid ()
  )
)
with
  check (
    public.can_access_student (student_id)
    and exists (
      select 1
      from public.conversation_members cm
      where
        cm.conversation_id = conversations.id
        and cm.user_id = auth.uid ()
    )
  );

create or replace function public.delete_conversation_for_user (p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid () is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.conversations c
      join public.conversation_members cm on cm.conversation_id = c.id
    where
      c.id = p_id
      and cm.user_id = auth.uid ()
  ) then
    raise exception 'forbidden';
  end if;

  delete from public.messages
  where conversation_id = p_id;

  delete from public.conversation_members
  where conversation_id = p_id;

  delete from public.conversations
  where id = p_id;
end;
$$;

revoke all on function public.delete_conversation_for_user (uuid) from public;

grant execute on function public.delete_conversation_for_user (uuid) to authenticated;
