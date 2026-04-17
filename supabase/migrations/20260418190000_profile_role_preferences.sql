-- Kullanıcı profilinde "rol tercihi" tutma (kayıtta seçsin, içeriden güncellesin)

alter table public.profiles
add column if not exists preferred_role public.member_role default 'family',
add column if not exists preferred_therapist_branch public.education_branch;

create or replace function public.handle_new_user () returns trigger
set
  search_path = public as $$
begin
  insert into public.profiles (
    id,
    full_name,
    preferred_role,
    preferred_therapist_branch
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(
      (new.raw_user_meta_data ->> 'preferred_role')::public.member_role,
      'family'::public.member_role
    ),
    case
      when new.raw_user_meta_data ->> 'preferred_role' = 'therapist' then
        (new.raw_user_meta_data ->> 'preferred_therapist_branch')::public.education_branch
      else null
    end
  );
  return new;
end;
$$ language plpgsql security definer;
