"use client";
import { ListFilter, Search } from "lucide-react";
import { Input } from "../ui/input";
import ThemeSwitch from "./theme-switch";
import Conversation from "./conversation";
import SupabaseUserMenu from "@/components/supabase-user-menu";

import UserListDialog from "./user-list-dialog";
import { useEffect, useState } from "react";
import { useConversationStore } from "@/store/chat-store";
import { getMyConversationsForUI, type UIConversation } from "@/lib/supabase/conversations";
import { getSupabaseClient } from "@/lib/supabaseClient";

const LeftPanel = () => {
  const [conversations, setConversations] = useState<UIConversation[] | null>(null);

  const { selectedConversation, setSelectedConversation } =
    useConversationStore();

  useEffect(() => {
    (async () => {
      const list = await getMyConversationsForUI();
      setConversations(list);
    })();

    // Subscribe to real-time updates for new messages
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`messages-updates-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async () => {
          // Refresh conversations when new message arrives
          const list = await getMyConversationsForUI();
          setConversations(list);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const conversationIds = conversations?.map((c) => c._id);
    if (selectedConversation && conversationIds && !conversationIds.includes(selectedConversation._id)) {
      setSelectedConversation(null);
    }
  }, [conversations, selectedConversation, setSelectedConversation]);

  return (
    <div className={`
      w-full md:w-1/4 border-gray-600 md:border-r
      ${selectedConversation ? 'hidden md:block' : 'block'}
    `}>
      <div className="sticky top-0 bg-left-panel z-10">
        {/* Header */}
        <div className="flex justify-between bg-gray-primary p-3 items-center">
          <SupabaseUserMenu />

          <div className="flex items-center gap-2 md:gap-3">
            <UserListDialog />
            <ThemeSwitch />
          </div>
        </div>
        <div className="p-3 flex items-center">
          {/* Search */}
          <div className="relative h-10 mx-1 md:mx-3 flex-1">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 z-10"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search or start a new chat"
              className="pl-10 py-2 text-sm w-full rounded shadow-sm bg-gray-primary focus-visible:ring-transparent"
            />
          </div>
          <ListFilter className="cursor-pointer" />
        </div>
      </div>

      {/* Chat List */}
      <div className="my-3 flex flex-col gap-0 max-h-[80%] overflow-auto">
        {/* Conversations will go here*/}
        {conversations?.map((conversation) => (
          <Conversation key={conversation._id} conversation={conversation} />
        ))}

        {conversations?.length === 0 && (
          <>
            <p className="text-center text-gray-500 text-sm mt-3">
              No conversations yet
            </p>
            <p className="text-center text-gray-500 text-sm mt-3 ">
              We understand {"you're"} an introvert, but {"you've"} got to start
              somewhere 😊
            </p>
          </>
        )}
      </div>
    </div>
  );
};
export default LeftPanel;

