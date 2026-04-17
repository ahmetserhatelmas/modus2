"use client";

import { createClient } from "@/lib/supabase/client";
import {
  EDUCATION_BRANCHES,
  EDUCATION_BRANCH_LABELS,
  ROLE_LABELS,
  type EducationBranch,
  type MemberRole,
} from "@/lib/labels";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [preferredRole, setPreferredRole] = useState<MemberRole>("family");
  const [preferredBranch, setPreferredBranch] =
    useState<EducationBranch>("ergotherapy");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            preferred_role: preferredRole,
            preferred_therapist_branch:
              preferredRole === "therapist" ? preferredBranch : null,
          },
          emailRedirectTo: origin
            ? `${origin}/auth/callback`
            : undefined,
        },
      });
      setLoading(false);
      if (error) {
        setMessage(error.message);
        return;
      }
      // Confirm email kapalıysa Supabase oturum döner; açıksa session null kalır.
      if (data.session) {
        router.push("/ogrenciler");
        router.refresh();
        return;
      }
      setMessage(
        "Kayıt oluşturuldu; e-posta onayı bekleniyor. Anında giriş için Supabase’de e-posta onayını kapatın (aşağıdaki adımlar).",
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/ogrenciler");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div className="flex rounded-lg border border-neutral-200 p-0.5 text-sm">
        <button
          type="button"
          className={`flex-1 rounded-md py-2 font-medium ${
            mode === "login"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600"
          }`}
          onClick={() => setMode("login")}
        >
          Giriş
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-2 font-medium ${
            mode === "signup"
              ? "bg-neutral-900 text-white"
              : "text-neutral-600"
          }`}
          onClick={() => setMode("signup")}
        >
          Kayıt
        </button>
      </div>
      {mode === "signup" && (
        <>
          <label className="block text-sm">
            <span className="text-neutral-700">Ad soyad</span>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-700">Rol tercihi</span>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              value={preferredRole}
              onChange={(e) => setPreferredRole(e.target.value as MemberRole)}
            >
              {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          {preferredRole === "therapist" && (
            <label className="block text-sm">
              <span className="text-neutral-700">Terapist branşı</span>
              <select
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                value={preferredBranch}
                onChange={(e) =>
                  setPreferredBranch(e.target.value as EducationBranch)
                }
              >
                {EDUCATION_BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {EDUCATION_BRANCH_LABELS[b]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      <label className="block text-sm">
        <span className="text-neutral-700">E-posta</span>
        <input
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      <label className="block text-sm">
        <span className="text-neutral-700">Şifre</span>
        <input
          type="password"
          required
          minLength={6}
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
      </label>
      {message && (
        <p className="text-sm text-neutral-600" role="status">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {loading ? "Bekleyin…" : mode === "login" ? "Giriş yap" : "Kayıt ol"}
      </button>
    </form>
  );
}
