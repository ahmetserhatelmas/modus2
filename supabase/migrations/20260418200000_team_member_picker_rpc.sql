-- Yönetici için kayıtlı kullanıcı listesini role tercihiyle getir
-- ve e-posta yerine user_id ile doğrudan öğrenci ekibine ekle.

create or replace function public.admin_list_addable_profiles (p_student_id uuid)
returns table (
  user_id uuid,
  full_name text,
  preferred_role public.member_role,
  preferred_therapist_branch public.education_branch
)
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
    raise exception 'only student admin can list addable profiles';
  end if;

  return query
  select
    p.id as user_id,
    nullif(trim(p.full_name), '') as full_name,
    coalesce(p.preferred_role, 'family'::public.member_role) as preferred_role,
    p.preferred_therapist_branch
  from public.profiles p
  where
    p.id <> auth.uid ()
    and not exists (
      select 1
      from public.student_members sm2
      where
        sm2.student_id = p_student_id
        and sm2.user_id = p.id
    )
  order by coalesce(nullif(trim(p.full_name), ''), p.id::text);
end;
$$;

revoke all on function public.admin_list_addable_profiles (uuid) from public;
grant execute on function public.admin_list_addable_profiles (uuid) to authenticated;

create or replace function public.admin_add_student_member_by_user_id (
  p_student_id uuid,
  p_user_id uuid,
  p_role public.member_role default null,
  p_therapist_branch public.education_branch default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.member_role;
  v_branch public.education_branch;
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
    raise exception 'only student admin can add members';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  ) then
    raise exception 'selected user not found';
  end if;

  if exists (
    select 1
    from public.student_members x
    where
      x.student_id = p_student_id
      and x.user_id = p_user_id
  ) then
    raise exception 'Kullanıcı zaten bu öğrencinin ekibinde.';
  end if;

  select
    coalesce(p_role, p.preferred_role, 'family'::public.member_role),
    case
      when coalesce(p_role, p.preferred_role, 'family'::public.member_role) = 'therapist' then
        coalesce(p_therapist_branch, p.preferred_therapist_branch)
      else null
    end
  into v_role, v_branch
  from public.profiles p
  where p.id = p_user_id;

  if v_role = 'therapist' and v_branch is null then
    raise exception 'therapist_branch required for therapist role';
  end if;

  insert into public.student_members (student_id, user_id, role, therapist_branch)
  values (p_student_id, p_user_id, v_role, v_branch);
end;
$$;

revoke all on function public.admin_add_student_member_by_user_id (uuid, uuid, public.member_role, public.education_branch) from public;
grant execute on function public.admin_add_student_member_by_user_id (uuid, uuid, public.member_role, public.education_branch) to authenticated;
