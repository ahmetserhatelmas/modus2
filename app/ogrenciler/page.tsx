import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  EDUCATION_BRANCH_LABELS,
  ROLE_LABELS,
  type EducationBranch,
  type MemberRole,
} from "@/lib/labels";
import { NewStudentForm } from "./new-student-form";
import { StudentRowActions } from "./student-row-actions";

export default async function OgrencilerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: rows } = await supabase
    .from("student_members")
    .select("role, therapist_branch, students (id, display_name)")
    .eq("user_id", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_role, preferred_therapist_branch")
    .eq("id", user.id)
    .maybeSingle();

  const appRole = (profile?.preferred_role as MemberRole) ?? "family";
  const isAdmin = appRole === "admin";

  const list =
    rows?.map((r) => {
      const s = r.students as unknown as {
        id: string;
        display_name: string;
      } | null;
      return s
        ? {
            id: s.id,
            display_name: s.display_name,
            role: r.role as MemberRole,
            therapist_branch: r.therapist_branch as string | null,
          }
        : null;
    }) ?? [];

  const students = list.filter(Boolean) as {
    id: string;
    display_name: string;
    role: MemberRole;
    therapist_branch: string | null;
  }[];

  const studentIds = [...new Set(students.map((s) => s.id))];
  const adminCountByStudent: Record<string, number> = {};
  if (studentIds.length) {
    const { data: adminRows } = await supabase
      .from("student_members")
      .select("student_id, role")
      .in("student_id", studentIds)
      .eq("role", "admin");
    for (const row of adminRows ?? []) {
      const sid = row.student_id as string;
      adminCountByStudent[sid] = (adminCountByStudent[sid] ?? 0) + 1;
    }
  }

  const branchLabel =
    appRole === "therapist" && profile?.preferred_therapist_branch
      ? EDUCATION_BRANCH_LABELS[
          profile.preferred_therapist_branch as EducationBranch
        ]
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Öğrenciler
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Size atanan vakalara tıklayarak detaylara girin. Her vakada göreviniz
          (doktor, terapist, aile vb.) ayrıca tanımlanır; uygulama içindeki
          işlemler bu yetkilere göre açılır.
        </p>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-neutral-600">
          {isAdmin
            ? "Henüz erişiminiz olan öğrenci yok. Aşağıdan yeni vaka oluşturabilir veya ekip üyelerini vakaya ekleyebilirsiniz."
            : "Size atanan öğrenci yok. Kurum yöneticiniz sizi bir vakaya eklediğinde adları burada listelenecektir."}
        </p>
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-neutral-900">
            Size atanan vakalar
          </h2>
          <p className="text-xs text-neutral-500">
            Satırdaki ⋯ menüsünden listeden kaldırabilirsiniz. Vaka yöneticisiyseniz
            tüm vakayı da silebilirsiniz (geri alınamaz).
          </p>
          <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {students.map((s) => (
              <li key={s.id} className="flex items-stretch">
                <Link
                  href={`/ogrenciler/${s.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-4 px-4 py-4 hover:bg-neutral-50 sm:px-5"
                >
                  <span className="font-medium text-neutral-900">
                    {s.display_name}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500">
                    Bu vakada: {ROLE_LABELS[s.role]}
                    {s.therapist_branch
                      ? ` · ${EDUCATION_BRANCH_LABELS[s.therapist_branch as EducationBranch] ?? s.therapist_branch}`
                      : ""}
                  </span>
                </Link>
                <div className="flex shrink-0 items-center border-l border-neutral-100 px-1 sm:px-2">
                  <StudentRowActions
                    studentId={s.id}
                    displayName={s.display_name}
                    caseRole={s.role}
                    adminCount={adminCountByStudent[s.id] ?? 0}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Hesap rolünüz</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Kayıtta seçtiğiniz rol kalıcıdır ve değiştirilemez. Ekip ekleme
          ekranında varsayılan rol olarak kullanılır.
        </p>
        <p className="mt-3 text-sm text-neutral-800">
          <span className="font-medium">{ROLE_LABELS[appRole]}</span>
          {branchLabel ? (
            <span className="text-neutral-600"> · {branchLabel}</span>
          ) : null}
        </p>
      </section>

      {isAdmin && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-medium text-neutral-900">Yeni öğrenci</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Yalnızca yönetici hesabı yeni vaka oluşturabilir; ardından ekibi
            vaka içinden tanımlayabilirsiniz.
          </p>
          <div className="mt-4">
            <NewStudentForm role={appRole} />
          </div>
        </section>
      )}
    </div>
  );
}
