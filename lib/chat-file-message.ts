import type { SupabaseClient } from "@supabase/supabase-js";

/** Mesaj gövdesinde dosya eklerini işaretlemek için (UI + silme senkronu). */
export const FILE_ATTACHMENT_PREFIX = "__erd_attachment:" as const;

export function parseAttachmentIdFromMessageBody(
  body: string,
): string | null {
  if (!body.startsWith(FILE_ATTACHMENT_PREFIX)) return null;
  const id = body.slice(FILE_ATTACHMENT_PREFIX.length).trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return id;
}

function safeSegment(name: string) {
  return name.replace(/[^\w.\-()+ ]/g, "_").slice(0, 180);
}

export type ChatMessageRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
};

/**
 * Sohbete dosya yükler, attachments kaydı oluşturur ve dosyayı temsil eden bir mesaj ekler.
 */
export async function uploadChatFileAsMessage(
  supabase: SupabaseClient,
  opts: {
    studentId: string;
    conversationId: string;
    file: File;
  },
): Promise<{ ok: true; message: ChatMessageRow } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı." };

  const suffix = safeSegment(opts.file.name);
  const objectPath = `${opts.studentId}/${crypto.randomUUID()}_${suffix}`;

  const { error: upErr } = await supabase.storage
    .from("erd-attachments")
    .upload(objectPath, opts.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: opts.file.type || undefined,
    });

  if (upErr) return { ok: false, error: upErr.message };

  const { data: att, error: attErr } = await supabase
    .from("attachments")
    .insert({
      student_id: opts.studentId,
      conversation_id: opts.conversationId,
      object_path: objectPath,
      file_name: opts.file.name,
      content_type: opts.file.type || null,
      byte_size: opts.file.size,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (attErr || !att) {
    await supabase.storage.from("erd-attachments").remove([objectPath]);
    return { ok: false, error: attErr?.message ?? "Dosya kaydı oluşturulamadı." };
  }

  const body = `${FILE_ATTACHMENT_PREFIX}${att.id as string}`;

  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: opts.conversationId,
      user_id: user.id,
      body,
    })
    .select("id, body, created_at, user_id")
    .single();

  if (msgErr || !msg) {
    await supabase.from("attachments").delete().eq("id", att.id);
    await supabase.storage.from("erd-attachments").remove([objectPath]);
    return { ok: false, error: msgErr?.message ?? "Mesaj oluşturulamadı." };
  }

  return { ok: true, message: msg as ChatMessageRow };
}
