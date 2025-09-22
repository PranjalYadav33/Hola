"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSupabaseAuth } from '@/providers/supabase-auth-provider';
import { PeerConnection } from '@/lib/webrtc/peer-connection';
import { SignalingService, CallSignal } from '@/lib/webrtc/signaling';
import { useCallNotifications } from '@/lib/call-notifications';
import { useCallErrorHandling, CallErrorInfo } from '@/lib/call-error-handler';
import CallInterface from '@/components/call/call-interface';
import IncomingCallDialog from '@/components/call/incoming-call-dialog';
import PreCallDialog from '@/components/call/pre-call-dialog';
import CallErrorDialog from '@/components/call/call-error-dialog';
import type { CallState } from '@/types/call';

// CallState type moved to `src/types/call.ts` for reuse

interface CallContextType {
  callState: CallState;
  initiateCall: (userId: string, conversationId: string, type: 'audio' | 'video') => void;
  startCall: (userId: string, conversationId: string, type: 'audio' | 'video') => Promise<void>;
  endCall: () => void;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
};

interface CallProviderProps {
  children: ReactNode;
}

export default function CallProvider({ children }: CallProviderProps) {
  const { user } = useSupabaseAuth();
  const {
    startIncomingCallNotification,
    stopIncomingCallNotification,
    showCallEndedNotification,
    showCallStartedNotification,
  } = useCallNotifications();
  
  const {
    handleCallError,
    attemptRecovery,
    createMediaError,
    createNetworkError,
    onError,
  } = useCallErrorHandling();
  
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isIncomingCall: false,
    callType: null,
    remoteUserId: null,
    conversationId: null,
    localStream: null,
    remoteStream: null,
  });

  const [peerConnection, setPeerConnection] = useState<PeerConnection | null>(null);
  const [signalingService, setSignalingService] = useState<SignalingService | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<CallSignal | null>(null);
  const [incomingCallNotification, setIncomingCallNotification] = useState<Notification | null>(null);
  
  // Pre-call dialog state
  const [showPreCallDialog, setShowPreCallDialog] = useState(false);
  const [pendingCallData, setPendingCallData] = useState<{
    userId: string;
    conversationId: string;
    type: 'audio' | 'video';
  } | null>(null);
  
  // Error dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [currentError, setCurrentError] = useState<CallErrorInfo | null>(null);
  
  // Call tracking for notifications
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  // Handle errors
  useEffect(() => {
    const unsubscribe = onError((error: CallErrorInfo) => {
      setCurrentError(error);
      setShowErrorDialog(true);
    });

    return unsubscribe;
  }, [onError]);

  // Define endCall early so it can be referenced in other hooks/callbacks below
  const endCall = useCallback(() => {
    // Calculate call duration for notification
    let duration = '00:00';
    if (callStartTime) {
      const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      duration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Stop notifications
    stopIncomingCallNotification();
    if (incomingCallNotification) {
      incomingCallNotification.close();
      setIncomingCallNotification(null);
    }

    // Show call ended notification if call was active
    if (callState.isInCall && callStartTime) {
      showCallEndedNotification(duration);
    }

    if (peerConnection) {
      peerConnection.endCall();
      setPeerConnection(null);
    }

    if (callState.localStream) {
      callState.localStream.getTracks().forEach((track) => track.stop());
    }

    setCallState({
      isInCall: false,
      isIncomingCall: false,
      callType: null,
      remoteUserId: null,
      conversationId: null,
      localStream: null,
      remoteStream: null,
    });

    setIncomingCallData(null);
    setCallStartTime(null);
  }, [peerConnection, callState.localStream, callState.isInCall, callStartTime, stopIncomingCallNotification, showCallEndedNotification, incomingCallNotification]);

  const handleIncomingSignal = useCallback((signal: CallSignal) => {
    switch (signal.signal_data.type) {
      case 'call-request':
        // Ignore if we're already in a call
        if (callState.isActive || callState.isIncomingCall) {
          return;
        }
        
        // Ensure we have valid signal data
        if (!signal.signal_data || !signal.signal_data.type) {
          return;
        }
        
        setIncomingCallData(signal);
        setCallState(prev => ({
          ...prev,
          isIncomingCall: true,
          callType: signal.signal_data.type,
          remoteUserId: signal.from_user,
          conversationId: signal.conversation_id,
        }));

        // Start notification for incoming call
        const callerName = signal.signal_data.callerName || 'Unknown';
        
        try {
          const notification = startIncomingCallNotification(callerName, signal.signal_data.type);
          setIncomingCallNotification(notification);
        } catch (error) {
          // Silently handle notification errors
        }
        break;

      case 'call-accept':
        {
          const acceptedType: 'audio' | 'video' | null = signal.signal_data?.type || callState.callType;
          if (peerConnection && acceptedType) {
          try {
            const localStream = await peerConnection.startCall(acceptedType === 'video', true);
            setCallState(prev => ({ ...prev, localStream }));
            
            // Set call start time and show notification
            setCallStartTime(Date.now());
            const callerName = signal.signal_data?.callerName || 'Unknown';
            showCallStartedNotification(callerName, acceptedType);
          } catch (error) {
            console.error('Error starting call after accept:', error);
            endCall();
          }
          }
        }
        break;

      case 'call-reject':
        endCall();
        break;

      case 'offer': {
        const offerType: 'audio' | 'video' | null = signal.signal_data?.callType || callState.callType;
        if (peerConnection && offerType) {
          try {
            const localStream = await peerConnection.answerCall(signal.signal_data, offerType === 'video', true);
            setCallState(prev => ({ ...prev, localStream }));
          } catch (error) {
            console.error('Error answering call:', error);
            endCall();
          }
        }
        break;
      }

      case 'answer':
        if (peerConnection) {
          await peerConnection.handleAnswer(signal.signal_data);
        }
        break;

      case 'ice-candidate':
        if (peerConnection) {
          await peerConnection.handleIceCandidate(signal.signal_data);
        }
        break;

      case 'end-call':
        endCall();
        break;
    }
  }, [peerConnection, callState.callType, endCall, startIncomingCallNotification, showCallStartedNotification]);

  // Now that handleIncomingSignal is stable, set up signaling subscription
  useEffect(() => {
    if (!user?.id) return;

    const signaling = new SignalingService(user.id);
    setSignalingService(signaling);

    signaling.onSignal(handleIncomingSignal);
    signaling.startListening();

    return () => {
      signaling.stopListening();
    };
  }, [user?.id, handleIncomingSignal]);

  const startCall = async (userId: string, conversationId: string, type: 'audio' | 'video') => {
    if (!signalingService || !user?.id) return;

    const pc = new PeerConnection();
    setPeerConnection(pc);

    // Set up signaling callback
    pc.setSendSignalCallback((signalType: string, data: any) => {
      // attach callType on SDP messages so callee knows whether it's video/audio
      const payload = (signalType === 'offer' || signalType === 'answer')
        ? { ...data, callType: type }
        : data;
      signalingService.sendSignal(userId, conversationId, signalType as any, payload);
    });

    pc.onRemoteStream((stream) => {
      setCallState(prev => ({ ...prev, remoteStream: stream }));
    });

    pc.onConnectionStateChange((state) => {
      console.log('Connection state:', state);
      if (state === 'failed' || state === 'disconnected') {
        endCall();
      }
    });

    setCallState({
      isInCall: true,
      isIncomingCall: false,
      callType: type,
      remoteUserId: userId,
      conversationId,
      localStream: null,
      remoteStream: null,
    });

    // Send call request with caller info
    await signalingService.sendSignal(userId, conversationId, 'call-request', { 
      type,
      callerName: user.user_metadata?.full_name || user.email || 'Unknown'
    });

    // Start the actual media stream
    try {
      const localStream = await pc.startCall(type === 'video', true);
      setCallState(prev => ({ ...prev, localStream }));
    } catch (error) {
      console.error('Error starting call:', error);
      const callError = createMediaError(error);
      handleCallError(callError);
      endCall();
    }
  };

  // New function to initiate call with pre-call dialog
  const initiateCall = (userId: string, conversationId: string, type: 'audio' | 'video') => {
    setPendingCallData({ userId, conversationId, type });
    setShowPreCallDialog(true);
  };

  const handlePreCallConfirm = async (type: 'audio' | 'video') => {
    if (!pendingCallData) return;
    
    setShowPreCallDialog(false);
    try {
      await startCall(pendingCallData.userId, pendingCallData.conversationId, type);
    } catch (error) {
      const callError = createMediaError(error);
      handleCallError(callError);
    }
    setPendingCallData(null);
  };

  const handlePreCallClose = () => {
    setShowPreCallDialog(false);
    setPendingCallData(null);
  };

  const handleErrorRetry = async () => {
    if (!currentError || !pendingCallData) {
      setShowErrorDialog(false);
      return;
    }

    const callId = `${pendingCallData.userId}-${pendingCallData.conversationId}`;
    const retrySuccess = await attemptRecovery(
      currentError,
      () => startCall(pendingCallData.userId, pendingCallData.conversationId, pendingCallData.type),
      callId
    );

    if (retrySuccess) {
      setShowErrorDialog(false);
      setCurrentError(null);
    }
  };

  const handleErrorClose = () => {
    setShowErrorDialog(false);
    setCurrentError(null);
    setPendingCallData(null);
  };

  const acceptCall = async () => {
    if (!signalingService || !incomingCallData) return;

    // Stop incoming call notifications
    stopIncomingCallNotification();
    if (incomingCallNotification) {
      incomingCallNotification.close();
      setIncomingCallNotification(null);
    }

    const pc = new PeerConnection();
    setPeerConnection(pc);

    // Set up signaling callback
    pc.setSendSignalCallback((signalType: string, data: any) => {
      const type = (incomingCallData?.signal_data?.type || callState.callType) as 'audio' | 'video' | null;
      const payload = (signalType === 'offer' || signalType === 'answer') && type
        ? { ...data, callType: type }
        : data;
      signalingService.sendSignal(incomingCallData.from_user, incomingCallData.conversation_id, signalType as any, payload);
    });

    pc.onRemoteStream((stream) => {
      setCallState(prev => ({ ...prev, remoteStream: stream }));
    });

    pc.onConnectionStateChange((state) => {
      console.log('Connection state:', state);
      if (state === 'failed' || state === 'disconnected') {
        endCall();
      }
    });

    setCallState(prev => ({
      ...prev,
      isInCall: true,
      isIncomingCall: false,
    }));

    // Send accept signal, include type so caller can start correct media
    await signalingService.sendSignal(
      incomingCallData.from_user,
      incomingCallData.conversation_id,
      'call-accept',
      { type: (incomingCallData?.signal_data?.type || callState.callType) as 'audio' | 'video' | undefined }
    );

    // Set call start time
    setCallStartTime(Date.now());
    
    // Show call started notification
    const callerName = incomingCallData.signal_data.callerName || 'Unknown';
    const callType = incomingCallData.signal_data.type;
    showCallStartedNotification(callerName, callType);

    setIncomingCallData(null);
  };

  const rejectCall = async () => {
    if (!signalingService || !incomingCallData) return;

    // Stop incoming call notifications
    stopIncomingCallNotification();
    if (incomingCallNotification) {
      incomingCallNotification.close();
      setIncomingCallNotification(null);
    }

    await signalingService.sendSignal(
      incomingCallData.from_user,
      incomingCallData.conversation_id,
      'call-reject',
      {}
    );

    setCallState({
      isInCall: false,
      isIncomingCall: false,
      callType: null,
      remoteUserId: null,
      conversationId: null,
      localStream: null,
      remoteStream: null,
    });

    setIncomingCallData(null);
  };

  

  return (
    <CallContext.Provider value={{
      callState,
      initiateCall,
      startCall,
      endCall,
      acceptCall,
      rejectCall,
    }}>
      {children}
      
      {callState.isInCall && peerConnection && (
        <CallInterface 
          peerConnection={peerConnection}
          callState={callState}
          onEndCall={endCall}
        />
      )}
      
      {callState.isIncomingCall && incomingCallData && (
        <IncomingCallDialog
          callerName={incomingCallData.signal_data.callerName || 'Unknown'}
          callType={callState.callType!}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

      {showPreCallDialog && pendingCallData && (
        <PreCallDialog
          isOpen={showPreCallDialog}
          callType={pendingCallData.type}
          onConfirm={handlePreCallConfirm}
          onClose={handlePreCallClose}
        />
      )}

      {showErrorDialog && currentError && (
        <CallErrorDialog
          isOpen={showErrorDialog}
          error={currentError}
          onRetry={currentError.recoverable ? handleErrorRetry : undefined}
          onClose={handleErrorClose}
        />
      )}
    </CallContext.Provider>
  );
}
