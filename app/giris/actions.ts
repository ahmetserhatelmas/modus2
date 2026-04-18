"use server";

import { createClient } from "@/lib/supabase/server";
import {
  EDUCATION_BRANCHES,
  ROLE_LABELS,
  type EducationBranch,
  type MemberRole,
} from "@/lib/labels";
import { createHmac } from "node:crypto";
import { redirect } from "next/navigation";

export type AuthFormState = {
  error?: string;
  message?: string;
} | null;

function requireSecret(): string {
  const s = process.env.AUTH_EMAIL_LINK_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "Sunucuda AUTH_EMAIL_LINK_SECRET tanımlı değil (en az 32 karakter).",
    );
  }
  return s;
}

/** Şifre alanı yok: e-postadan türetilen oturum şifresi (sadece sunucuda). */
function derivedPasswordFromEmail(email: string, secret: string): string {
  const normalized = email.trim().toLowerCase();
  return createHmac("sha256", secret)
    .update(normalized)
    .digest("base64url")
    .slice(0, 72);
}

export async function authGirisAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const intent = String(formData.get("intent") || "");
  if (intent === "login") {
    return signInEmailOnly(formData);
  }
  if (intent === "signup") {
    return signUpEmailOnly(formData);
  }
  return { error: "Geçersiz istek." };
}

async function signInEmailOnly(formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "E-posta gerekli." };

  let secret: string;
  try {
    secret = requireSecret();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sunucu hatası." };
  }

  const password = derivedPasswordFromEmail(email, secret);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("invalid") || m.includes("wrong")) {
      return {
        error:
          "Bu e-posta ile giriş yapılamadı. Kayıtlı değilseniz önce Kayıt sekmesinden hesap oluşturun.",
      };
    }
    return { error: error.message };
  }

  redirect("/ogrenciler");
}

async function signUpEmailOnly(formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") || "").trim();
  const fullName = String(formData.get("full_name") || "").trim();
  const roleRaw = String(formData.get("preferred_role") || "family");
  const branchRaw = String(formData.get("preferred_therapist_branch") || "");

  if (!email) return { error: "E-posta gerekli." };
  if (!fullName) return { error: "Ad soyad gerekli." };

  if (!(roleRaw in ROLE_LABELS)) {
    return { error: "Geçersiz rol." };
  }
  const preferredRole = roleRaw as MemberRole;

  let secret: string;
  try {
    secret = requireSecret();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sunucu hatası." };
  }

  const password = derivedPasswordFromEmail(email, secret);
  const supabase = await createClient();

  let preferred_therapist_branch: EducationBranch | null = null;
  if (preferredRole === "therapist") {
    if (!branchRaw || !EDUCATION_BRANCHES.includes(branchRaw as EducationBranch)) {
      return { error: "Terapist için branş seçin." };
    }
    preferred_therapist_branch = branchRaw as EducationBranch;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        preferred_role: preferredRole,
        preferred_therapist_branch: preferred_therapist_branch,
      },
    },
  });

  if (error) {
    const already =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");
    if (already) {
      const { error: e2 } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!e2) redirect("/ogrenciler");
      return {
        error:
          "Bu e-posta zaten kayıtlı fakat bu giriş yöntemiyle eşleşmiyor (eski şifreli hesap). Yönetici veya şifre sıfırlama gerekir.",
      };
    }
    return { error: error.message };
  }

  if (data.session) {
    redirect("/ogrenciler");
  }

  return {
    message:
      "Hesap oluşturuldu. E-posta onayı açıksa gelen kutunuzu kontrol edin; kapalıysa Giriş sekmesinden aynı e-posta ile giriş yapın.",
  };
}
