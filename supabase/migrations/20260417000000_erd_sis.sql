-- ERD-SİS: Eğitsel ve Rehabilitasyon Denetim-Sistemleri
-- Run in Supabase SQL Editor or: supabase db push (linked project)

-- Types
create type public.member_role as enum ('admin', 'doctor', 'therapist', 'family');
create type public.medical_branch as enum (
  'child_psychiatry',
  'gastroenterology',
  'ent',
  'neurology',
  'dental',
  'internal',
  'genetics'
);
create type public.education_branch as enum (
  'ergotherapy',
  'special_education',
  'dkt',
  'inclusion',
  'shadow_teacher',
  'movement_education',
  'swimming'
);

-- Profiles (1:1 auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid (),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.student_members (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  therapist_branch public.education_branch,
  unique (student_id, user_id),
  constraint therapist_branch_when_therapist check (
    role <> 'therapist'
    or therapist_branch is not null
  )
);

create table public.medications (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  drug_name text not null,
  dose text,
  period_label text,
  start_date date,
  end_date date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.medical_visits (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  visit_date date not null,
  facility text,
  branch public.medical_branch,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.medical_notes (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null,
  is_critical boolean not null default false,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.education_daily (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  branch public.education_branch not null,
  entry_date date not null default (current_date),
  summary text not null default '',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.education_goals (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  branch public.education_branch not null,
  title text not null,
  description text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.education_skills (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  branch public.education_branch not null,
  skill_name text not null,
  completed_on date not null default (current_date),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.education_reports (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  branch public.education_branch not null,
  period_label text,
  body text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.family_notes (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  body text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  is_group boolean not null default false,
  title text,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid (),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- Realtime (optional): alter publication supabase_realtime add table messages;

-- New user → profile
create or replace function public.handle_new_user () returns trigger
set
  search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users for each row
execute function public.handle_new_user ();

-- RLS
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.student_members enable row level security;
alter table public.medications enable row level security;
alter table public.medical_visits enable row level security;
alter table public.medical_notes enable row level security;
alter table public.education_daily enable row level security;
alter table public.education_goals enable row level security;
alter table public.education_skills enable row level security;
alter table public.education_reports enable row level security;
alter table public.family_notes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Helper: user can access student
create or replace function public.can_access_student (sid uuid) returns boolean
set
  search_path = public as $$
  select exists (
    select 1
    from public.student_members sm
    where
      sm.student_id = sid
      and sm.user_id = auth.uid ()
  );
$$ language sql stable security definer;

create or replace function public.student_role (sid uuid) returns public.member_role
set
  search_path = public as $$
  select sm.role
  from public.student_members sm
  where
    sm.student_id = sid
    and sm.user_id = auth.uid ()
  limit 1;
$$ language sql stable security definer;

create or replace function public.my_therapist_branch (sid uuid) returns public.education_branch
set
  search_path = public as $$
  select sm.therapist_branch
  from public.student_members sm
  where
    sm.student_id = sid
    and sm.user_id = auth.uid ()
    and sm.role = 'therapist'
  limit 1;
$$ language sql stable security definer;

-- profiles
create policy profiles_select on public.profiles for
select using (
  id = auth.uid ()
  or exists (
    select 1
    from public.student_members sm1
      join public.student_members sm2 on sm1.student_id = sm2.student_id
    where
      sm1.user_id = auth.uid ()
      and sm2.user_id = profiles.id
  )
);

create policy profiles_update_own on public.profiles for
update using (id = auth.uid ())
with
  check (id = auth.uid ());

-- students
create policy students_select on public.students for
select using (public.can_access_student (id));

create policy students_insert on public.students for insert
with
  check (auth.uid () is not null);

-- student_members
create policy sm_select on public.student_members for
select using (public.can_access_student (student_id));

create policy sm_insert on public.student_members for insert
with
  check (
    user_id = auth.uid ()
    and (
      (
        role = 'admin'
        and not exists (
          select 1
          from public.student_members x
          where
            x.student_id = student_members.student_id
        )
      )
      or exists (
        select 1
        from public.student_members me
        where
          me.student_id = student_members.student_id
          and me.user_id = auth.uid ()
          and me.role = 'admin'
      )
    )
  );

create policy sm_delete on public.student_members for delete using (
  exists (
    select 1
    from public.student_members me
    where
      me.student_id = student_members.student_id
      and me.user_id = auth.uid ()
      and me.role = 'admin'
  )
);

-- medical: read all members; write doctor/admin
create policy med_rx on public.medications for
select using (public.can_access_student (student_id));

create policy med_w on public.medications for insert
with
  check (
    public.can_access_student (student_id)
    and public.student_role (student_id) in ('admin', 'doctor')
  );

create policy med_u on public.medications for
update using (
  public.can_access_student (student_id)
  and public.student_role (student_id) in ('admin', 'doctor')
)
with
  check (
    public.can_access_student (student_id)
    and public.student_role (student_id) in ('admin', 'doctor')
  );

create policy med_d on public.medications for delete using (
  public.can_access_student (student_id)
  and public.student_role (student_id) in ('admin', 'doctor')
);

create policy mv_rx on public.medical_visits for
select using (public.can_access_student (student_id));

create policy mv_w on public.medical_visits for insert
with
  check (
    public.can_access_student (student_id)
    and public.student_role (student_id) in ('admin', 'doctor')
  );

create policy mv_u on public.medical_visits for
update using (
  public.can_access_student (student_id)
  and public.student_role (student_id) in ('admin', 'doctor')
)
with
  check (
    public.can_access_student (student_id)
    and public.student_role (student_id) in ('admin', 'doctor')
  );

create policy mv_d on public.medical_visits for delete using (
  public.can_access_student (student_id)
  and public.student_role (student_id) in ('admin', 'doctor')
);

create policy mn_rx on public.medical_notes for
select using (public.can_access_student (student_id));

create policy mn_w on public.medical_notes for insert
with
  check (
    public.can_access_student (student_id)
    and public.student_role (student_id) in ('admin', 'doctor')
  );

create policy mn_u on public.medical_notes for
update using (
  public.can_access_student (student_id)
  and public.student_role (student_id) in ('admin', 'doctor')
)
with
  check (
    public.can_access_student (student_id)
    and public.student_role (student_id) in ('admin', 'doctor')
  );

create policy mn_d on public.medical_notes for delete using (
  public.can_access_student (student_id)
  and public.student_role (student_id) in ('admin', 'doctor')
);

-- education: read all members; write therapist own branch or admin; family → family_notes only
create policy ed_daily_rx on public.education_daily for
select using (public.can_access_student (student_id));

create policy ed_daily_w on public.education_daily for insert
with
  check (
    public.can_access_student (student_id)
    and (
      public.student_role (student_id) = 'admin'
      or (
        public.student_role (student_id) = 'therapist'
        and branch = public.my_therapist_branch (student_id)
      )
    )
  );

create policy ed_goals_rx on public.education_goals for
select using (public.can_access_student (student_id));

create policy ed_goals_w on public.education_goals for insert
with
  check (
    public.can_access_student (student_id)
    and (
      public.student_role (student_id) = 'admin'
      or (
        public.student_role (student_id) = 'therapist'
        and branch = public.my_therapist_branch (student_id)
      )
    )
  );

create policy ed_skills_rx on public.education_skills for
select using (public.can_access_student (student_id));

create policy ed_skills_w on public.education_skills for insert
with
  check (
    public.can_access_student (student_id)
    and (
      public.student_role (student_id) = 'admin'
      or (
        public.student_role (student_id) = 'therapist'
        and branch = public.my_therapist_branch (student_id)
      )
    )
  );

create policy ed_rep_rx on public.education_reports for
select using (public.can_access_student (student_id));

create policy ed_rep_w on public.education_reports for insert
with
  check (
    public.can_access_student (student_id)
    and (
      public.student_role (student_id) = 'admin'
      or (
        public.student_role (student_id) = 'therapist'
        and branch = public.my_therapist_branch (student_id)
      )
    )
  );

-- family notes
create policy fn_rx on public.family_notes for
select using (public.can_access_student (student_id));

create policy fn_w on public.family_notes for insert
with
  check (
    public.can_access_student (student_id)
    and public.student_role (student_id) in ('admin', 'family')
  );

-- messaging: members of student
create policy conv_rx on public.conversations for
select using (public.can_access_student (student_id));

create policy conv_w on public.conversations for insert
with
  check (public.can_access_student (student_id));

create policy cm_rx on public.conversation_members for
select using (
  exists (
    select 1
    from public.conversations c
    where
      c.id = conversation_members.conversation_id
      and public.can_access_student (c.student_id)
  )
);

create policy cm_w on public.conversation_members for insert
with
  check (
    exists (
      select 1
      from public.conversations c
      where
        c.id = conversation_members.conversation_id
        and public.can_access_student (c.student_id)
    )
  );

create policy msg_rx on public.messages for
select using (
  exists (
    select 1
    from public.conversations c
    where
      c.id = messages.conversation_id
      and public.can_access_student (c.student_id)
  )
);

create policy msg_w on public.messages for insert
with
  check (
    user_id = auth.uid ()
    and exists (
      select 1
      from public.conversations c
      where
        c.id = messages.conversation_id
        and public.can_access_student (c.student_id)
    )
  );
