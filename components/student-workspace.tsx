"use client";

import { createClient } from "@/lib/supabase/client";
import {
  EDUCATION_BRANCHES,
  EDUCATION_BRANCH_LABELS,
  ROLE_LABELS,
  type EducationBranch,
  type MedicalBranch,
  type MemberRole,
} from "@/lib/labels";
import { ChatFiles, type AttachmentRow } from "@/components/chat-files";
import { CorrelationChart } from "@/components/correlation-chart";
import {
  ChatPanel,
  EducationSection,
  FamilySection,
  MedicalSection,
} from "@/components/record-forms";
import { useCallback, useEffect, useMemo, useState } from "react";

type Tab = "medical" | "education" | "chat" | "family";

type TeamPeer = { user_id: string; full_name: string; role: MemberRole };
type AddableProfile = {
  user_id: string;
  full_name: string | null;
  preferred_role: MemberRole;
  preferred_therapist_branch: EducationBranch | null;
};

export function StudentWorkspace({
  studentId,
  displayName,
  role,
  therapistBranch,
}: {
  studentId: string;
  displayName: string;
  role: MemberRole;
  therapistBranch: EducationBranch | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>(
    role === "doctor"
      ? "medical"
      : role === "therapist"
        ? "education"
        : role === "family"
          ? "family"
          : "chat",
  );

  const canWriteMedical = role === "admin" || role === "doctor";
  const canWriteEducation =
    role === "admin" ||
    (role === "therapist" && therapistBranch !== null);
  const writeBranch = role === "admin" ? null : therapistBranch;
  const canWriteFamily = role === "admin" || role === "family";

  const [meds, setMeds] = useState<
    {
      id: string;
      drug_name: string;
      dose: string | null;
      period_label: string | null;
      start_date: string | null;
      end_date: string | null;
    }[]
  >([]);
  const [notes, setNotes] = useState<
    { id: string; body: string; is_critical: boolean; created_at: string }[]
  >([]);
  const [visits, setVisits] = useState<
    {
      id: string;
      visit_date: string;
      facility: string | null;
      branch: MedicalBranch | null;
    }[]
  >([]);
  const [daily, setDaily] = useState<
    {
      id: string;
      branch: EducationBranch;
      entry_date: string;
      summary: string;
    }[]
  >([]);
  const [goals, setGoals] = useState<
    { id: string; branch: EducationBranch; title: string; description: string | null }[]
  >([]);
  const [skills, setSkills] = useState<
    {
      id: string;
      branch: EducationBranch;
      skill_name: string;
      completed_on: string | null;
    }[]
  >([]);
  const [reports, setReports] = useState<
    {
      id: string;
      branch: EducationBranch;
      period_label: string | null;
      body: string;
    }[]
  >([]);
  const [familyNotes, setFamilyNotes] = useState<
    { id: string; body: string; created_at: string }[]
  >([]);
  const [conversations, setConversations] = useState<
    { id: string; title: string | null; is_group: boolean }[]
  >([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { id: string; body: string; created_at: string; user_id: string }[]
  >([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamPeers, setTeamPeers] = useState<TeamPeer[]>([]);
  const [convMemberIds, setConvMemberIds] = useState<string[]>([]);
  const [dmTarget, setDmTarget] = useState("");
  const [groupAddTarget, setGroupAddTarget] = useState("");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [addableProfiles, setAddableProfiles] = useState<AddableProfile[]>([]);
  const [teamUserId, setTeamUserId] = useState("");
  const [teamRole, setTeamRole] = useState<MemberRole>("doctor");
  const [teamBranch, setTeamBranch] = useState<EducationBranch>("ergotherapy");
  const [teamFormMsg, setTeamFormMsg] = useState<string | null>(null);
  const [teamFormBusy, setTeamFormBusy] = useState(false);

  const reloadMessages = useCallback(async () => {
    if (!activeConv) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", activeConv)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
  }, [activeConv, supabase]);

  const load = useCallback(async () => {
    setLoadError(null);

    const [
      m1,
      m2,
      m3,
      e1,
      e2,
      e3,
      e4,
      f1,
      c1,
      a1,
    ] = await Promise.all([
      supabase.from("medications").select("*").eq("student_id", studentId),
      supabase.from("medical_notes").select("*").eq("student_id", studentId),
      supabase.from("medical_visits").select("*").eq("student_id", studentId),
      supabase.from("education_daily").select("*").eq("student_id", studentId),
      supabase.from("education_goals").select("*").eq("student_id", studentId),
      supabase.from("education_skills").select("*").eq("student_id", studentId),
      supabase.from("education_reports").select("*").eq("student_id", studentId),
      supabase.from("family_notes").select("*").eq("student_id", studentId),
      supabase.from("conversations").select("*").eq("student_id", studentId),
      supabase
        .from("attachments")
        .select(
          "id, object_path, file_name, content_type, byte_size, conversation_id, created_at",
        )
        .eq("student_id", studentId)
        .order("created_at", { ascending: false }),
    ]);

    const err =
      m1.error ||
      m2.error ||
      m3.error ||
      e1.error ||
      e2.error ||
      e3.error ||
      e4.error ||
      f1.error ||
      c1.error;
    if (err) {
      setLoadError(
        "Veri yüklenemedi. Supabase şemasını uyguladığınızdan ve .env değişkenlerinin doğru olduğundan emin olun.",
      );
      return;
    }

    setMeds(m1.data ?? []);
    setNotes(m2.data ?? []);
    setVisits(m3.data ?? []);
    setDaily(e1.data ?? []);
    setGoals(e2.data ?? []);
    setSkills(e3.data ?? []);
    setReports(e4.data ?? []);
    setFamilyNotes(f1.data ?? []);
    const rawConvs =
      (c1.data as { id: string; title: string | null; is_group: boolean }[]) ??
      [];
    const { data: auth } = await supabase.auth.getUser();
    let convList = rawConvs;
    if (auth.user) {
      const { data: mems } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", auth.user.id);
      const mine = new Set((mems ?? []).map((m) => m.conversation_id));
      convList = rawConvs.filter((c) => mine.has(c.id));
    }
    setConversations(convList);
    setAttachments(
      a1.error ? [] : ((a1.data as AttachmentRow[] | null) ?? []),
    );
  }, [studentId, supabase]);

  const loadTeamPeers = useCallback(async () => {
    const { data: rows } = await supabase
      .from("student_members")
      .select("user_id, role")
      .eq("student_id", studentId);
    if (!rows?.length) {
      setTeamPeers([]);
      return;
    }
    const ids = rows.map((r) => r.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const map = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    setTeamPeers(
      rows.map((r) => ({
        user_id: r.user_id,
        role: r.role as MemberRole,
        full_name:
          map.get(r.user_id)?.trim() ||
          `${r.user_id.slice(0, 8)}…`,
      })),
    );
  }, [studentId, supabase]);

  const loadAddableProfiles = useCallback(async () => {
    if (role !== "admin") {
      setAddableProfiles([]);
      return;
    }
    const { data, error } = await supabase.rpc("admin_list_addable_profiles", {
      p_student_id: studentId,
    });
    if (error) {
      setAddableProfiles([]);
      return;
    }
    setAddableProfiles((data as AddableProfile[] | null) ?? []);
  }, [role, studentId, supabase]);

  const loadConvMembers = useCallback(async () => {
    if (!activeConv) {
      setConvMemberIds([]);
      return;
    }
    const { data } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", activeConv);
    setConvMemberIds((data ?? []).map((d) => d.user_id));
  }, [activeConv, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!activeConv) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConv)
        .order("created_at", { ascending: true });
      if (!cancelled) setMessages(data ?? []);
    })();

    const channel = supabase
      .channel(`messages:${activeConv}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConv}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            body: string;
            created_at: string;
            user_id: string;
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [activeConv, supabase]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (tab !== "chat") return;
    void loadTeamPeers();
    void loadAddableProfiles();
  }, [tab, loadTeamPeers, loadAddableProfiles]);

  useEffect(() => {
    void loadConvMembers();
  }, [loadConvMembers]);

  async function openDirectChat(otherUserId: string) {
    if (!currentUserId || otherUserId === currentUserId) return;
    const peer = teamPeers.find((t) => t.user_id === otherUserId);
    const title = peer ? `DM · ${peer.full_name}` : "Bire bir";
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        student_id: studentId,
        is_group: false,
        title,
      })
      .select("id")
      .single();
    if (error || !conv) return;
    const { error: e2 } = await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: currentUserId },
      { conversation_id: conv.id, user_id: otherUserId },
    ]);
    if (e2) return;
    setDmTarget("");
    await load();
    await loadTeamPeers();
    setActiveConv(conv.id);
  }

  async function addGroupMember(otherUserId: string) {
    if (!activeConv || !otherUserId) return;
    const c = conversations.find((x) => x.id === activeConv);
    if (!c?.is_group) return;
    if (convMemberIds.includes(otherUserId)) return;
    const { error } = await supabase.from("conversation_members").insert({
      conversation_id: activeConv,
      user_id: otherUserId,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setGroupAddTarget("");
    await loadConvMembers();
  }

  async function addTeamMemberFromForm(e: React.FormEvent) {
    e.preventDefault();
    if (!teamUserId) return;
    setTeamFormMsg(null);
    setTeamFormBusy(true);
    const { error } = await supabase.rpc("admin_add_student_member_by_user_id", {
      p_student_id: studentId,
      p_user_id: teamUserId,
      p_role: teamRole,
      p_therapist_branch: teamRole === "therapist" ? teamBranch : null,
    });
    setTeamFormBusy(false);
    if (error) {
      setTeamFormMsg(error.message);
      return;
    }
    setTeamUserId("");
    setTeamFormMsg("Ekip güncellendi.");
    await load();
    await loadTeamPeers();
    await loadAddableProfiles();
  }

  async function saveConversationTitle(convId: string, title: string) {
    const t = title.trim();
    const { error } = await supabase
      .from("conversations")
      .update({ title: t.length > 0 ? t : null })
      .eq("id", convId);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingConvId(null);
    await load();
  }

  async function deleteConversation(convId: string) {
    if (
      !confirm(
        "Bu sohbeti silmek istiyor musunuz? Mesajlar ve bu kanala bağlı dosya kayıtları veritabanından silinir.",
      )
    ) {
      return;
    }
    const { error } = await supabase.rpc("delete_conversation_for_user", {
      p_id: convId,
    });
    if (error) {
      alert(error.message);
      return;
    }
    if (activeConv === convId) setActiveConv(null);
    setEditingConvId(null);
    await load();
    await loadConvMembers();
  }

  async function openGroupChat() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        student_id: studentId,
        is_group: true,
        title: `${displayName} — vaka grubu`,
      })
      .select("id")
      .single();
    if (error || !conv) return;
    await supabase.from("conversation_members").insert({
      conversation_id: conv.id,
      user_id: user.id,
    });
    await load();
    setActiveConv(conv.id);
  }

  async function sendMessage(body: string) {
    if (!activeConv || !body.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConv,
        user_id: user.id,
        body: body.trim(),
      })
      .select("*")
      .single();
    if (error || !data) return;
    setMessages((prev) =>
      prev.some((m) => m.id === data.id)
        ? prev
        : [...prev, data].sort((a, b) =>
            a.created_at.localeCompare(b.created_at),
          ),
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "medical", label: "Tıbbi konsültasyon" },
    { id: "education", label: "Terapist ve eğitim" },
    { id: "chat", label: "Eğitsel iletişim" },
    { id: "family", label: "Aile paneli" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Öğrenci
        </p>
        <h1 className="text-2xl font-semibold text-neutral-900">{displayName}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          PDF’teki dört kapı: tıbbi oda, eğitim odası, görüşme odası, aile aynası.
        </p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
        <span className="font-medium">Aktif rolünüz:</span> {ROLE_LABELS[role]}
        {" · "}
        {role === "doctor"
          ? "Tıbbi kayıtları yazabilir/güncelleyebilirsiniz."
          : role === "therapist"
            ? "Kendi branşınızdaki eğitim kayıtlarını yazabilir/güncelleyebilirsiniz."
            : role === "family"
              ? "Aile notları yazabilir, diğer kayıtları izleyebilirsiniz."
              : "Yönetici olarak tüm modülleri yönetebilir ve ekip kurabilirsiniz."}
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              tab === t.id
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {loadError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loadError}
        </p>
      )}

      {tab === "medical" && (
        <section className="space-y-6">
          {!canWriteMedical && (
            <p className="text-sm text-neutral-600">
              Bu sekmede verileri görüntülüyorsunuz. Düzenleme: doktor veya yönetici.
            </p>
          )}
          <MedicalSection
            canWrite={canWriteMedical}
            studentId={studentId}
            meds={meds}
            visits={visits}
            notes={notes}
            onSaved={load}
          />
        </section>
      )}

      {tab === "education" && (
        <section className="space-y-6">
          {!canWriteEducation && (
            <p className="text-sm text-neutral-600">
              Kendi branşınız dışında diğer eğitsel kayıtları salt okunur
              görürsünüz (bütünleşik müdahale).
            </p>
          )}
          <EducationSection
            canWrite={canWriteEducation}
            writeBranch={writeBranch}
            studentId={studentId}
            daily={daily}
            goals={goals}
            skills={skills}
            reports={reports}
            onSaved={load}
          />
        </section>
      )}

      {tab === "chat" && (
        <section className="grid gap-6 lg:grid-cols-[minmax(0,300px),minmax(0,1fr),minmax(0,280px)]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void openGroupChat()}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Yeni vaka grubu
              </button>
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                <p className="text-xs font-medium text-neutral-800">
                  Bire bir sohbet
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Bu öğrencinin ekibinden bir kişi seçin; yalnızca siz ikiniz
                  üye olursunuz.
                </p>
                <select
                  className="mt-2 w-full rounded-lg border border-neutral-200 px-2 py-2 text-sm"
                  value={dmTarget}
                  onChange={(e) => setDmTarget(e.target.value)}
                >
                  <option value="">Kişi seçin…</option>
                  {teamPeers
                    .filter((t) => t.user_id !== currentUserId)
                    .map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.full_name} ({ROLE_LABELS[t.role]})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!dmTarget || !currentUserId}
                  onClick={() => void openDirectChat(dmTarget)}
                  className="mt-2 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  Sohbeti aç
                </button>
                {teamPeers.filter((t) => t.user_id !== currentUserId).length ===
                  0 && (
                  <p className="mt-2 text-xs text-amber-900">
                    {role === "admin" ? (
                      <>
                        Listede kimse çıkmıyorsa henüz bu öğrenciye başka üye
                        eklenmemiş. Aşağıdaki formdan ekleyin (kişi önce sitede
                        kayıt olmalı).
                      </>
                    ) : (
                      <>
                        Başka uzman yoksa öğrenci <strong>yöneticisinden</strong>{" "}
                        eklenmesini isteyin.
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
            {role === "admin" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-xs font-semibold text-neutral-900">
                  Ekip üyesi ekle (yönetici)
                </p>
                <p className="mt-1 text-xs text-neutral-600">
                  Kayıtlı kullanıcılar roleriyle listelenir; birini seçip
                  direkt ekleyebilirsiniz.
                </p>
                <form
                  className="mt-2 space-y-2"
                  onSubmit={(ev) => void addTeamMemberFromForm(ev)}
                >
                  <select
                    required
                    value={teamUserId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setTeamUserId(nextId);
                      const picked = addableProfiles.find(
                        (p) => p.user_id === nextId,
                      );
                      if (!picked) return;
                      setTeamRole(picked.preferred_role);
                      if (
                        picked.preferred_therapist_branch &&
                        picked.preferred_role === "therapist"
                      ) {
                        setTeamBranch(picked.preferred_therapist_branch);
                      }
                    }}
                    className="w-full rounded-lg border border-amber-200/80 bg-white px-2 py-2 text-sm"
                  >
                    <option value="">Kayıtlı kullanıcı seçin…</option>
                    {addableProfiles.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {(p.full_name?.trim() || `${p.user_id.slice(0, 8)}…`)} ·{" "}
                        {ROLE_LABELS[p.preferred_role]}
                        {p.preferred_role === "therapist" &&
                        p.preferred_therapist_branch
                          ? ` (${EDUCATION_BRANCH_LABELS[p.preferred_therapist_branch]})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    value={teamRole}
                    onChange={(e) =>
                      setTeamRole(e.target.value as MemberRole)
                    }
                    className="w-full rounded-lg border border-amber-200/80 bg-white px-2 py-2 text-sm"
                  >
                    <option value="doctor">Doktor</option>
                    <option value="therapist">Terapist / eğitimci</option>
                    <option value="family">Aile</option>
                    <option value="admin">Yönetici</option>
                  </select>
                  {teamRole === "therapist" && (
                    <select
                      value={teamBranch}
                      onChange={(e) =>
                        setTeamBranch(e.target.value as EducationBranch)
                      }
                      className="w-full rounded-lg border border-amber-200/80 bg-white px-2 py-2 text-sm"
                    >
                      {EDUCATION_BRANCHES.map((b) => (
                        <option key={b} value={b}>
                          {EDUCATION_BRANCH_LABELS[b]}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="submit"
                    disabled={teamFormBusy || !teamUserId}
                    className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {teamFormBusy ? "Ekleniyor…" : "Ekibe ekle"}
                  </button>
                  {addableProfiles.length === 0 && (
                    <p className="text-xs text-neutral-600">
                      Eklenebilir kayıtlı kullanıcı bulunamadı. Kullanıcılar
                      önce kayıt olmalı veya zaten ekipte olabilir.
                    </p>
                  )}
                  {teamFormMsg && (
                    <p className="text-xs text-neutral-700" role="status">
                      {teamFormMsg}
                    </p>
                  )}
                </form>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-700">
                Sohbetleriniz
              </p>
              <p className="mb-2 text-xs text-neutral-500">
                Yalnızca üyesi olduğunuz kanallar listelenir.
              </p>
              <ul className="space-y-2 text-sm">
                {conversations.map((c) => (
                  <li key={c.id} className="rounded-lg border border-neutral-100">
                    {editingConvId === c.id ? (
                      <form
                        className="space-y-2 p-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          void saveConversationTitle(
                            c.id,
                            String(fd.get("title") ?? ""),
                          );
                        }}
                      >
                        <input
                          name="title"
                          defaultValue={c.title ?? ""}
                          placeholder="Sohbet adı"
                          className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white"
                          >
                            Kaydet
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-neutral-200 px-2 py-1 text-xs"
                            onClick={() => setEditingConvId(null)}
                          >
                            İptal
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-stretch gap-0.5">
                        <button
                          type="button"
                          onClick={() => setActiveConv(c.id)}
                          className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left ${
                            activeConv === c.id
                              ? "bg-neutral-100 font-medium"
                              : "hover:bg-neutral-50"
                          }`}
                        >
                          <span className="block truncate">
                            {c.title ?? (c.is_group ? "Grup" : "Bire bir")}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {c.is_group ? "Vaka grubu" : "DM"}
                          </span>
                        </button>
                        <div className="flex shrink-0 flex-col justify-center gap-0.5 border-l border-neutral-100 py-1 pr-1">
                          <button
                            type="button"
                            title="Adı düzenle"
                            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveConv(c.id);
                              setEditingConvId(c.id);
                            }}
                          >
                            Ad
                          </button>
                          <button
                            type="button"
                            title="Sohbeti sil"
                            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                            onClick={(e) => {
                              e.preventDefault();
                              void deleteConversation(c.id);
                            }}
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {activeConv && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs">
                <p className="font-medium text-neutral-900">Kanal üyeleri</p>
                <ul className="mt-2 space-y-1 text-neutral-700">
                  {convMemberIds.map((id) => {
                    const p = teamPeers.find((t) => t.user_id === id);
                    return (
                      <li key={id}>
                        {p?.full_name ?? id.slice(0, 8) + "…"}
                        {p ? (
                          <span className="text-neutral-400">
                            {" "}
                            ({ROLE_LABELS[p.role]})
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {conversations.find((x) => x.id === activeConv)?.is_group && (
                  <div className="mt-3 border-t border-blue-100 pt-3">
                    <p className="font-medium text-neutral-900">Gruba üye ekle</p>
                    <p className="mt-1 text-neutral-500">
                      Önce bu öğrenci için <code className="rounded bg-white px-1">student_members</code> kaydı olan kullanıcılar seçilebilir.
                    </p>
                    <select
                      className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm"
                      value={groupAddTarget}
                      onChange={(e) => setGroupAddTarget(e.target.value)}
                    >
                      <option value="">Ekip üyesi seçin…</option>
                      {teamPeers
                        .filter((t) => !convMemberIds.includes(t.user_id))
                        .map((t) => (
                          <option key={t.user_id} value={t.user_id}>
                            {t.full_name} ({ROLE_LABELS[t.role]})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      disabled={!groupAddTarget}
                      onClick={() => void addGroupMember(groupAddTarget)}
                      className="mt-2 w-full rounded-lg border border-neutral-900 bg-white px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
                    >
                      Gruba ekle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <ChatPanel
              activeConv={activeConv}
              messages={messages}
              onSend={(b) => void sendMessage(b)}
              currentUserId={currentUserId}
              onMessagesMutated={() => void reloadMessages()}
              members={teamPeers}
            />
            <p className="text-xs text-neutral-500">
              Canlı mesajlar için Supabase Dashboard → Database → Replication
              altında <code className="rounded bg-neutral-100 px-1">messages</code>{" "}
              tablosu için Realtime açın.
            </p>
          </div>
          <ChatFiles
            studentId={studentId}
            conversationId={activeConv}
            files={attachments}
            onChanged={() => void load()}
          />
        </section>
      )}

      {tab === "family" && (
        <section className="space-y-6">
          <CorrelationChart medications={meds} skills={skills} />
          <FamilySection
            canWrite={canWriteFamily}
            studentId={studentId}
            notes={familyNotes}
            onSaved={load}
          />
        </section>
      )}
    </div>
  );
}

