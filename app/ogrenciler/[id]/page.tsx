import { StudentWorkspace } from "@/components/student-workspace";
import { createClient } from "@/lib/supabase/server";
import type { EducationBranch, MemberRole } from "@/lib/labels";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: member, error } = await supabase
    .from("student_members")
    .select("role, therapist_branch, students (id, display_name)")
    .eq("student_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !member) notFound();

  const student = member.students as unknown as {
    id: string;
    display_name: string;
  } | null;
  if (!student) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/ogrenciler"
        className="text-sm text-blue-600 hover:underline"
      >
        ← Öğrenci listesi
      </Link>
      <StudentWorkspace
        studentId={student.id}
        displayName={student.display_name}
        role={member.role as MemberRole}
        therapistBranch={(member.therapist_branch as EducationBranch | null) ?? null}
      />
    </div>
  );
}
