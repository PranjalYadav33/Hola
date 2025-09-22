"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, X } from "lucide-react";
import MessageInput from "./message-input";
import MessageContainer from "./message-container";
import ChatPlaceHolder from "@/components/home/chat-placeholder";
import GroupMembersDialog from "./group-members-dialog";
import { useConversationStore } from "@/store/chat-store";
import { useCall } from "@/components/call/call-manager";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";
import { useState } from "react";

const RightPanel = () => {
  const { selectedConversation, setSelectedConversation } =
    useConversationStore();
  const { user } = useSupabaseAuth();
  const { initiateCall } = useCall();

  if (!selectedConversation) return <ChatPlaceHolder />;

  const conversationName = selectedConversation.isGroup
    ? selectedConversation.groupName
    : selectedConversation.otherName ?? selectedConversation.name;
  const conversationImage = selectedConversation.isGroup
    ? selectedConversation.groupImage
    : selectedConversation.otherImage ?? selectedConversation.image;
  const isOnline = selectedConversation.isOnline || false;

  const handleAudioCall = async () => {
    if (!selectedConversation || !user?.id) return;
    
    if (selectedConversation.isGroup) {
      // For group calls, you could implement a different logic
      alert("Group calls coming soon!");
      return;
    }

    // Get the other participant
    const otherUserId = selectedConversation.otherId || 
      selectedConversation.participants.find((id: string) => id !== user.id);
    
    if (otherUserId) {
      initiateCall(otherUserId, selectedConversation._id, 'audio');
    }
  };

  const handleVideoCall = async () => {
    if (!selectedConversation || !user?.id) return;
    
    if (selectedConversation.isGroup) {
      // For group calls, you could implement a different logic
      alert("Group calls coming soon!");
      return;
    }

    // Get the other participant
    const otherUserId = selectedConversation.otherId || 
      selectedConversation.participants.find((id: string) => id !== user.id);
    
    if (otherUserId) {
      initiateCall(otherUserId, selectedConversation._id, 'video');
    }
  };

  return (
    <div className="w-3/4 flex flex-col">
      <div className="w-full sticky top-0 z-50">
        {/* Header */}
        <div className="flex justify-between bg-gray-primary p-3">
          <div className="flex gap-3 items-center">
            <Avatar>
              <AvatarImage
                src={conversationImage || "/placeholder.png"}
                className="object-cover"
              />
              <AvatarFallback>
                <div className="animate-pulse bg-gray-tertiary w-full h-full rounded-full" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p>{conversationName}</p>
              {isOnline ? (
                <p className="text-[0.66rem]">Online</p>
              ) : (
                selectedConversation.isGroup && (
                  <GroupMembersDialog
                    selectedConversation={selectedConversation}
                  />
                )
              )}
            </div>
          </div>

          <div className="flex items-center gap-7 mr-5">
            <button onClick={handleAudioCall} title="Audio call" className="hover:opacity-80">
              <Phone size={20} />
            </button>
            <button onClick={handleVideoCall} title="Video call" className="hover:opacity-80">
              <Video size={23} />
            </button>
            <X
              size={16}
              className="cursor-pointer"
              onClick={() => setSelectedConversation(null)}
            />
          </div>
        </div>
      </div>
      {/* CHAT MESSAGES */}
      <MessageContainer />

      {/* INPUT */}
      <MessageInput />
    </div>
  );
};
export default RightPanel;

