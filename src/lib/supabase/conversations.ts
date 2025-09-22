import { getSupabaseClient } from "@/lib/supabaseClient";
import type { Profile } from "./profiles";

export type UIConversation = {
  _id: string;
  participants: string[];
  isGroup: boolean;
  name?: string;
  image?: string;
  groupName?: string;
  groupImage?: string;
  admin?: string;
  isOnline?: boolean;
  _creationTime?: number;
  // For direct conversations, ensure we always have the other participant explicitly
  otherId?: string;
  otherName?: string;
  otherImage?: string;
  lastMessage?: {
    _id: string;
    conversation: string;
    content: string;
    sender: string;
    _creationTime?: number;
    messageType?: "text" | "image" | "video";
  } | null;
};

export async function getMyConversationsForUI(): Promise<UIConversation[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const meId = auth.user?.id;
  if (!meId) return [];

  // Get my conversations via participants
  const { data: participantRows, error: partErr } = await supabase
    .from("participants")
    .select("conversation_id, role")
    .eq("user_id", meId);
  if (partErr) {
    console.warn("participants error", partErr);
  }
  const convIds = (participantRows || []).map((p) => p.conversation_id);
  if (convIds.length === 0) return [];

  // Load conversations
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, type, title, avatar_url, created_by, created_at")
    .in("id", convIds);

  const conversations: UIConversation[] = [];

  for (const c of convs || []) {
    // load all participants for this conversation
    const { data: parts } = await supabase
      .from("participants")
      .select("user_id, role")
      .eq("conversation_id", c.id);
    const participantIds = (parts || []).map((p) => p.user_id);

    // last message
    const { data: lastMsgs } = await supabase
      .from("messages")
      .select("id, text_content, sender_user_id, created_at")
      .eq("conversation_id", c.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const last = lastMsgs?.[0];

    if (c.type === "direct") {
      // Robustly figure out the other participant
      const others = participantIds.filter((id) => id !== meId);
      const otherId = others[0] || c.created_by || participantIds.find((id) => id !== meId) || participantIds[0] || meId;
      const { data: other } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", otherId)
        .maybeSingle();

      const ui: UIConversation = {
        _id: c.id,
        participants: participantIds,
        isGroup: false,
        name: other?.display_name || "User",
        image: other?.avatar_url || "/placeholder.png",
        otherId,
        otherName: other?.display_name || undefined,
        otherImage: other?.avatar_url || undefined,
        _creationTime: new Date(c.created_at).getTime(),
        lastMessage: last
          ? {
              _id: last.id,
              conversation: c.id,
              content: last.text_content || "",
              sender: last.sender_user_id,
              _creationTime: new Date(last.created_at).getTime(),
              messageType: "text",
            }
          : null,
      };
      conversations.push(ui);
    } else {
      const admin = (parts || []).find((p) => p.role === "admin")?.user_id;
      const ui: UIConversation = {
        _id: c.id,
        participants: participantIds,
        isGroup: true,
        groupName: c.title || "Group",
        groupImage: c.avatar_url || undefined,
        admin,
        _creationTime: new Date(c.created_at).getTime(),
        lastMessage: last
          ? {
              _id: last.id,
              conversation: c.id,
              content: last.text_content || "",
              sender: last.sender_user_id,
              _creationTime: new Date(last.created_at).getTime(),
              messageType: "text",
            }
          : null,
      };
      conversations.push(ui);
    }
  }

  return conversations;
}

export async function ensureDirectConversation(otherUserId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("ensure_direct_conversation", {
    other_user_id: otherUserId,
  });
  if (error) {
    console.warn("ensure_direct_conversation error", error);
    return null;
  }
  return data as string;
}

export async function createGroupConversation(
  title: string,
  creatorUserId: string,
  memberIds: string[],
  avatarUrl?: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ type: "group", title, avatar_url: avatarUrl || null, created_by: creatorUserId })
    .select("id")
    .single();
  if (error) {
    console.warn("createGroupConversation error", error);
    return null;
  }
  const convId = conv.id as string;

  // Add creator as admin and others as members
  const rows = [
    { conversation_id: convId, user_id: creatorUserId, role: "admin" as const },
    ...memberIds
      .filter((id) => id !== creatorUserId)
      .map((id) => ({ conversation_id: convId, user_id: id, role: "member" as const })),
  ];
  await supabase.from("participants").insert(rows);

  return convId;
}

export async function kickUserFromConversation(conversationId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  if (error) {
    console.warn("kickUserFromConversation error", error);
    return false;
  }
  return true;
}

export type GroupMember = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function getGroupMembers(conversationId: string): Promise<GroupMember[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data: rows, error } = await supabase
    .from("participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  if (error) {
    console.warn("getGroupMembers participants error", error);
    return [];
  }
  const ids = (rows || []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profs, error: profErr } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  if (profErr) {
    console.warn("getGroupMembers profiles error", profErr);
    return [];
  }
  return (profs || []) as GroupMember[];
}
