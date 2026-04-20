import { supabase } from "@/integrations/supabase/client";

export interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
  last_message_at: string;
  message_count?: number;
}

export interface StoredMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function createSession(userId: string): Promise<ChatSession> {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as ChatSession;
}

export async function listSessions(userId: string): Promise<ChatSession[]> {
  const { data: sessions, error } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, last_message_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  const list = (sessions ?? []) as ChatSession[];
  if (list.length === 0) return [];

  const counts = await Promise.all(
    list.map(async (s) => {
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id);
      return count ?? 0;
    })
  );
  return list.map((s, i) => ({ ...s, message_count: counts[i] }));
}

export async function loadSessionMessages(sessionId: string): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, session_id, role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StoredMessage[];
}

export async function saveMessage(
  sessionId: string,
  userId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("chat_messages")
    .insert({ session_id: sessionId, user_id: userId, role, content });
  if (error) throw error;

  await supabase
    .from("chat_sessions")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function maybeSetSessionTitle(
  sessionId: string,
  firstUserMessage: string
): Promise<void> {
  const title = firstUserMessage.trim().slice(0, 60);
  if (!title) return;
  const { data } = await supabase
    .from("chat_sessions")
    .select("title")
    .eq("id", sessionId)
    .maybeSingle();
  if (data && (data.title === null || data.title === "")) {
    await supabase.from("chat_sessions").update({ title }).eq("id", sessionId);
  }
}

export async function buildCrossSessionMemory(
  userId: string,
  excludeSessionId: string
): Promise<string | null> {
  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("id, last_message_at")
    .eq("user_id", userId)
    .neq("id", excludeSessionId)
    .order("last_message_at", { ascending: false })
    .limit(3);

  if (!sessions || sessions.length === 0) return null;

  const summaries: string[] = [];
  for (const s of sessions) {
    const { data: firstAssistant } = await supabase
      .from("chat_messages")
      .select("content, created_at")
      .eq("session_id", s.id)
      .eq("role", "assistant")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (firstAssistant?.content) {
      const date = (s.last_message_at ?? firstAssistant.created_at).slice(0, 10);
      summaries.push(`- ${date}: ${firstAssistant.content.slice(0, 200)}`);
    }
  }

  if (summaries.length === 0) return null;
  return `Context from previous conversations with this user:\n${summaries.join("\n")}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function buildSessionHistoryPayload(
  history: StoredMessage[]
): Array<{ role: "user" | "assistant"; content: string }> {
  let recent = history.slice(-20);
  const total = recent.reduce((s, m) => s + estimateTokens(m.content), 0);
  if (total > 3000) recent = history.slice(-10);
  return recent.map((m) => ({ role: m.role, content: m.content }));
}
