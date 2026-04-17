-- Öğrenci oluşturma: INSERT sonrası .select() RLS yüzünden başarısız oluyordu
-- (henüz student_members satırı yok → students_select reddediyor).
-- Bu fonksiyon her iki satırı güvenli biçimde tek transaction’da yazar.

create or replace function public.create_student_for_user (p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
begin
  if auth.uid () is null then
    raise exception 'not authenticated';
  end if;

  if trim(p_display_name) = '' then
    raise exception 'display name required';
  end if;

  insert into public.students (display_name)
  values (trim(p_display_name))
  returning id into sid;

  insert into public.student_members (student_id, user_id, role)
  values (sid, auth.uid (), 'admin');

  return sid;
end;
$$;

revoke all on function public.create_student_for_user (text) from public;

grant execute on function public.create_student_for_user (text) to authenticated;
