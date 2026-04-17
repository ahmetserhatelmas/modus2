-- Dosya paylaşımı: private bucket + metadata tablosu + storage.objects RLS
-- Önce 20260417000000_erd_sis.sql uygulanmış olmalı.

insert into
  storage.buckets (id, name, public, file_size_limit)
values
  ('erd-attachments', 'erd-attachments', false, 52428800)
on conflict (id) do
update
set
  file_size_limit = excluded.file_size_limit;

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid (),
  student_id uuid not null references public.students (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  object_path text not null,
  file_name text not null,
  content_type text,
  byte_size bigint,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now (),
  unique (object_path)
);

create index if not exists attachments_student_id_idx on public.attachments (student_id);

create index if not exists attachments_conversation_id_idx on public.attachments (conversation_id);

alter table public.attachments enable row level security;

create policy attachments_select on public.attachments for
select using (public.can_access_student (student_id));

create policy attachments_insert on public.attachments for insert
with
  check (
    public.can_access_student (student_id)
    and created_by = auth.uid ()
    and (
      conversation_id is null
      or exists (
        select 1
        from public.conversations c
        where
          c.id = conversation_id
          and c.student_id = attachments.student_id
      )
    )
  );

create policy attachments_delete on public.attachments for delete using (
  public.can_access_student (student_id)
  and (
    created_by = auth.uid ()
    or exists (
      select 1
      from public.student_members sm
      where
        sm.student_id = attachments.student_id
        and sm.user_id = auth.uid ()
        and sm.role = 'admin'
    )
  )
);

-- storage.objects: yol ilk segmenti = student_id (uuid)
create policy "erd_attachments_select"
on storage.objects for
select using (
  bucket_id = 'erd-attachments'
  and exists (
    select 1
    from public.student_members sm
    where
      sm.user_id = auth.uid ()
      and sm.student_id = split_part(name, '/', 1)::uuid
  )
);

create policy "erd_attachments_insert"
on storage.objects for insert
with
  check (
    bucket_id = 'erd-attachments'
    and exists (
      select 1
      from public.student_members sm
      where
        sm.user_id = auth.uid ()
        and sm.student_id = split_part(name, '/', 1)::uuid
    )
  );

create policy "erd_attachments_update"
on storage.objects for
update using (
  bucket_id = 'erd-attachments'
  and exists (
    select 1
    from public.student_members sm
    where
      sm.user_id = auth.uid ()
      and sm.student_id = split_part(name, '/', 1)::uuid
  )
)
with
  check (
    bucket_id = 'erd-attachments'
    and exists (
      select 1
      from public.student_members sm
      where
        sm.user_id = auth.uid ()
        and sm.student_id = split_part(name, '/', 1)::uuid
    )
  );

create policy "erd_attachments_delete"
on storage.objects for delete using (
  bucket_id = 'erd-attachments'
  and exists (
    select 1
    from public.student_members sm
    where
      sm.user_id = auth.uid ()
      and sm.student_id = split_part(name, '/', 1)::uuid
  )
);

-- Realtime (Dashboard → Database → Replication): messages ve attachments isteğe bağlı açılabilir.
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.attachments;
