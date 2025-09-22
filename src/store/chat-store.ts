import { create } from "zustand";

export type Conversation = {
  _id: any;
  image?: string;
  participants: string[];
  isGroup: boolean;
  name?: string;
  groupImage?: string;
  groupName?: string;
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

type ConversationStore = {
  selectedConversation: Conversation | null;
  setSelectedConversation: (conversation: Conversation | null) => void;
};

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversation: null,
  setSelectedConversation: (conversation) =>
    set({ selectedConversation: conversation }),
}));

export interface IMessage {
  _id: string;
  content: string;
  _creationTime: number;
  messageType: "text" | "image" | "video";
  sender: {
    _id: string;
    image: string;
    name?: string;
    tokenIdentifier?: string;
    email?: string;
    _creationTime: number;
    isOnline?: boolean;
  };
}
