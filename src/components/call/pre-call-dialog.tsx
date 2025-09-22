"use client";

import { useState } from "react";
import { Video, Phone, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreCallDialogProps {
  isOpen: boolean;
  callType: "audio" | "video";
  onConfirm: (type: "audio" | "video") => void;
  onClose: () => void;
}

export default function PreCallDialog({ isOpen, callType, onConfirm, onClose }: PreCallDialogProps) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requestPermissions = async () => {
    setError(null);
    setRequesting(true);
    try {
      const constraints: MediaStreamConstraints = {
        video: callType === "video",
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Immediately stop to release devices; we only needed the permission grant
      stream.getTracks().forEach((t) => t.stop());
      setRequesting(false);
      onConfirm(callType);
    } catch (e: any) {
      console.error("Permission request failed:", e);
      setError(
        e?.message ||
          "Permission denied. Please allow camera/microphone access in your browser settings and try again."
      );
      setRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 w-full max-w-md mx-4 rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          {callType === "video" ? (
            <Video className="text-blue-400" size={22} />
          ) : (
            <Phone className="text-green-400" size={22} />
          )}
          <h2 className="text-white text-lg font-semibold">
            {callType === "video" ? "Start Video Call" : "Start Audio Call"}
          </h2>
        </div>

        <p className="text-white/70 text-sm mb-4">
          We need your permission to use your {callType === "video" ? "camera and " : ""}microphone.
          Your browser will show a permission prompt.
        </p>

        <div className="bg-black/30 rounded-lg p-3 border border-white/10 mb-4 flex items-start gap-3">
          <Shield className="text-white/70 mt-0.5" size={16} />
          <p className="text-xs text-white/60">
            Permissions are used only during the call. You can change your choice
            at any time using the controls during the call.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 mb-3 flex items-start gap-2">
            <ShieldAlert className="text-red-400 mt-0.5" size={16} />
            <p className="text-xs text-red-200">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
            onClick={onClose}
            disabled={requesting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={requestPermissions}
            disabled={requesting}
          >
            {requesting ? "Requesting…" : "Allow & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
