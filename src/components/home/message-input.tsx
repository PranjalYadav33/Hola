import { Mic, Send } from "lucide-react";
import { Input } from "../ui/input";
import { useState } from "react";
import { Button } from "../ui/button";
import toast from "react-hot-toast";
import { useConversationStore } from "@/store/chat-store";
import MediaDropdown from "./media-dropdown";
import { sendTextMessage } from "@/lib/supabase/messages";

const MessageInput = () => {
  const [msgText, setMsgText] = useState("");
  const { selectedConversation } = useConversationStore();

  const handleSendTextMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedConversation) return;
      if (!msgText.trim()) return;
      const ok = await sendTextMessage(selectedConversation._id, msgText.trim());
      if (!ok) throw new Error("Failed to send message");
      setMsgText("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-gray-primary p-2 md:p-4 flex gap-2 md:gap-4 items-center">
      <div className="relative flex gap-2 ml-1 md:ml-2">
        <MediaDropdown />
      </div>
      <form onSubmit={handleSendTextMessage} className="w-full flex gap-2 md:gap-3">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Type a message"
            className="py-2 text-sm w-full rounded-lg shadow-sm bg-gray-tertiary focus-visible:ring-transparent"
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
          />
        </div>
        <div className="mr-2 md:mr-4 flex items-center gap-2 md:gap-3">
          {msgText.length > 0 ? (
            <Button
              type="submit"
              size={"sm"}
              className="bg-transparent text-foreground hover:bg-transparent p-2"
            >
              <Send size={18} className="md:w-5 md:h-5" />
            </Button>
          ) : (
            <Button
              type="submit"
              size={"sm"}
              className="bg-transparent text-foreground hover:bg-transparent"
            >
              <Mic />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
export default MessageInput;
