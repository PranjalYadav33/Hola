export class PeerConnection {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor() {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
    const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS || '').split(',').map(u => u.trim()).filter(Boolean);
    if (turnUrls.length) {
      iceServers.push({
        urls: turnUrls,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
      });
    }

    this.pc = new RTCPeerConnection({ iceServers });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate:', event.candidate);
        this.sendSignal('ice-candidate', event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      console.log('Received remote track:', event);
      // Some browsers may not populate event.streams; always build a MediaStream
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      // Avoid adding duplicate tracks
      const exists = this.remoteStream.getTracks().some((t) => t.id === event.track.id);
      if (!exists) {
        this.remoteStream.addTrack(event.track);
      }
      this.onRemoteStreamCallback?.(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      this.onConnectionStateChangeCallback?.(this.pc.connectionState);
    };
    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', this.pc.iceConnectionState);
    };
  }

  async startCall(video: boolean = true, audio: boolean = true) {
    try {
      console.log('Starting call with video:', video, 'audio:', audio);
      const constraints: MediaStreamConstraints = {
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('Got local stream:', this.localStream);

      this.localStream.getTracks().forEach(track => {
        console.log('Adding track:', track);
        this.pc.addTrack(track, this.localStream!);
      });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      
      console.log('Created offer:', offer);
      this.sendSignal('offer', offer);
      return this.localStream;
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async answerCall(offer: RTCSessionDescriptionInit, video: boolean = true, audio: boolean = true) {
    try {
      console.log('Answering call with offer:', offer);
      const constraints: MediaStreamConstraints = {
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }
          : false,
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : false,
      };
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      console.log('Got local stream for answer:', this.localStream);

      this.localStream.getTracks().forEach(track => {
        console.log('Adding track for answer:', track);
        this.pc.addTrack(track, this.localStream!);
      });

      await this.pc.setRemoteDescription(offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      
      console.log('Created answer:', answer);
      this.sendSignal('answer', answer);
      await this.flushPendingCandidates();
      return this.localStream;
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  private async flushPendingCandidates() {
    if (this.pendingCandidates.length && this.pc.remoteDescription) {
      const queue = [...this.pendingCandidates];
      this.pendingCandidates = [];
      for (const cand of queue) {
        try {
          await this.pc.addIceCandidate(cand);
        } catch (err) {
          console.warn('flush addIceCandidate error', err);
        }
      }
    }
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(answer);
    await this.flushPendingCandidates();
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc.remoteDescription) {
      // Queue candidates until remote description is set
      this.pendingCandidates.push(candidate);
      return;
    }
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn('addIceCandidate error', err);
    }
  }

  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.pc.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );

      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      videoTrack.onended = () => {
        this.stopScreenShare();
      };

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    try {
      const videoTrack = this.localStream?.getVideoTracks()[0];
      const sender = this.pc.getSenders().find(s => 
        s.track && s.track.kind === 'video'
      );

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
    }
  }

  toggleMicrophone() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  toggleCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    this.pc.close();
    this.sendSignal('end-call', {});
  }

  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void) {
    this.onConnectionStateChangeCallback = callback;
  }

  private sendSignal(type: string, data: any) {
    // This will be handled by the SignalingService
    // The CallManager will set up the actual signaling
  }

  setSendSignalCallback(callback: (type: string, data: any) => void) {
    this.sendSignal = callback;
  }
}
