import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ROLE_LABELS,
  type EducationBranch,
  type MemberRole,
} from "@/lib/labels";
import { NewStudentForm } from "./new-student-form";
import { ProfileRoleForm } from "./profile-role-form";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Öğrenciler
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Bir öğrenci seçerek dört ana modüle (tıbbi, eğitim, iletişim, aile
          paneli) erişin. Yetkiler rolünüze göre değişir.
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Profil rol tercihi</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Kayıtta seçtiğiniz rolü buradan değiştirebilirsiniz. Bu tercih, ekip
          ekleme ve hızlı seçimlerde varsayılan olarak kullanılır.
        </p>
        <div className="mt-4">
          <ProfileRoleForm
            initialRole={(profile?.preferred_role as MemberRole) ?? "family"}
            initialBranch={
              (profile?.preferred_therapist_branch as EducationBranch | null) ??
              null
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-medium text-neutral-900">Yeni öğrenci</h2>
        <p className="mt-1 text-xs text-neutral-500">
          İlk kayıtta siz yönetici olursunuz; ardından ekibi Supabase üzerinden
          veya ileride eklenecek davet ekranından tanımlayabilirsiniz.
        </p>
        <div className="mt-4">
          <NewStudentForm
            role={(profile?.preferred_role as MemberRole) ?? "family"}
          />
        </div>
      </section>

      {students.length === 0 ? (
        <p className="text-sm text-neutral-600">
          Henüz erişiminiz olan öğrenci yok. Yukarıdan bir öğrenci oluşturun veya
          yöneticinizden üyelik isteyin.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/ogrenciler/${s.id}`}
                className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-neutral-50 sm:px-5"
              >
                <span className="font-medium text-neutral-900">
                  {s.display_name}
                </span>
                <span className="text-xs text-neutral-500">
                  {ROLE_LABELS[s.role]}
                  {s.therapist_branch
                    ? ` · ${s.therapist_branch.replaceAll("_", " ")}`
                    : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
