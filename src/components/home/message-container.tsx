import ChatBubble from "./chat-bubble";
import { useConversationStore } from "@/store/chat-store";
import { useEffect, useRef, useState } from "react";
import { fetchMessages, subscribeToMessages, type UIMessage } from "@/lib/supabase/messages";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";

const MessageContainer = () => {
  const { selectedConversation } = useConversationStore();
  const { user } = useSupabaseAuth();
  const [messages, setMessages] = useState<UIMessage[] | undefined>(undefined);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      if (!selectedConversation) {
        setMessages(undefined);
        return;
      }

      const list = await fetchMessages(selectedConversation._id);
      if (!mounted) return;
      setMessages(list);
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);

      // subscribe to real-time messages
      unsubscribe = subscribeToMessages(selectedConversation._id, (m) => {
        setMessages((prev) => {
          // Avoid duplicates by checking if message already exists
          if (prev && prev.some((msg) => msg._id === m._id)) {
            return prev;
          }
          return prev ? [...prev, m] : [m];
        });
        setTimeout(() => {
          lastMessageRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      });
    })();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [selectedConversation]);

  return (
    <div className="relative p-3 flex-1 overflow-auto h-full bg-chat-tile-light dark:bg-chat-tile-dark">
      <div className="mx-12 flex flex-col gap-3">
        {messages?.map((msg, idx) => (
          <div key={msg._id} ref={lastMessageRef}>
            <ChatBubble
              me={{ _id: user?.id, name: user?.user_metadata?.full_name, image: user?.user_metadata?.avatar_url }}
              message={msg as any}
              previousMessage={idx > 0 ? (messages[idx - 1] as any) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
export default MessageContainer;

