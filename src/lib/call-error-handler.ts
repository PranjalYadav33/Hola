export type CallError = 
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'CONNECTION_FAILED'
  | 'PEER_UNAVAILABLE'
  | 'CALL_REJECTED'
  | 'UNKNOWN_ERROR';

export interface CallErrorInfo {
  type: CallError;
  message: string;
  details?: any;
  recoverable: boolean;
  retryCount?: number;
}

export class CallErrorHandler {
  private static instance: CallErrorHandler;
  private errorCallbacks: ((error: CallErrorInfo) => void)[] = [];

  private constructor() {}

  public static getInstance(): CallErrorHandler {
    if (!CallErrorHandler.instance) {
      CallErrorHandler.instance = new CallErrorHandler();
    }
    return CallErrorHandler.instance;
  }

  public onError(callback: (error: CallErrorInfo) => void): void {
    this.errorCallbacks.push(callback);
  }

  public removeErrorCallback(callback: (error: CallErrorInfo) => void): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  public handleError(error: CallErrorInfo): void {
    console.error('Call Error:', error);
    this.errorCallbacks.forEach(callback => callback(error));
  }

  public static createError(
    type: CallError,
    message: string,
    details?: any,
    recoverable = false,
    retryCount = 0
  ): CallErrorInfo {
    return {
      type,
      message,
      details,
      recoverable,
      retryCount,
    };
  }

  public static fromMediaError(error: any): CallErrorInfo {
    if (error.name === 'NotAllowedError') {
      return CallErrorHandler.createError(
        'PERMISSION_DENIED',
        'Camera and microphone access denied. Please allow permissions and try again.',
        error,
        true
      );
    }
    
    if (error.name === 'NotFoundError') {
      return CallErrorHandler.createError(
        'DEVICE_NOT_FOUND',
        'No camera or microphone found. Please connect a device and try again.',
        error,
        true
      );
    }

    if (error.name === 'NotReadableError') {
      return CallErrorHandler.createError(
        'DEVICE_NOT_FOUND',
        'Camera or microphone is already in use by another application.',
        error,
        true
      );
    }

    return CallErrorHandler.createError(
      'UNKNOWN_ERROR',
      'An unknown error occurred while accessing media devices.',
      error,
      false
    );
  }

  public static fromNetworkError(error: any): CallErrorInfo {
    if (error.code === 'NETWORK_FAILURE') {
      return CallErrorHandler.createError(
        'NETWORK_ERROR',
        'Network connection failed. Please check your internet connection.',
        error,
        true
      );
    }

    return CallErrorHandler.createError(
      'CONNECTION_FAILED',
      'Failed to establish connection with the remote peer.',
      error,
      true
    );
  }

  public static getErrorMessage(error: CallErrorInfo): string {
    const baseMessages: Record<CallError, string> = {
      PERMISSION_DENIED: 'Camera and microphone permissions are required for calls.',
      DEVICE_NOT_FOUND: 'No camera or microphone device found.',
      NETWORK_ERROR: 'Network connection issue detected.',
      CONNECTION_FAILED: 'Failed to connect to the other participant.',
      PEER_UNAVAILABLE: 'The other participant is currently unavailable.',
      CALL_REJECTED: 'Call was rejected by the other participant.',
      UNKNOWN_ERROR: 'An unexpected error occurred.',
    };

    return error.message || baseMessages[error.type];
  }

  public static getRecoveryInstructions(error: CallErrorInfo): string[] {
    const instructions: Record<CallError, string[]> = {
      PERMISSION_DENIED: [
        'Click the camera/microphone icon in your browser address bar',
        'Select "Always allow" for this site',
        'Refresh the page and try calling again'
      ],
      DEVICE_NOT_FOUND: [
        'Make sure your camera and microphone are connected',
        'Check if other applications are using your devices',
        'Try refreshing the page'
      ],
      NETWORK_ERROR: [
        'Check your internet connection',
        'Try switching to a more stable network',
        'Wait a moment and try again'
      ],
      CONNECTION_FAILED: [
        'Check your internet connection',
        'Ask the other person to check their connection',
        'Try calling again in a moment'
      ],
      PEER_UNAVAILABLE: [
        'The other person may not be online',
        'Try calling them later',
        'Send them a message to let them know you\'re trying to call'
      ],
      CALL_REJECTED: [
        'The other person declined your call',
        'You can try calling again later',
        'Consider sending a message first'
      ],
      UNKNOWN_ERROR: [
        'Try refreshing the page',
        'Check your browser permissions',
        'Contact support if the issue persists'
      ],
    };

    return instructions[error.type] || ['Try refreshing the page and calling again'];
  }
}

export class CallRecoveryManager {
  private static instance: CallRecoveryManager;
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;
  private retryDelay = 2000; // 2 seconds

  private constructor() {}

  public static getInstance(): CallRecoveryManager {
    if (!CallRecoveryManager.instance) {
      CallRecoveryManager.instance = new CallRecoveryManager();
    }
    return CallRecoveryManager.instance;
  }

  public async attemptRecovery(
    error: CallErrorInfo,
    retryFunction: () => Promise<void>,
    callId: string
  ): Promise<boolean> {
    if (!error.recoverable) {
      return false;
    }

    const currentRetries = this.retryAttempts.get(callId) || 0;
    
    if (currentRetries >= this.maxRetries) {
      console.log(`Max retries exceeded for call ${callId}`);
      this.retryAttempts.delete(callId);
      return false;
    }

    // Wait before retrying
    await this.delay(this.retryDelay * (currentRetries + 1)); // Exponential backoff

    this.retryAttempts.set(callId, currentRetries + 1);

    try {
      await retryFunction();
      this.retryAttempts.delete(callId); // Success, reset counter
      return true;
    } catch (retryError) {
      console.error(`Retry ${currentRetries + 1} failed:`, retryError);
      return false;
    }
  }

  public resetRetryCount(callId: string): void {
    this.retryAttempts.delete(callId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// React hook for call error handling
import { useCallback, useEffect, useRef } from 'react';

export function useCallErrorHandling() {
  const errorHandler = useRef<CallErrorHandler>();
  const recoveryManager = useRef<CallRecoveryManager>();

  useEffect(() => {
    errorHandler.current = CallErrorHandler.getInstance();
    recoveryManager.current = CallRecoveryManager.getInstance();
  }, []);

  const handleCallError = useCallback((error: CallErrorInfo) => {
    errorHandler.current?.handleError(error);
  }, []);

  const attemptRecovery = useCallback(async (
    error: CallErrorInfo,
    retryFunction: () => Promise<void>,
    callId: string
  ): Promise<boolean> => {
    if (!recoveryManager.current) return false;
    return recoveryManager.current.attemptRecovery(error, retryFunction, callId);
  }, []);

  const createMediaError = useCallback((error: any): CallErrorInfo => {
    return CallErrorHandler.fromMediaError(error);
  }, []);

  const createNetworkError = useCallback((error: any): CallErrorInfo => {
    return CallErrorHandler.fromNetworkError(error);
  }, []);

  const onError = useCallback((callback: (error: CallErrorInfo) => void) => {
    errorHandler.current?.onError(callback);
    
    return () => {
      errorHandler.current?.removeErrorCallback(callback);
    };
  }, []);

  return {
    handleCallError,
    attemptRecovery,
    createMediaError,
    createNetworkError,
    onError,
    getErrorMessage: CallErrorHandler.getErrorMessage,
    getRecoveryInstructions: CallErrorHandler.getRecoveryInstructions,
  };
}