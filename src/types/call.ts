export type CallType = 'audio' | 'video';

export interface CallState {
  isInCall: boolean;
  isIncomingCall: boolean;
  callType: CallType | null;
  remoteUserId: string | null;
  conversationId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}
