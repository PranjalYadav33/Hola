import { getSupabaseClient } from "@/lib/supabaseClient";

export type UIMessage = {
  _id: string;
  content: string;
  _creationTime: number;
  messageType: "text" | "image" | "video" | "system";
  sender: {
    _id: string;
    image: string;
    name?: string;
    email?: string;
    _creationTime: number;
    isOnline?: boolean;
  };
};

export async function fetchMessages(conversationId: string): Promise<UIMessage[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data: rows } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_user_id, text_content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const list = rows || [];
  const uniqueSenderIds = Array.from(new Set(list.map((m: any) => m.sender_user_id).filter(Boolean)));
  let profileMap = new Map<string, any>();
  if (uniqueSenderIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", uniqueSenderIds);
    (profs || []).forEach((p) => profileMap.set(p.id, p));
  }

  return list.map((m: any) => {
    const prof = profileMap.get(m.sender_user_id);
    const content = m.text_content || "";
    const lower = content.toLowerCase();
    const isImage = /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(lower);
    const isVideo = /(\.mp4|\.webm|\.ogg)$/i.test(lower);
    return {
      _id: m.id,
      content,
      _creationTime: new Date(m.created_at).getTime(),
      messageType: isImage ? "image" : isVideo ? "video" : "text",
      sender: {
        _id: m.sender_user_id,
        image: prof?.avatar_url || "/placeholder.png",
        name: prof?.display_name,
        _creationTime: 0,
      },
    } as UIMessage;
  });
}

export function subscribeToMessages(
  conversationId: string,
  onInsert: (m: UIMessage) => void
) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  
  const channel = supabase
    .channel(`messages-${conversationId}-${Date.now()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        const row: any = payload.new;
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .eq("id", row.sender_user_id)
          .maybeSingle();
        const content = row.text_content || "";
        const lower = content.toLowerCase();
        const isImage = /(\.png|\.jpg|\.jpeg|\.gif|\.webp)$/i.test(lower);
        const isVideo = /(\.mp4|\.webm|\.ogg)$/i.test(lower);
        const m: UIMessage = {
          _id: row.id,
          content,
          _creationTime: new Date(row.created_at).getTime(),
          messageType: isImage ? "image" : isVideo ? "video" : "text",
          sender: {
            _id: row.sender_user_id,
            image: prof?.avatar_url || "/placeholder.png",
            name: prof?.display_name,
            _creationTime: 0,
          },
        };
        onInsert(m);
      }
    )
    .subscribe();

  return () => channel.unsubscribe();
}

export async function sendTextMessage(conversationId: string, content: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_user_id: uid,
    text_content: content,
  });
  if (error) {
    console.warn("sendTextMessage error", error);
    return false;
  }
  return true;
}

export async function sendMediaMessage(
  conversationId: string,
  file: File,
  kind: "image" | "video"
) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;

  // Upload to Storage
  const fileExt = file.name.split(".").pop();
  const path = `${conversationId}/${Date.now()}.${fileExt}`;
  const bucket = "attachments";
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (upErr) {
    console.warn("storage upload error", upErr);
    return false;
  }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const url = pub.publicUrl;

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_user_id: uid,
    text_content: url,
  });
  if (error) {
    console.warn("sendMediaMessage error", error);
    return false;
  }
  return true;
}
