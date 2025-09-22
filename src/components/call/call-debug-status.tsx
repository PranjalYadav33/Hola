"use client";

import { useCall } from "@/components/call/call-manager";
import { useSupabaseAuth } from "@/providers/supabase-auth-provider";

export default function CallDebugStatus() {
  const { callState } = useCall();
  const { user } = useSupabaseAuth();
  
  // Only show in development or for debugging
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white text-xs p-3 rounded-lg font-mono max-w-sm z-50">
      <h3 className="font-bold text-green-400 mb-2">Call Debug Status</h3>
      <div>User ID: {user?.id?.slice(-8) || "None"}</div>
      <div>Is In Call: {callState.isInCall ? "✅ Yes" : "❌ No"}</div>
      <div>Is Incoming: {callState.isIncomingCall ? "✅ Yes" : "❌ No"}</div>
      <div>Call Type: {callState.callType || "None"}</div>
      <div>Remote User: {callState.remoteUserId?.slice(-8) || "None"}</div>
      <div>Conversation: {callState.conversationId?.slice(-8) || "None"}</div>
      
      {callState.isIncomingCall && (
        <div className="mt-2 p-2 bg-red-500/20 rounded">
          <div className="text-red-300 font-bold">📞 INCOMING CALL!</div>
          <div>Should show popup now</div>
        </div>
      )}
    </div>
  );
}