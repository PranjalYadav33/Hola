import { useEffect, useRef } from 'react';

export class CallNotificationService {
  private static instance: CallNotificationService;
  private ringtoneAudio: HTMLAudioElement | null = null;
  private notificationSound: HTMLAudioElement | null = null;

  private constructor() {
    this.initializeAudioElements();
  }

  public static getInstance(): CallNotificationService {
    if (!CallNotificationService.instance) {
      CallNotificationService.instance = new CallNotificationService();
    }
    return CallNotificationService.instance;
  }

  private initializeAudioElements() {
    if (typeof window === 'undefined') return;

    // Create ringtone for incoming calls
    this.ringtoneAudio = new Audio();
    this.ringtoneAudio.loop = true;
    this.ringtoneAudio.volume = 0.7;
    
    // Use a web-based ringtone sound (you can replace with your own)
    // For now, we'll use a data URI for a simple tone
    const ringtoneDataUri = "data:audio/wav;base64,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";
    
    try {
      // Try to use a more pleasant ringtone sound
      this.ringtoneAudio.src = ringtoneDataUri;
    } catch (error) {
      console.warn('Failed to load ringtone, using fallback');
    }

    // Create notification sound for call events
    this.notificationSound = new Audio();
    this.notificationSound.volume = 0.5;
    
    // Simple notification beep
    const beepDataUri = "data:audio/wav;base64,UklGRt4CAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YboCAAC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4";
    this.notificationSound.src = beepDataUri;
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  public startRingtone(): void {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.currentTime = 0;
      this.ringtoneAudio.play().catch(console.error);
    }
  }

  public stopRingtone(): void {
    if (this.ringtoneAudio) {
      this.ringtoneAudio.pause();
      this.ringtoneAudio.currentTime = 0;
    }
  }

  public playNotificationSound(): void {
    if (this.notificationSound) {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(console.error);
    }
  }

  public showBrowserNotification(
    title: string, 
    options: {
      body?: string;
      icon?: string;
      tag?: string;
      requireInteraction?: boolean;
    } = {}
  ): Notification | null {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/hola-logo.svg',
        tag: options.tag || 'whatsapp-call',
        requireInteraction: options.requireInteraction || true,
        ...options
      });

      return notification;
    }
    return null;
  }

  public vibrateDevice(pattern: number | number[] = 200): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  public cleanup(): void {
    this.stopRingtone();
    if (this.ringtoneAudio) {
      this.ringtoneAudio.remove();
      this.ringtoneAudio = null;
    }
    if (this.notificationSound) {
      this.notificationSound.remove();
      this.notificationSound = null;
    }
  }
}

// Custom hook for using call notifications
export function useCallNotifications() {
  const notificationService = useRef<CallNotificationService | null>(null);

  useEffect(() => {
    notificationService.current = CallNotificationService.getInstance();

    // Request notification permission on mount
    notificationService.current.requestNotificationPermission();

    return () => {
      // Don't cleanup the singleton, but stop any active sounds
      notificationService.current?.stopRingtone();
    };
  }, []);

  const startIncomingCallNotification = (callerName: string, callType: 'audio' | 'video') => {
    if (!notificationService.current) return null;

    // Start ringtone
    notificationService.current.startRingtone();

    // Vibrate device
    notificationService.current.vibrateDevice([200, 100, 200, 100, 200]);

    // Show browser notification
    const notification = notificationService.current.showBrowserNotification(
      `Incoming ${callType} call`,
      {
        body: `${callerName} is calling you`,
        tag: 'incoming-call',
        requireInteraction: true,
      }
    );

    return notification;
  };

  const stopIncomingCallNotification = () => {
    notificationService.current?.stopRingtone();
  };

  const showCallEndedNotification = (duration: string) => {
    notificationService.current?.playNotificationSound();
    notificationService.current?.showBrowserNotification(
      'Call ended',
      {
        body: `Call duration: ${duration}`,
        tag: 'call-ended',
        requireInteraction: false,
      }
    );
  };

  const showCallStartedNotification = (callerName: string, callType: 'audio' | 'video') => {
    notificationService.current?.playNotificationSound();
    notificationService.current?.showBrowserNotification(
      `${callType === 'video' ? 'Video' : 'Audio'} call started`,
      {
        body: `Connected with ${callerName}`,
        tag: 'call-started',
        requireInteraction: false,
      }
    );
  };

  return {
    startIncomingCallNotification,
    stopIncomingCallNotification,
    showCallEndedNotification,
    showCallStartedNotification,
    notificationService: notificationService.current,
  };
}