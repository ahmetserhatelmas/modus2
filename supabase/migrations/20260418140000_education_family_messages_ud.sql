-- Güncelleme / silme RLS: eğitim tabloları, aile notları, mesajlar
-- (Tıbbi tablolarda med_u / med_d vb. zaten vardı.)

-- education_daily
create policy ed_daily_u on public.education_daily for
update using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
)
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

create policy ed_daily_d on public.education_daily for delete using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
);

-- education_goals
create policy ed_goals_u on public.education_goals for
update using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
)
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

create policy ed_goals_d on public.education_goals for delete using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
);

-- education_skills
create policy ed_skills_u on public.education_skills for
update using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
)
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

create policy ed_skills_d on public.education_skills for delete using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
);

-- education_reports
create policy ed_rep_u on public.education_reports for
update using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
)
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

create policy ed_rep_d on public.education_reports for delete using (
  public.can_access_student (student_id)
  and (
    public.student_role (student_id) = 'admin'
    or (
      public.student_role (student_id) = 'therapist'
      and branch = public.my_therapist_branch (student_id)
    )
  )
);

-- family_notes: kendi notu veya admin
create policy fn_u on public.family_notes for
update using (
  public.can_access_student (student_id)
  and (
    created_by = auth.uid ()
    or exists (
      select 1
      from public.student_members sm
      where
        sm.student_id = family_notes.student_id
        and sm.user_id = auth.uid ()
        and sm.role = 'admin'
    )
  )
)
with
  check (
    public.can_access_student (student_id)
    and (
      created_by = auth.uid ()
      or exists (
        select 1
        from public.student_members sm
        where
          sm.student_id = family_notes.student_id
          and sm.user_id = auth.uid ()
          and sm.role = 'admin'
      )
    )
  );

create policy fn_d on public.family_notes for delete using (
  public.can_access_student (student_id)
  and (
    created_by = auth.uid ()
    or exists (
      select 1
      from public.student_members sm
      where
        sm.student_id = family_notes.student_id
        and sm.user_id = auth.uid ()
        and sm.role = 'admin'
    )
  )
);

-- messages: yalnızca kendi mesajı
create policy msg_u on public.messages for
update using (
  user_id = auth.uid ()
  and exists (
    select 1
    from public.conversations c
    where
      c.id = messages.conversation_id
      and public.can_access_student (c.student_id)
  )
)
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

create policy msg_d on public.messages for delete using (
  user_id = auth.uid ()
  and exists (
    select 1
    from public.conversations c
    where
      c.id = messages.conversation_id
      and public.can_access_student (c.student_id)
  )
);
