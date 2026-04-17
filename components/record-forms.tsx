"use client";

import { createClient } from "@/lib/supabase/client";
import {
  EDUCATION_BRANCH_LABELS,
  MEDICAL_BRANCH_LABELS,
  type EducationBranch,
  type MedicalBranch,
  type MemberRole,
} from "@/lib/labels";
import { useMemo, useState } from "react";

const inp =
  "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500";
const inpSm =
  "rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500";

function ItemActions({
  show,
  onEdit,
  onDelete,
}: {
  show: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!show) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-3 border-t border-neutral-100 pt-2">
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-medium text-blue-600 hover:underline"
      >
        Düzenle
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="text-xs font-medium text-red-600 hover:underline"
      >
        Sil
      </button>
    </div>
  );
}

export function MedicalSection({
  canWrite,
  studentId,
  meds,
  visits,
  notes,
  onSaved,
}: {
  canWrite: boolean;
  studentId: string;
  meds: {
    id: string;
    drug_name: string;
    dose: string | null;
    period_label: string | null;
    start_date: string | null;
    end_date: string | null;
  }[];
  visits: {
    id: string;
    visit_date: string;
    facility: string | null;
    branch: MedicalBranch | null;
  }[];
  notes: { id: string; body: string; is_critical: boolean; created_at: string }[];
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [edMed, setEdMed] = useState<string | null>(null);
  const [edVisit, setEdVisit] = useState<string | null>(null);
  const [edNote, setEdNote] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <Block title="İlaç takibi">
        <ul className="space-y-2 text-sm">
          {meds.map((m) => (
            <li key={m.id} className="rounded-lg border border-neutral-100 px-3 py-2">
              {edMed === m.id ? (
                <form
                  className="mt-1 grid gap-2 sm:grid-cols-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const sd = fd.get("start_date");
                    const ed = fd.get("end_date");
                    await supabase
                      .from("medications")
                      .update({
                        drug_name: String(fd.get("drug_name")),
                        dose: String(fd.get("dose") || ""),
                        period_label: String(fd.get("period_label") || ""),
                        start_date: sd ? String(sd) : null,
                        end_date: ed ? String(ed) : null,
                      })
                      .eq("id", m.id);
                    setEdMed(null);
                    onSaved();
                  }}
                >
                  <input
                    name="drug_name"
                    required
                    defaultValue={m.drug_name}
                    className={inpSm}
                  />
                  <input name="dose" defaultValue={m.dose ?? ""} className={inpSm} />
                  <input
                    name="period_label"
                    defaultValue={m.period_label ?? ""}
                    className={inpSm}
                  />
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={m.start_date ?? ""}
                    className={inpSm}
                  />
                  <input
                    name="end_date"
                    type="date"
                    defaultValue={m.end_date ?? ""}
                    className={inpSm}
                  />
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdMed(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="font-medium">{m.drug_name}</span>
                  {m.dose ? ` · ${m.dose}` : ""}
                  {m.period_label ? ` · ${m.period_label}` : ""}
                  {(m.start_date || m.end_date) && (
                    <span className="text-neutral-500">
                      {" "}
                      ({m.start_date ?? "?"} → {m.end_date ?? "?"})
                    </span>
                  )}
                  <ItemActions
                    show={canWrite}
                    onEdit={() => setEdMed(m.id)}
                    onDelete={() => {
                      if (!confirm("Bu ilacı silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("medications").delete().eq("id", m.id);
                        onSaved();
                      })();
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="mt-4 grid gap-2 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const {
                data: { user },
              } = await supabase.auth.getUser();
              const sd = fd.get("start_date");
              const ed = fd.get("end_date");
              await supabase.from("medications").insert({
                student_id: studentId,
                drug_name: String(fd.get("drug_name")),
                dose: String(fd.get("dose") || ""),
                period_label: String(fd.get("period_label") || ""),
                start_date: sd ? String(sd) : null,
                end_date: ed ? String(ed) : null,
                created_by: user?.id,
              });
              (e.target as HTMLFormElement).reset();
              onSaved();
            }}
          >
            <input name="drug_name" required placeholder="İlaç adı" className={inpSm} />
            <input name="dose" placeholder="Doz" className={inpSm} />
            <input
              name="period_label"
              placeholder="Periyot (sabah/öğle/akşam)"
              className={inpSm}
            />
            <input name="start_date" type="date" className={inpSm} />
            <input name="end_date" type="date" className={inpSm} />
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white sm:col-span-2"
            >
              İlaç ekle
            </button>
          </form>
        )}
      </Block>

      <Block title="Doktor muayenesi">
        <ul className="space-y-2 text-sm">
          {visits.map((v) => (
            <li key={v.id} className="rounded-lg border border-neutral-100 px-3 py-2">
              {edVisit === v.id ? (
                <form
                  className="mt-1 grid gap-2 sm:grid-cols-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    await supabase
                      .from("medical_visits")
                      .update({
                        visit_date: String(fd.get("visit_date")),
                        facility: String(fd.get("facility") || ""),
                        branch: (fd.get("branch") as string) || null,
                      })
                      .eq("id", v.id);
                    setEdVisit(null);
                    onSaved();
                  }}
                >
                  <input
                    name="visit_date"
                    type="date"
                    required
                    defaultValue={v.visit_date}
                    className={inpSm}
                  />
                  <input
                    name="facility"
                    defaultValue={v.facility ?? ""}
                    placeholder="Hastane / klinik"
                    className={inpSm}
                  />
                  <select
                    name="branch"
                    defaultValue={v.branch ?? ""}
                    className={`${inpSm} sm:col-span-2`}
                  >
                    <option value="">Branş</option>
                    {(Object.keys(MEDICAL_BRANCH_LABELS) as MedicalBranch[]).map((b) => (
                      <option key={b} value={b}>
                        {MEDICAL_BRANCH_LABELS[b]}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdVisit(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {v.visit_date}
                  {v.facility ? ` · ${v.facility}` : ""}
                  {v.branch ? ` · ${MEDICAL_BRANCH_LABELS[v.branch]}` : ""}
                  <ItemActions
                    show={canWrite}
                    onEdit={() => setEdVisit(v.id)}
                    onDelete={() => {
                      if (!confirm("Bu muayeneyi silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("medical_visits").delete().eq("id", v.id);
                        onSaved();
                      })();
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="mt-4 grid gap-2 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await supabase.from("medical_visits").insert({
                student_id: studentId,
                visit_date: String(fd.get("visit_date")),
                facility: String(fd.get("facility") || ""),
                branch: (fd.get("branch") as string) || null,
                created_by: user?.id,
              });
              (e.target as HTMLFormElement).reset();
              onSaved();
            }}
          >
            <input name="visit_date" type="date" required className={inpSm} />
            <input name="facility" placeholder="Hastane / klinik" className={inpSm} />
            <select name="branch" className={`${inpSm} sm:col-span-2`}>
              <option value="">Branş</option>
              {(Object.keys(MEDICAL_BRANCH_LABELS) as MedicalBranch[]).map((b) => (
                <option key={b} value={b}>
                  {MEDICAL_BRANCH_LABELS[b]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white sm:col-span-2"
            >
              Muayene ekle
            </button>
          </form>
        )}
      </Block>

      <Block title="Doktor notları">
        <ul className="space-y-2 text-sm">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border px-3 py-2 ${
                n.is_critical ? "border-red-200 bg-red-50" : "border-neutral-100"
              }`}
            >
              {edNote === n.id ? (
                <form
                  className="mt-1 space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    await supabase
                      .from("medical_notes")
                      .update({
                        body: String(fd.get("body")),
                        is_critical: fd.get("is_critical") === "on",
                      })
                      .eq("id", n.id);
                    setEdNote(null);
                    onSaved();
                  }}
                >
                  <textarea
                    name="body"
                    required
                    rows={3}
                    defaultValue={n.body}
                    className={inp}
                  />
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      name="is_critical"
                      defaultChecked={n.is_critical}
                    />{" "}
                    Kritik uyarı
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdNote(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {n.body}
                  <ItemActions
                    show={canWrite}
                    onEdit={() => setEdNote(n.id)}
                    onDelete={() => {
                      if (!confirm("Bu notu silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("medical_notes").delete().eq("id", n.id);
                        onSaved();
                      })();
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="mt-4 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await supabase.from("medical_notes").insert({
                student_id: studentId,
                body: String(fd.get("body")),
                is_critical: fd.get("is_critical") === "on",
                created_by: user?.id,
              });
              (e.target as HTMLFormElement).reset();
              onSaved();
            }}
          >
            <textarea name="body" required rows={3} className={inp} />
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="is_critical" /> Kritik uyarı
            </label>
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              Not ekle
            </button>
          </form>
        )}
      </Block>
    </div>
  );
}

export function EducationSection({
  canWrite,
  writeBranch,
  studentId,
  daily,
  goals,
  skills,
  reports,
  onSaved,
}: {
  canWrite: boolean;
  writeBranch: EducationBranch | null;
  studentId: string;
  daily: {
    id: string;
    branch: EducationBranch;
    entry_date: string;
    summary: string;
  }[];
  goals: {
    id: string;
    branch: EducationBranch;
    title: string;
    description: string | null;
  }[];
  skills: {
    id: string;
    branch: EducationBranch;
    skill_name: string;
    completed_on: string | null;
  }[];
  reports: {
    id: string;
    branch: EducationBranch;
    period_label: string | null;
    body: string;
  }[];
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const branches = Object.keys(EDUCATION_BRANCH_LABELS) as EducationBranch[];
  const [edDaily, setEdDaily] = useState<string | null>(null);
  const [edGoal, setEdGoal] = useState<string | null>(null);
  const [edSkill, setEdSkill] = useState<string | null>(null);
  const [edRep, setEdRep] = useState<string | null>(null);

  function canWriteBranch(b: EducationBranch) {
    if (!canWrite) return false;
    if (writeBranch === null) return true;
    return writeBranch === b;
  }

  return (
    <div className="space-y-8">
      <Block title="Günlük veri formu">
        <ul className="space-y-2 text-sm">
          {daily.map((d) => (
            <li key={d.id} className="rounded-lg border border-neutral-100 px-3 py-2">
              {edDaily === d.id ? (
                <form
                  className="mt-1 space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const br =
                      (fd.get("branch") as EducationBranch) || d.branch;
                    if (!canWriteBranch(br)) return;
                    await supabase
                      .from("education_daily")
                      .update({
                        branch: br,
                        entry_date: String(fd.get("entry_date")),
                        summary: String(fd.get("summary")),
                      })
                      .eq("id", d.id);
                    setEdDaily(null);
                    onSaved();
                  }}
                >
                  {writeBranch === null ? (
                    <select
                      name="branch"
                      required
                      defaultValue={d.branch}
                      className={inp}
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {EDUCATION_BRANCH_LABELS[b]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="hidden" name="branch" value={d.branch} />
                  )}
                  <input
                    name="entry_date"
                    type="date"
                    required
                    defaultValue={d.entry_date}
                    className={inp}
                  />
                  <textarea
                    name="summary"
                    required
                    rows={3}
                    defaultValue={d.summary}
                    className={inp}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdDaily(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="text-neutral-500">
                    {EDUCATION_BRANCH_LABELS[d.branch]} · {d.entry_date}
                  </span>
                  <p>{d.summary}</p>
                  <ItemActions
                    show={canWriteBranch(d.branch)}
                    onEdit={() => setEdDaily(d.id)}
                    onDelete={() => {
                      if (!confirm("Bu kaydı silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("education_daily").delete().eq("id", d.id);
                        onSaved();
                      })();
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="mt-4 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const branch = (fd.get("branch") as EducationBranch) || writeBranch;
              if (!branch) return;
              if (!canWriteBranch(branch)) return;
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await supabase.from("education_daily").insert({
                student_id: studentId,
                branch,
                summary: String(fd.get("summary")),
                created_by: user?.id,
              });
              (e.target as HTMLFormElement).reset();
              onSaved();
            }}
          >
            {writeBranch === null ? (
              <select name="branch" required className={inp}>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {EDUCATION_BRANCH_LABELS[b]}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="branch" value={writeBranch} />
            )}
            <textarea name="summary" required rows={3} className={inp} />
            <button
              type="submit"
              disabled={!canWrite}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Kaydet
            </button>
          </form>
        )}
      </Block>

      <Block title="Yıllık hedefler (BEP)">
        <ul className="space-y-2 text-sm">
          {goals.map((g) => (
            <li key={g.id} className="rounded-lg border border-neutral-100 px-3 py-2">
              {edGoal === g.id ? (
                <form
                  className="mt-1 space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const br =
                      (fd.get("branch") as EducationBranch) || g.branch;
                    if (!canWriteBranch(br)) return;
                    await supabase
                      .from("education_goals")
                      .update({
                        branch: br,
                        title: String(fd.get("title")),
                        description: String(fd.get("description") || "") || null,
                      })
                      .eq("id", g.id);
                    setEdGoal(null);
                    onSaved();
                  }}
                >
                  {writeBranch === null ? (
                    <select
                      name="branch"
                      required
                      defaultValue={g.branch}
                      className={inp}
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {EDUCATION_BRANCH_LABELS[b]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="hidden" name="branch" value={g.branch} />
                  )}
                  <input
                    name="title"
                    required
                    defaultValue={g.title}
                    className={inp}
                  />
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={g.description ?? ""}
                    className={inp}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdGoal(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="text-neutral-500">
                    {EDUCATION_BRANCH_LABELS[g.branch]}
                  </span>
                  <p className="font-medium">{g.title}</p>
                  {g.description && <p className="text-neutral-600">{g.description}</p>}
                  <ItemActions
                    show={canWriteBranch(g.branch)}
                    onEdit={() => setEdGoal(g.id)}
                    onDelete={() => {
                      if (!confirm("Bu hedefi silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("education_goals").delete().eq("id", g.id);
                        onSaved();
                      })();
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="mt-4 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const branch = (fd.get("branch") as EducationBranch) || writeBranch;
              if (!branch || !canWriteBranch(branch)) return;
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await supabase.from("education_goals").insert({
                student_id: studentId,
                branch,
                title: String(fd.get("title")),
                description: String(fd.get("description") || ""),
                created_by: user?.id,
              });
              (e.target as HTMLFormElement).reset();
              onSaved();
            }}
          >
            {writeBranch === null ? (
              <select name="branch" required className={inp}>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {EDUCATION_BRANCH_LABELS[b]}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="branch" value={writeBranch} />
            )}
            <input name="title" required placeholder="Hedef başlığı" className={inp} />
            <textarea name="description" rows={2} placeholder="Açıklama" className={inp} />
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              Hedef ekle
            </button>
          </form>
        )}
      </Block>

      <Block title="Biten beceriler">
        <ul className="space-y-2 text-sm">
          {skills.map((s) => (
            <li key={s.id} className="rounded-lg border border-neutral-100 px-3 py-2">
              {edSkill === s.id ? (
                <form
                  className="mt-1 grid gap-2 sm:grid-cols-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const br =
                      (fd.get("branch") as EducationBranch) || s.branch;
                    if (!canWriteBranch(br)) return;
                    await supabase
                      .from("education_skills")
                      .update({
                        branch: br,
                        skill_name: String(fd.get("skill_name")),
                        completed_on: String(
                          fd.get("completed_on") ||
                            new Date().toISOString().slice(0, 10),
                        ),
                      })
                      .eq("id", s.id);
                    setEdSkill(null);
                    onSaved();
                  }}
                >
                  {writeBranch === null ? (
                    <select
                      name="branch"
                      required
                      defaultValue={s.branch}
                      className={`${inpSm} sm:col-span-2`}
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {EDUCATION_BRANCH_LABELS[b]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="hidden" name="branch" value={s.branch} />
                  )}
                  <input
                    name="skill_name"
                    required
                    defaultValue={s.skill_name}
                    className={inpSm}
                  />
                  <input
                    name="completed_on"
                    type="date"
                    defaultValue={s.completed_on ?? ""}
                    className={inpSm}
                  />
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdSkill(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {EDUCATION_BRANCH_LABELS[s.branch]} · {s.skill_name}{" "}
                  <span className="text-neutral-400">({s.completed_on})</span>
                  <ItemActions
                    show={canWriteBranch(s.branch)}
                    onEdit={() => setEdSkill(s.id)}
                    onDelete={() => {
                      if (!confirm("Bu beceriyi silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("education_skills").delete().eq("id", s.id);
                        onSaved();
                      })();
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="mt-4 grid gap-2 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const branch = (fd.get("branch") as EducationBranch) || writeBranch;
              if (!branch || !canWriteBranch(branch)) return;
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await supabase.from("education_skills").insert({
                student_id: studentId,
                branch,
                skill_name: String(fd.get("skill_name")),
                completed_on: String(
                  fd.get("completed_on") ||
                    new Date().toISOString().slice(0, 10),
                ),
                created_by: user?.id,
              });
              (e.target as HTMLFormElement).reset();
              onSaved();
            }}
          >
            {writeBranch === null ? (
              <select name="branch" required className={`${inpSm} sm:col-span-2`}>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {EDUCATION_BRANCH_LABELS[b]}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="branch" value={writeBranch} />
            )}
            <input name="skill_name" required placeholder="Beceri" className={inpSm} />
            <input name="completed_on" type="date" className={inpSm} />
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white sm:col-span-2"
            >
              Beceri ekle
            </button>
          </form>
        )}
      </Block>

      <Block title="Rapor ve notlar">
        <ul className="space-y-2 text-sm">
          {reports.map((r) => (
            <li key={r.id} className="rounded-lg border border-neutral-100 px-3 py-2">
              {edRep === r.id ? (
                <form
                  className="mt-1 space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const br =
                      (fd.get("branch") as EducationBranch) || r.branch;
                    if (!canWriteBranch(br)) return;
                    await supabase
                      .from("education_reports")
                      .update({
                        branch: br,
                        period_label: String(fd.get("period_label") || "") || null,
                        body: String(fd.get("body")),
                      })
                      .eq("id", r.id);
                    setEdRep(null);
                    onSaved();
                  }}
                >
                  {writeBranch === null ? (
                    <select
                      name="branch"
                      required
                      defaultValue={r.branch}
                      className={inp}
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {EDUCATION_BRANCH_LABELS[b]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="hidden" name="branch" value={r.branch} />
                  )}
                  <input
                    name="period_label"
                    defaultValue={r.period_label ?? ""}
                    placeholder="Haftalık / aylık"
                    className={inp}
                  />
                  <textarea
                    name="body"
                    required
                    rows={3}
                    defaultValue={r.body}
                    className={inp}
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                    >
                      Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdRep(null)}
                      className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span className="text-neutral-500">
                    {EDUCATION_BRANCH_LABELS[r.branch]}
                    {r.period_label ? ` · ${r.period_label}` : ""}
                  </span>
                  <p>{r.body}</p>
                  <ItemActions
                    show={canWriteBranch(r.branch)}
                    onEdit={() => setEdRep(r.id)}
                    onDelete={() => {
                      if (!confirm("Bu raporu silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("education_reports").delete().eq("id", r.id);
                        onSaved();
                      })();
                    }}
                  />
                </>
              )}
            </li>
          ))}
        </ul>
        {canWrite && (
          <form
            className="mt-4 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const branch = (fd.get("branch") as EducationBranch) || writeBranch;
              if (!branch || !canWriteBranch(branch)) return;
              const {
                data: { user },
              } = await supabase.auth.getUser();
              await supabase.from("education_reports").insert({
                student_id: studentId,
                branch,
                period_label: String(fd.get("period_label") || ""),
                body: String(fd.get("body")),
                created_by: user?.id,
              });
              (e.target as HTMLFormElement).reset();
              onSaved();
            }}
          >
            {writeBranch === null ? (
              <select name="branch" required className={inp}>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {EDUCATION_BRANCH_LABELS[b]}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="branch" value={writeBranch} />
            )}
            <input
              name="period_label"
              placeholder="Haftalık / aylık"
              className={inp}
            />
            <textarea name="body" required rows={3} className={inp} />
            <button
              type="submit"
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
            >
              Rapor ekle
            </button>
          </form>
        )}
      </Block>
    </div>
  );
}

export function FamilySection({
  canWrite,
  studentId,
  notes,
  onSaved,
}: {
  canWrite: boolean;
  studentId: string;
  notes: { id: string; body: string; created_at: string }[];
  onSaved: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [edId, setEdId] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-900">Aile notları</h3>
      <ul className="mt-2 space-y-2 text-sm">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-neutral-100 px-3 py-2">
            {edId === n.id ? (
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await supabase
                    .from("family_notes")
                    .update({ body: String(fd.get("body")) })
                    .eq("id", n.id);
                  setEdId(null);
                  onSaved();
                }}
              >
                <textarea
                  name="body"
                  required
                  rows={3}
                  defaultValue={n.body}
                  className={inp}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdId(null)}
                    className="rounded-lg border border-neutral-200 px-3 py-2 text-xs"
                  >
                    İptal
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-xs text-neutral-400">
                  {new Date(n.created_at).toLocaleString("tr-TR")}
                </p>
                <p>{n.body}</p>
                <ItemActions
                  show={canWrite}
                  onEdit={() => setEdId(n.id)}
                  onDelete={() => {
                    if (!confirm("Bu notu silmek istiyor musunuz?")) return;
                    void (async () => {
                      await supabase.from("family_notes").delete().eq("id", n.id);
                      onSaved();
                    })();
                  }}
                />
              </>
            )}
          </li>
        ))}
      </ul>
      {canWrite && (
        <form
          className="mt-4 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const {
              data: { user },
            } = await supabase.auth.getUser();
            await supabase.from("family_notes").insert({
              student_id: studentId,
              body: String(fd.get("body")),
              created_by: user?.id,
            });
            (e.target as HTMLFormElement).reset();
            onSaved();
          }}
        >
          <textarea name="body" required rows={3} className={inp} />
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            Paylaş
          </button>
        </form>
      )}
    </div>
  );
}

export function ChatPanel({
  activeConv,
  messages,
  onSend,
  currentUserId,
  onMessagesMutated,
  members,
}: {
  activeConv: string | null;
  messages: { id: string; body: string; created_at: string; user_id: string }[];
  onSend: (body: string) => void;
  currentUserId: string | null;
  onMessagesMutated: () => void;
  members: { user_id: string; full_name: string; role: MemberRole }[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [draft, setDraft] = useState("");
  const [edMsg, setEdMsg] = useState<string | null>(null);

  if (!activeConv) {
    return (
      <p className="text-sm text-neutral-600">
        Soldan bir sohbet seçin veya vaka grubu oluşturun.
      </p>
    );
  }

  return (
    <div className="flex min-h-[280px] flex-col rounded-xl border border-neutral-200 bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg bg-neutral-50 px-3 py-2">
            {(() => {
              const sender = members.find((x) => x.user_id === m.user_id);
              const roleLabel = sender
                ? sender.role === "family"
                  ? "Aile"
                  : sender.role === "doctor"
                    ? "Doktor"
                    : sender.role === "therapist"
                      ? "Terapist"
                      : "Yönetici"
                : "Kullanıcı";
              return (
                <p className="text-xs font-medium text-neutral-700">
                  {sender?.full_name ?? `${m.user_id.slice(0, 8)}…`} ({roleLabel})
                </p>
              );
            })()}
            <p className="text-xs text-neutral-400">
              {new Date(m.created_at).toLocaleString("tr-TR")}
            </p>
            {edMsg === m.id ? (
              <form
                className="mt-1 space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  await supabase
                    .from("messages")
                    .update({ body: String(fd.get("body")) })
                    .eq("id", m.id);
                  setEdMsg(null);
                  onMessagesMutated();
                }}
              >
                <textarea
                  name="body"
                  required
                  rows={2}
                  defaultValue={m.body}
                  className={inp}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-900 px-2 py-1 text-xs text-white"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdMsg(null)}
                    className="rounded-lg border border-neutral-200 px-2 py-1 text-xs"
                  >
                    İptal
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p className="text-neutral-800">{m.body}</p>
                {currentUserId === m.user_id && (
                  <ItemActions
                    show
                    onEdit={() => setEdMsg(m.id)}
                    onDelete={() => {
                      if (!confirm("Bu mesajı silmek istiyor musunuz?")) return;
                      void (async () => {
                        await supabase.from("messages").delete().eq("id", m.id);
                        onMessagesMutated();
                      })();
                    }}
                  />
                )}
              </>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-neutral-500">Henüz mesaj yok.</p>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-neutral-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) onSend(draft);
          setDraft("");
        }}
      >
        <input
          className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mesaj yazın…"
        />
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
