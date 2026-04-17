"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EducationBranch, MemberRole } from "@/lib/labels";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}

export async function createStudent(formData: FormData) {
  const name = (formData.get("display_name") as string)?.trim();
  if (!name) return { error: "İsim gerekli" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile?.preferred_role as MemberRole | null) !== "admin") {
    return {
      error:
        "Sadece yönetici rolü öğrenci oluşturabilir.",
    };
  }

  const { data: studentId, error: e1 } = await supabase.rpc(
    "create_student_for_user",
    { p_display_name: name },
  );

  if (e1 || !studentId) {
    return { error: e1?.message ?? "Öğrenci oluşturulamadı" };
  }

  revalidatePath("/ogrenciler");
  return { ok: true as const };
}

export async function updateProfileRolePreferences(formData: FormData) {
  const role = formData.get("preferred_role") as MemberRole | null;
  const branch = formData.get("preferred_therapist_branch") as
    | EducationBranch
    | null;
  if (!role) return { error: "Rol seçimi gerekli." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_role: role,
      preferred_therapist_branch: role === "therapist" ? branch : null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/ogrenciler");
  return { ok: true as const };
}
