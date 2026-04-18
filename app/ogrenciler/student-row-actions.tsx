"use client";

import type { MemberRole } from "@/lib/labels";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteStudentCase, leaveStudentCase } from "./actions";

export function StudentRowActions({
  studentId,
  displayName,
  caseRole,
  adminCount,
}: {
  studentId: string;
  displayName: string;
  caseRole: MemberRole;
  adminCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const isStudentAdmin = caseRole === "admin";
  const soleStudentAdmin = isStudentAdmin && adminCount <= 1;
  const canLeave = !soleStudentAdmin;
  const canDeleteCase = isStudentAdmin;

  if (!canLeave && !canDeleteCase) return null;

  function runLeave() {
    if (
      !confirm(
        `“${displayName}” vakasına erişiminizi kaldırmak istiyor musunuz? Listede görünmezsiniz; gerekirse yönetici yeniden ekleyebilir.`,
      )
    ) {
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await leaveStudentCase(studentId);
      if ("error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  function runDeleteCase() {
    if (
      !confirm(
        `“${displayName}” vakasını ve ilişkili tüm kayıtları kalıcı olarak silmek istiyor musunuz? Bu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await deleteStudentCase(studentId);
      if ("error" in r && r.error) setMsg(r.error);
      else router.refresh();
    });
  }

  return (
    <details className="relative shrink-0 group">
      <summary
        className="list-none cursor-pointer rounded-lg px-2 py-2 text-xs font-medium text-neutral-600 outline-none ring-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 [&::-webkit-details-marker]:hidden"
        aria-label="İsteğe bağlı işlemler"
      >
        ⋯
      </summary>
      <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-neutral-200 bg-white py-1 text-xs shadow-md">
        {canLeave ? (
          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute(
                "open",
              );
              runLeave();
            }}
            className="block w-full px-3 py-2 text-left text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
          >
            Listeden kaldır
          </button>
        ) : null}
        {canDeleteCase ? (
          <button
            type="button"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              (e.currentTarget.closest("details") as HTMLDetailsElement)?.removeAttribute(
                "open",
              );
              runDeleteCase();
            }}
            className="block w-full px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Vakayı tamamen sil
          </button>
        ) : null}
      </div>
      {msg ? (
        <p className="absolute right-0 top-full z-20 mt-1 max-w-[14rem] rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
          {msg}
        </p>
      ) : null}
    </details>
  );
}
