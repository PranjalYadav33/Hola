"use client";

import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CallErrorInfo, CallErrorHandler } from '@/lib/call-error-handler';

interface CallErrorDialogProps {
  isOpen: boolean;
  error: CallErrorInfo | null;
  onRetry?: () => void;
  onClose: () => void;
}

export default function CallErrorDialog({ 
  isOpen, 
  error, 
  onRetry, 
  onClose 
}: CallErrorDialogProps) {
  if (!isOpen || !error) return null;

  const errorMessage = CallErrorHandler.getErrorMessage(error);
  const recoveryInstructions = CallErrorHandler.getRecoveryInstructions(error);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 w-full max-w-md mx-4 rounded-2xl p-6 border border-white/10 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-red-500/20">
            <AlertTriangle className="text-red-400" size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-white text-lg font-semibold mb-1">
              Call Error
            </h2>
            <p className="text-white/70 text-sm">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/80 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Details */}
        <div className="bg-black/30 rounded-lg p-3 border border-white/10 mb-4">
          <h3 className="text-white/90 text-sm font-medium mb-2">
            What to try:
          </h3>
          <ul className="space-y-1">
            {recoveryInstructions.map((instruction, index) => (
              <li key={index} className="text-white/70 text-xs flex items-start gap-2">
                <span className="text-white/50 mt-1">•</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Retry Information */}
        {error.recoverable && error.retryCount !== undefined && error.retryCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 mb-4">
            <p className="text-amber-200 text-xs">
              Retry attempt {error.retryCount} of 3
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
            onClick={onClose}
          >
            Close
          </Button>
          {error.recoverable && onRetry && (
            <Button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              onClick={onRetry}
            >
              <RefreshCw size={16} />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}