"use client";

import { useEffect, useRef, useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Signal,
  Settings,
  MoreVertical
} from 'lucide-react';
import { PeerConnection } from '@/lib/webrtc/peer-connection';
import CallSettings, { CallSettings as CallSettingsType } from './call-settings';

interface CallInterfaceProps {
  peerConnection: PeerConnection;
  callState: any;
  onEndCall: () => void;
}

export default function CallInterface({ peerConnection, callState, onEndCall }: CallInterfaceProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showMoreControls, setShowMoreControls] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Call status and timer
  const [callStartTime] = useState(Date.now());
  const [callDuration, setCallDuration] = useState('00:00');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [isConnected, setIsConnected] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setCallDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  // Monitor connection quality
  useEffect(() => {
    if (!peerConnection) return;

    const checkConnectionQuality = () => {
      // This is a simplified connection quality check
      // In a real implementation, you'd get connection state from the peer connection
      // For now, we'll simulate based on stream availability
      if (callState.remoteStream && callState.localStream) {
        setIsConnected(true);
        setConnectionQuality('good');
      } else if (callState.localStream) {
        setIsConnected(false);
        setConnectionQuality('unknown');
      } else {
        setIsConnected(false);
        setConnectionQuality('poor');
      }
    };

    const interval = setInterval(checkConnectionQuality, 1000);
    return () => clearInterval(interval);
  }, [peerConnection, callState.localStream, callState.remoteStream]);

  useEffect(() => {
    console.log('Local stream changed:', callState.localStream);
    if (callState.localStream) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = callState.localStream;
        localVideoRef.current.play().catch(console.error);
      }
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = callState.localStream;
        localAudioRef.current.play().catch(console.error);
      }
    }
  }, [callState.localStream]);

  useEffect(() => {
    console.log('Remote stream changed:', callState.remoteStream);
    if (callState.remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = callState.remoteStream;
        remoteVideoRef.current.play().catch(console.error);
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = callState.remoteStream;
        remoteAudioRef.current.play().catch(console.error);
      }
    }
  }, [callState.remoteStream]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (!showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);

  const toggleMute = () => {
    const enabled = peerConnection.toggleMicrophone();
    setIsMuted(!enabled);
  };

  const toggleVideo = () => {
    const enabled = peerConnection.toggleCamera();
    setIsVideoOff(!enabled);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await peerConnection.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await peerConnection.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSettingsChange = (settings: CallSettingsType) => {
    console.log('Settings updated:', settings);
    // Here you could apply the settings to the peer connection
  };

  const primaryControls = [
    {
      icon: isMuted ? MicOff : Mic,
      onClick: toggleMute,
      active: isMuted,
      title: isMuted ? 'Unmute' : 'Mute',
      type: 'mute' as const
    },
    ...(callState.callType === 'video' ? [{
      icon: isVideoOff ? VideoOff : Video,
      onClick: toggleVideo,
      active: isVideoOff,
      title: isVideoOff ? 'Turn on camera' : 'Turn off camera',
      type: 'video' as const
    }] : []),
    {
      icon: PhoneOff,
      onClick: onEndCall,
      active: false,
      title: 'End call',
      type: 'endCall' as const
    }
  ];

  const secondaryControls = [
    {
      icon: isScreenSharing ? MonitorOff : Monitor,
      onClick: toggleScreenShare,
      active: isScreenSharing,
      title: isScreenSharing ? 'Stop sharing' : 'Share screen',
      type: 'screenShare' as const
    },
    {
      icon: isFullscreen ? Minimize2 : Maximize2,
      onClick: toggleFullscreen,
      active: isFullscreen,
      title: isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen',
      type: 'fullscreen' as const
    },
    {
      icon: Settings,
      onClick: () => setShowSettings(true),
      active: false,
      title: 'Call settings',
      type: 'settings' as const
    }
  ];

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Signal size={16} className="text-green-500" />;
      case 'good':
        return <Wifi size={16} className="text-yellow-500" />;
      case 'poor':
        return <WifiOff size={16} className="text-red-500" />;
      default:
        return <Wifi size={16} className="text-gray-500" />;
    }
  };

  const getConnectionColor = () => {
    switch (connectionQuality) {
      case 'excellent':
        return 'bg-green-500/20 text-green-400';
      case 'good':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'poor':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={() => !isMobile && setShowControls(true)}
      onTouchStart={() => isMobile && setShowControls(true)}
    >
      {/* Remote Video (Main) */}
      <div className="flex-1 relative">
        {callState.callType === 'video' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-2xl md:text-4xl">🎵</span>
              </div>
              <p className="text-white text-lg md:text-xl">Audio Call</p>
            </div>
          </div>
        )}
        
        {/* Audio element for remote stream (always present) */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Local Video (Picture-in-Picture) - Mobile responsive */}
        {callState.callType === 'video' && (
          <div className={`absolute top-4 right-4 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20 ${
            isMobile ? 'w-24 h-32' : 'w-48 h-36'
          }`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Audio element for local stream (always present) */}
        <audio ref={localAudioRef} autoPlay playsInline muted className="hidden" />

        {/* Enhanced Call Info - Mobile responsive */}
        <div className="absolute top-4 left-4 text-white">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 md:px-4 md:py-2">
            <div className="flex items-center gap-2 mb-1">
              <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {callState.callType === 'video' ? '📹' : '📞'} 
                {callState.callType === 'video' ? ' Video Call' : ' Audio Call'}
              </p>
            </div>
            <div className={`flex items-center gap-2 text-white/80 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              <span>{callDuration}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                {getConnectionIcon()}
                <span className="capitalize">{connectionQuality}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Connection Status */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
          <div className={`flex items-center gap-2 backdrop-blur-sm rounded-full px-3 py-1 ${getConnectionColor()}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`font-medium ${isMobile ? 'text-xs' : 'text-xs'}`}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-responsive Controls */}
      <div className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ${
        showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}>
        <div className="bg-gradient-to-t from-black/80 to-transparent p-4 md:p-6">
          {/* Primary Controls */}
          <div className={`flex items-center justify-center gap-3 md:gap-4 ${isMobile ? 'mb-3' : ''}`}>
            {primaryControls.map((control, index) => (
              <button
                key={index}
                onClick={control.onClick}
                className={`${
                  control.type === 'endCall' 
                    ? 'w-14 h-14 md:w-16 md:h-16 bg-red-500 hover:bg-red-600' 
                    : `w-12 h-12 md:w-14 md:h-14 ${
                        control.active 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                      }`
                } rounded-full flex items-center justify-center transition-all ${
                  control.type === 'endCall' ? 'ml-2 md:ml-4' : ''
                }`}
                title={control.title}
              >
                <control.icon size={isMobile ? 20 : (control.type === 'endCall' ? 28 : 24)} className="text-white" />
              </button>
            ))}
          </div>

          {/* Secondary Controls - Desktop or expanded mobile */}
          {(!isMobile || showMoreControls) && (
            <div className="flex items-center justify-center gap-3 md:gap-4 mt-3 md:mt-0">
              {secondaryControls.map((control, index) => (
                <button
                  key={index}
                  onClick={control.onClick}
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all ${
                    control.active 
                      ? 'bg-blue-500 hover:bg-blue-600' 
                      : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                  }`}
                  title={control.title}
                >
                  <control.icon size={isMobile ? 16 : 20} className="text-white" />
                </button>
              ))}
            </div>
          )}

          {/* Mobile More Controls Button */}
          {isMobile && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowMoreControls(!showMoreControls)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all"
                title="More controls"
              >
                <MoreVertical size={16} className="text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Screen Share Indicator */}
      {isScreenSharing && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-500/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <Monitor size={16} className="text-white" />
            <span className={`text-white font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Sharing Screen
            </span>
          </div>
        </div>
      )}

      {/* Call Settings Dialog */}
      <CallSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}