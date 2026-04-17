"use client";

import {
  EDUCATION_BRANCHES,
  EDUCATION_BRANCH_LABELS,
  ROLE_LABELS,
  type EducationBranch,
  type MemberRole,
} from "@/lib/labels";
import { useState } from "react";
import { updateProfileRolePreferences } from "./actions";

export function ProfileRoleForm({
  initialRole,
  initialBranch,
}: {
  initialRole: MemberRole;
  initialBranch: EducationBranch | null;
}) {
  const [role, setRole] = useState<MemberRole>(initialRole);
  const [branch, setBranch] = useState<EducationBranch>(
    initialBranch ?? "ergotherapy",
  );
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 sm:grid-cols-3 sm:items-end"
      action={async (fd) => {
        setPending(true);
        setMsg(null);
        const r = await updateProfileRolePreferences(fd);
        setPending(false);
        if ("error" in r && r.error) setMsg(r.error);
        else setMsg("Rol tercihi güncellendi.");
      }}
    >
      <label className="block text-sm">
        <span className="text-neutral-700">Rol tercihi</span>
        <select
          name="preferred_role"
          value={role}
          onChange={(e) => setRole(e.target.value as MemberRole)}
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
        >
          {(Object.keys(ROLE_LABELS) as MemberRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-neutral-700">Terapist branşı</span>
        <select
          name="preferred_therapist_branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value as EducationBranch)}
          disabled={role !== "therapist"}
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm disabled:opacity-50"
        >
          {EDUCATION_BRANCHES.map((b) => (
            <option key={b} value={b}>
              {EDUCATION_BRANCH_LABELS[b]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : "Rolü güncelle"}
      </button>

      {msg && (
        <p className="text-sm text-neutral-600 sm:col-span-3" role="status">
          {msg}
        </p>
      )}
    </form>
  );
}
