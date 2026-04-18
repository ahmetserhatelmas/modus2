-- Vakadan ayrıl (üyelik satırı) ve yönetici için vakayı tamamen silme.

create or replace function public.leave_student_case (p_student_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.member_role;
  v_admins int;
begin
  if auth.uid () is null then
    raise exception 'not authenticated';
  end if;

  select sm.role into v_role
  from public.student_members sm
  where
    sm.student_id = p_student_id
    and sm.user_id = auth.uid ();

  if not found then
    raise exception 'Bu vakanın ekibinde değilsiniz.';
  end if;

  if v_role = 'admin' then
    select count(*)::int into v_admins
    from public.student_members sm2
    where
      sm2.student_id = p_student_id
      and sm2.role = 'admin';

    if v_admins <= 1 then
      raise exception 'Son yönetici olarak listeden ayrılamazsınız. Önce başka yönetici ekleyin veya vakayı tamamen silin.';
    end if;
  end if;

  delete from public.student_members sm
  where
    sm.student_id = p_student_id
    and sm.user_id = auth.uid ();
end;
$$;

revoke all on function public.leave_student_case (uuid) from public;

grant execute on function public.leave_student_case (uuid) to authenticated;

create or replace function public.delete_student_case (p_student_id uuid) returns void
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
    from public.student_members sm
    where
      sm.student_id = p_student_id
      and sm.user_id = auth.uid ()
      and sm.role = 'admin'
  ) then
    raise exception 'Yalnızca vaka yöneticisi tüm vakayı silebilir.';
  end if;

  delete from public.students s
  where s.id = p_student_id;
end;
$$;

revoke all on function public.delete_student_case (uuid) from public;

grant execute on function public.delete_student_case (uuid) to authenticated;
