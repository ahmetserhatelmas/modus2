-- Öğrenci oluşturma RPC'sini admin rolüyle sınırla.
-- Böylece client tarafı atlatılsa bile terapist/doktor/aile yeni öğrenci açamaz.

create or replace function public.create_student_for_user (p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  v_role public.member_role;
begin
  if auth.uid () is null then
    raise exception 'not authenticated';
  end if;

  if trim(p_display_name) = '' then
    raise exception 'display name required';
  end if;

  select p.preferred_role
  into v_role
  from public.profiles p
  where p.id = auth.uid ();

  if coalesce(v_role, 'family'::public.member_role) <> 'admin'::public.member_role then
    raise exception 'only admin can create student';
  end if;

  insert into public.students (display_name)
  values (trim(p_display_name))
  returning id into sid;

  insert into public.student_members (student_id, user_id, role)
  values (sid, auth.uid (), 'admin');

  return sid;
end;
$$;
