import { Lock, MessageCircle, Users, Plus } from "lucide-react";

const ChatPlaceHolder = () => {
  return (
    <div className="w-3/4 bg-gray-secondary flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
          <MessageCircle size={40} className="text-green-500" />
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-light text-foreground">Welcome to Hola</h2>
        
        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed">
          Send and receive messages without keeping your phone online.
          Use Hola on up to 4 linked devices and 1 mobile phone.
        </p>
        
        {/* Features */}
        <div className="flex items-center gap-8 mt-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <MessageCircle size={20} className="text-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground">Messages</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users size={20} className="text-purple-500" />
            </div>
            <span className="text-xs text-muted-foreground">Groups</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Plus size={20} className="text-orange-500" />
            </div>
            <span className="text-xs text-muted-foreground">New Chat</span>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-6 flex items-center gap-1 text-xs text-muted-foreground">
        <Lock size={12} />
        <span>Your personal messages are end-to-end encrypted</span>
      </div>
    </div>
  );
};
export default ChatPlaceHolder;
