import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Crown } from "lucide-react";
import { Conversation } from "@/store/chat-store";
import { useEffect, useState } from "react";
import { getGroupMembers, type GroupMember } from "@/lib/supabase/conversations";

type GroupMembersDialogProps = {
  selectedConversation: Conversation;
};

const GroupMembersDialog = ({
  selectedConversation,
}: GroupMembersDialogProps) => {
  const [users, setUsers] = useState<GroupMember[] | null>(null);
  useEffect(() => {
    (async () => {
      const list = await getGroupMembers(selectedConversation._id as string);
      setUsers(list);
    })();
  }, [selectedConversation._id]);
  return (
    <Dialog>
      <DialogTrigger>
        <p className="text-xs text-muted-foreground text-left">See members</p>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="my-2">Current Members</DialogTitle>
          <DialogDescription>
            <div className="flex flex-col gap-3 ">
              {users?.map((user) => (
                <div
                  key={user.id}
                  className={`flex gap-3 items-center p-2 rounded`}
                >
                  <Avatar className="overflow-visible">
                    <AvatarImage
                      src={user.avatar_url || "/placeholder.png"}
                      className="rounded-full object-cover"
                    />
                    <AvatarFallback>
                      <div className="animate-pulse bg-gray-tertiary w-full h-full rounded-full"></div>
                    </AvatarFallback>
                  </Avatar>

                  <div className="w-full ">
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-medium">
                        {/* johndoe@gmail.com */}
                        {user.display_name || "User"}
                      </h3>
                      {user.id === selectedConversation.admin && (
                        <Crown size={16} className="text-yellow-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
export default GroupMembersDialog;

