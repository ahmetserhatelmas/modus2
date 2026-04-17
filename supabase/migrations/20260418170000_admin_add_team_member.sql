-- Yönetici: kayıtlı kullanıcıyı e-posta ile bu öğrencinin ekibine ekler (student_members).
-- Kullanıcı önce Auth ile kayıt olmuş olmalı (aynı e-posta).

create or replace function public.admin_add_student_member (
  p_student_id uuid,
  p_email text,
  p_role public.member_role,
  p_therapist_branch public.education_branch default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_uid uuid;
begin
  if auth.uid () is null then
    raise exception 'not authenticated';
  end if;

  select exists (
    select 1
    from public.student_members sm
    where
      sm.student_id = p_student_id
      and sm.user_id = auth.uid ()
      and sm.role = 'admin'
  )
    into v_ok;

  if not v_ok then
    raise exception 'only student admin can add members';
  end if;

  if p_role = 'therapist' and p_therapist_branch is null then
    raise exception 'therapist_branch required for therapist role';
  end if;

  select id into v_uid
  from auth.users
  where
    lower(email) = lower(trim(p_email));

  if v_uid is null then
    raise exception 'Bu e-posta ile kayıtlı kullanıcı yok. Önce kişinin sitede hesap oluşturması gerekir.';
  end if;

  if exists (
    select 1
    from public.student_members x
    where
      x.student_id = p_student_id
      and x.user_id = v_uid
  ) then
    raise exception 'Kullanıcı zaten bu öğrencinin ekibinde.';
  end if;

  insert into public.student_members (student_id, user_id, role, therapist_branch)
  values (
    p_student_id,
    v_uid,
    p_role,
    case
      when p_role = 'therapist' then p_therapist_branch
      else null
    end
  );
end;
$$;

revoke all on function public.admin_add_student_member (uuid, text, public.member_role, public.education_branch) from public;

grant execute on function public.admin_add_student_member (uuid, text, public.member_role, public.education_branch) to authenticated;
