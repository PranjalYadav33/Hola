"use client";

import { Phone, PhoneOff, Video } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface IncomingCallDialogProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallDialog({ 
  callerName, 
  callType, 
  onAccept, 
  onReject 
}: IncomingCallDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10">
        {/* Incoming Call Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {callType === 'video' ? (
              <Video size={24} className="text-blue-400" />
            ) : (
              <Phone size={24} className="text-green-400" />
            )}
            <p className="text-white/80 text-sm">
              Incoming {callType} call
            </p>
          </div>
          
          {/* Caller Avatar */}
          <div className="mb-4">
            <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
              <AvatarImage src="/placeholder.png" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                {callerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Caller Name */}
          <h2 className="text-2xl font-semibold text-white mb-2">
            {callerName}
          </h2>
          
          {/* Call Type */}
          <p className="text-white/60 text-sm">
            {callType === 'video' ? 'Video call' : 'Voice call'}
          </p>
        </div>

        {/* Animated Ring Effect */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-2 border-green-400/30 animate-ping"></div>
            <div className="absolute w-24 h-24 rounded-full border-2 border-green-400/50 animate-ping animation-delay-75"></div>
            <div className="absolute w-16 h-16 rounded-full border-2 border-green-400/70 animate-ping animation-delay-150"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8">
          {/* Reject Button */}
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
          >
            <PhoneOff size={24} className="text-white" />
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg animate-pulse"
          >
            <Phone size={24} className="text-white" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button className="text-white/60 hover:text-white text-sm transition-colors">
            Message
          </button>
          <span className="text-white/30">•</span>
          <button className="text-white/60 hover:text-white text-sm transition-colors">
            Remind me
          </button>
        </div>
      </div>
    </div>
  );
}
