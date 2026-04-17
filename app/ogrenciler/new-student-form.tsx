"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MemberRole } from "@/lib/labels";
import { createStudent } from "./actions";

export function NewStudentForm({ role }: { role: MemberRole }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const blocked = role !== "admin";

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      action={async (fd) => {
        if (blocked) return;
        setPending(true);
        setMsg(null);
        const r = await createStudent(fd);
        setPending(false);
        if ("error" in r && r.error) setMsg(r.error);
        else {
          setMsg("Öğrenci oluşturuldu.");
          router.refresh();
        }
      }}
    >
      <label className="block flex-1 text-sm">
        <span className="text-neutral-700">Öğrenci adı</span>
        <input
          name="display_name"
          required
          disabled={blocked}
          placeholder="Örn. Ayşe Y."
          className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending || blocked}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {blocked ? "Sadece yönetici oluşturabilir" : pending ? "Kaydediliyor…" : "Oluştur"}
      </button>
      {blocked && (
        <p className="text-sm text-amber-700 sm:w-full sm:basis-full" role="status">
          Terapist, doktor ve aile rollerinde öğrenci oluşturma kapalı.
          Öğrenci eklemek için rolünüzün yönetici olması gerekir.
        </p>
      )}
      {msg && (
        <p className="text-sm text-neutral-600 sm:w-full sm:basis-full" role="status">
          {msg}
        </p>
      )}
    </form>
  );
}
