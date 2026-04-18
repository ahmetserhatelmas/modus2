"use client";

import {
  EDUCATION_BRANCHES,
  EDUCATION_BRANCH_LABELS,
  ROLE_LABELS,
  type EducationBranch,
  type MemberRole,
} from "@/lib/labels";
import { useActionState, useState } from "react";
import { authGirisAction, type AuthFormState } from "./actions";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [preferredRole, setPreferredRole] = useState<MemberRole>("family");
  const [preferredBranch, setPreferredBranch] =
    useState<EducationBranch>("ergotherapy");
  const [state, formAction, isPending] = useActionState<
    AuthFormState,
    FormData
  >(authGirisAction, null);

  return (
    <form
      key={mode}
      action={formAction}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="intent" value={mode} />

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
              name="full_name"
              required
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            <span className="text-neutral-700">Rol tercihi</span>
            <select
              name="preferred_role"
              value={preferredRole}
              onChange={(e) =>
                setPreferredRole(e.target.value as MemberRole)
              }
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
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
                name="preferred_therapist_branch"
                value={preferredBranch}
                onChange={(e) =>
                  setPreferredBranch(e.target.value as EducationBranch)
                }
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
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
          name="email"
          required
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          autoComplete="email"
        />
      </label>

      {state?.error && (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="text-sm text-neutral-600" role="status">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {isPending ? "Bekleyin…" : mode === "login" ? "Giriş yap" : "Kayıt ol"}
      </button>
    </form>
  );
}
