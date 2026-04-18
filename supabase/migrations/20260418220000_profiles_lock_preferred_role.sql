-- Kayıtta atanan profil rolü / terapist branşı sonradan değiştirilemez (full_name vb. güncellenebilir).

create or replace function public.profiles_enforce_locked_role () returns trigger
set
  search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if new.preferred_role is distinct from old.preferred_role
    or new.preferred_therapist_branch is distinct from old.preferred_therapist_branch then
      raise exception 'Profil rolü kayıt sonrası değiştirilemez.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_lock_preferred_role on public.profiles;

create trigger profiles_lock_preferred_role before
update on public.profiles for each row
execute function public.profiles_enforce_locked_role ();
