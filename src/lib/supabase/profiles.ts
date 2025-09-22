import { getSupabaseClient } from "@/lib/supabaseClient";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  about: string | null;
  last_seen_at: string | null;
  email?: string | null;
};

export async function ensureProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || null;
  const avatarUrl = user.user_metadata?.avatar_url || null;

  if (!existing) {
    const { data, error } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
    }).select("*").single();
    if (error) {
      console.warn("ensureProfile insert failed", error);
      return null;
    }
    return data as Profile;
  }

  // Optionally update changes
  const needsUpdate = (existing.display_name !== displayName) || (existing.avatar_url !== avatarUrl);
  if (needsUpdate) {
    await supabase.from("profiles").update({
      display_name: displayName,
      avatar_url: avatarUrl,
    }).eq("id", user.id);
  }
  return { ...existing, email: user.email } as Profile;
}

export async function getMeProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data) return null;
  return { ...data, email: user.email } as Profile;
}

export async function getOtherUsers(): Promise<Profile[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  const { data } = await supabase.from("profiles").select("*").neq("id", uid || "");
  return (data || []) as Profile[];
}
