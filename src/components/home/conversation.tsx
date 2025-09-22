import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSeenSvg } from "@/lib/svgs";
import { ImageIcon, Users, VideoIcon } from "lucide-react";
import { useConversationStore } from "@/store/chat-store";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";

const Conversation = ({ conversation }: { conversation: any }) => {
  const conversationImage = conversation.isGroup
    ? conversation.groupImage
    : conversation.otherImage ?? conversation.image;
  const conversationName = conversation.isGroup
    ? conversation.groupName
    : conversation.otherName ?? conversation.name;
  const lastMessage = conversation.lastMessage;
  const lastMessageType = lastMessage?.messageType;
  const { user } = useSupabaseAuth();

  const { setSelectedConversation, selectedConversation } =
    useConversationStore();
  const activeBgClass = selectedConversation?._id === conversation._id;

  return (
    <>
      <div
        className={`flex gap-2 md:gap-3 items-center p-2 md:p-3 hover:bg-chat-hover cursor-pointer
					${activeBgClass ? "bg-gray-tertiary" : ""}
				`}
        onClick={() => setSelectedConversation(conversation)}
      >
        <Avatar className="border border-gray-900 overflow-visible relative w-10 h-10 md:w-12 md:h-12">
          {conversation.isOnline && (
            <div className="absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 rounded-full border-2 border-foreground" />
          )}
          <AvatarImage
            src={conversationImage || "/placeholder.png"}
            className="object-cover rounded-full"
          />
          <AvatarFallback>
            <div className="animate-pulse bg-gray-tertiary w-full h-full rounded-full"></div>
          </AvatarFallback>
        </Avatar>
        <div className="w-full min-w-0">
          <div className="flex items-center">
            <h3 className="text-sm md:text-base font-medium truncate">{conversationName}</h3>
            <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">
              {formatDate(
                lastMessage?._creationTime || conversation._creationTime
              )}
            </span>
          </div>
          <p className="text-[12px] mt-1 text-gray-500 flex items-center gap-1 ">
            {lastMessage?.sender === user?.id ? <MessageSeenSvg /> : ""}
            {conversation.isGroup && <Users size={16} />}
            {!lastMessage && "Say Hi!"}
            {lastMessageType === "text" ? (
              lastMessage?.content.length > 30 ? (
                <span>{lastMessage?.content.slice(0, 30)}...</span>
              ) : (
                <span>{lastMessage?.content}</span>
              )
            ) : null}
            {lastMessageType === "image" && <ImageIcon size={16} />}
            {lastMessageType === "video" && <VideoIcon size={16} />}
          </p>
        </div>
      </div>
      <hr className="h-[1px] mx-10 bg-gray-primary" />
    </>
  );
};
export default Conversation;

