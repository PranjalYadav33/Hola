import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { ImageIcon, MessageSquareDiff } from "lucide-react";
import toast from "react-hot-toast";
import { useConversationStore } from "@/store/chat-store";
import { getOtherUsers, ensureProfile } from "@/lib/supabase/profiles";
import { createGroupConversation, ensureDirectConversation } from "@/lib/supabase/conversations";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";

const UserListDialog = () => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [renderedImage, setRenderedImage] = useState("");

  const imgRef = useRef<HTMLInputElement>(null);
  const dialogCloseRef = useRef<HTMLButtonElement>(null);
  const { user } = useSupabaseAuth();
  const [users, setUsers] = useState<any[] | null>(null);

  const { setSelectedConversation } = useConversationStore();

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;
    setIsLoading(true);
    try {
      const isGroup = selectedUsers.length > 1;

      let conversationId;
      if (!isGroup) {
        // direct chat
        conversationId = await ensureDirectConversation(selectedUsers[0]);
      } else {
        // upload group image to Supabase storage (optional)
        let avatarUrl: string | undefined = undefined;
        if (selectedImage) {
          const supabase = getSupabaseClient();
          if (supabase) {
            const ext = selectedImage.name.split(".").pop();
            const path = `group-avatars/${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("attachments")
              .upload(path, selectedImage, { cacheControl: "3600", upsert: false });
            if (!upErr) {
              const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path);
              avatarUrl = pub.publicUrl;
            }
          }
        }

        conversationId = await createGroupConversation(
          groupName,
          user?.id!,
          [...selectedUsers, user?.id!],
          avatarUrl
        );
      }

      dialogCloseRef.current?.click();
      setSelectedUsers([]);
      setGroupName("");
      setSelectedImage(null);

      const conversationName = isGroup
        ? groupName
        : users?.find((u) => u.id === selectedUsers[0])?.display_name;

      setSelectedConversation({
        _id: conversationId,
        participants: selectedUsers,
        isGroup,
        image: isGroup ? renderedImage : users?.find((u) => u.id === selectedUsers[0])?.avatar_url,
        name: conversationName,
        admin: user?.id!,
      });
    } catch (err) {
      toast.error("Failed to create conversation");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedImage) return setRenderedImage("");
    const reader = new FileReader();
    reader.onload = (e) => setRenderedImage(e.target?.result as string);
    reader.readAsDataURL(selectedImage);
  }, [selectedImage]);

  useEffect(() => {
    (async () => {
      const list = await getOtherUsers();
      setUsers(list);
      await ensureProfile();
    })();
  }, []);

  return (
    <Dialog>
      <DialogTrigger>
        <MessageSquareDiff size={20} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogClose ref={dialogCloseRef} />
          <DialogTitle>USERS</DialogTitle>
        </DialogHeader>

        <DialogDescription>Start a new chat</DialogDescription>
        {renderedImage && (
          <div className="w-16 h-16 relative mx-auto">
            <Image
              src={renderedImage}
              fill
              alt="user image"
              className="rounded-full object-cover"
            />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          ref={imgRef}
          hidden
          onChange={(e) => setSelectedImage(e.target.files![0])}
        />
        {selectedUsers.length > 1 && (
          <>
            <Input
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            <Button
              className="flex gap-2"
              onClick={() => imgRef.current?.click()}
            >
              <ImageIcon size={20} />
              Group Image
            </Button>
          </>
        )}
        <div className="flex flex-col gap-3 overflow-auto max-h-60">
          {users?.map((user) => (
            <div
              key={user.id}
              className={`flex gap-3 items-center p-2 rounded cursor-pointer active:scale-95 
									transition-all ease-in-out duration-300
								${selectedUsers.includes(user.id) ? "bg-green-primary" : ""}`}
              onClick={() => {
                if (selectedUsers.includes(user.id)) {
                  setSelectedUsers(
                    selectedUsers.filter((id) => id !== user.id)
                  );
                } else {
                  setSelectedUsers([...selectedUsers, user.id]);
                }
              }}
            >
              <Avatar className="overflow-visible">
                {/* Online indicator not implemented in Supabase version yet */}

                <AvatarImage
                  src={user.avatar_url || "/placeholder.png"}
                  className="rounded-full object-cover"
                />
                <AvatarFallback>
                  <div className="animate-pulse bg-gray-tertiary w-full h-full rounded-full"></div>
                </AvatarFallback>
              </Avatar>

              <div className="w-full ">
                <div className="flex items-center justify-between">
                  <p className="text-md font-medium">
                    {user.display_name || (user.email ? user.email.split("@")[0] : "User")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button variant={"outline"}>Cancel</Button>
          <Button
            onClick={handleCreateConversation}
            disabled={
              selectedUsers.length === 0 ||
              (selectedUsers.length > 1 && !groupName) ||
              isLoading
            }
          >
            {isLoading ? (
              <div className="w-5 h-5 border-t-2 border-b-2  rounded-full animate-spin" />
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default UserListDialog;
