"use client";

import { createClient } from "@/lib/supabase/client";
import { useMemo, useState } from "react";

export type AttachmentRow = {
  id: string;
  object_path: string;
  file_name: string;
  content_type: string | null;
  byte_size: number | null;
  conversation_id: string | null;
  created_at: string;
};

function safeSegment(name: string) {
  return name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
}

export function ChatFiles({
  studentId,
  conversationId,
  files,
  onChanged,
}: {
  studentId: string;
  conversationId: string | null;
  files: AttachmentRow[];
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const visible = conversationId
    ? files.filter((f) => f.conversation_id === conversationId)
    : files;

  async function download(path: string) {
    setErr(null);
    const { data, error } = await supabase.storage
      .from("erd-attachments")
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      setErr(error?.message ?? "İndirme bağlantısı oluşturulamadı.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeFile(row: AttachmentRow) {
    setErr(null);
    setBusy(true);
    const { error: sErr } = await supabase.storage
      .from("erd-attachments")
      .remove([row.object_path]);
    if (sErr) {
      setBusy(false);
      setErr(sErr.message);
      return;
    }
    const { error: dErr } = await supabase.from("attachments").delete().eq("id", row.id);
    setBusy(false);
    if (dErr) {
      setErr(dErr.message);
      return;
    }
    onChanged();
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !conversationId) return;

    setErr(null);
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      return;
    }

    const suffix = safeSegment(file.name);
    const objectPath = `${studentId}/${crypto.randomUUID()}_${suffix}`;

    const { error: upErr } = await supabase.storage
      .from("erd-attachments")
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (upErr) {
      setBusy(false);
      setErr(upErr.message);
      return;
    }

    const { error: insErr } = await supabase.from("attachments").insert({
      student_id: studentId,
      conversation_id: conversationId,
      object_path: objectPath,
      file_name: file.name,
      content_type: file.type || null,
      byte_size: file.size,
      created_by: user.id,
    });

    setBusy(false);
    if (insErr) {
      setErr(insErr.message);
      await supabase.storage.from("erd-attachments").remove([objectPath]);
      return;
    }
    onChanged();
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-neutral-900">Dosya paylaşımı</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Dosyaları doğrudan mesaj kutusundaki 📎 ile de ekleyebilirsiniz; burada
        tüm ekler listelenir.
      </p>

      {!conversationId ? (
        <p className="mt-3 text-sm text-neutral-600">
          Dosya eklemek için önce bir konuşma seçin.
        </p>
      ) : (
        <label className="mt-3 block">
          <span className="sr-only">Dosya seç</span>
          <input
            type="file"
            disabled={busy}
            onChange={(ev) => void onPick(ev)}
            className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-800 hover:file:bg-neutral-200"
          />
        </label>
      )}

      {err && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {err}
        </p>
      )}

      <ul className="mt-4 space-y-2 text-sm">
        {visible.length === 0 && (
          <li className="text-neutral-500">Bu görünümde dosya yok.</li>
        )}
        {visible.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-100 px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-neutral-800" title={f.file_name}>
              {f.file_name}
            </span>
            <span className="text-xs text-neutral-400">
              {f.byte_size != null ? `${(f.byte_size / 1024).toFixed(0)} KB` : ""}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void download(f.object_path)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Aç / indir
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeFile(f)}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                Sil
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
