"use client";

import { useState, useEffect } from 'react';
import { Settings, Mic, Camera, Volume2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CallSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: CallSettings) => void;
}

export interface CallSettings {
  videoQuality: 'low' | 'medium' | 'high';
  audioQuality: 'low' | 'medium' | 'high';
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  preferredVideoDevice?: string;
  preferredAudioDevice?: string;
}

const defaultSettings: CallSettings = {
  videoQuality: 'medium',
  audioQuality: 'high',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export default function CallSettings({ isOpen, onClose, onSettingsChange }: CallSettingsProps) {
  const [settings, setSettings] = useState<CallSettings>(defaultSettings);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      loadSettings();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter(device => device.kind === 'videoinput'));
      setAudioDevices(devices.filter(device => device.kind === 'audioinput'));
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
    setLoading(false);
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('whatsapp-call-settings');
      if (saved) {
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('whatsapp-call-settings', JSON.stringify(settings));
      onSettingsChange?.(settings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const updateSetting = <K extends keyof CallSettings>(
    key: K,
    value: CallSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 w-full max-w-lg mx-4 rounded-2xl p-6 border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="text-blue-400" size={24} />
          <h2 className="text-white text-xl font-semibold">Call Settings</h2>
        </div>

        <div className="space-y-6">
          {/* Video Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Camera className="text-white/70" size={18} />
              <h3 className="text-white font-medium">Video Settings</h3>
            </div>
            
            {/* Video Quality */}
            <div className="ml-6 space-y-2">
              <label className="text-white/90 text-sm">Video Quality</label>
              <select
                value={settings.videoQuality}
                onChange={(e) => updateSetting('videoQuality', e.target.value as any)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="low">Low (480p) - Better for slow connections</option>
                <option value="medium">Medium (720p) - Balanced</option>
                <option value="high">High (1080p) - Best quality</option>
              </select>
            </div>

            {/* Video Device */}
            <div className="ml-6 space-y-2">
              <label className="text-white/90 text-sm">Camera</label>
              <select
                value={settings.preferredVideoDevice || ''}
                onChange={(e) => updateSetting('preferredVideoDevice', e.target.value || undefined)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
                disabled={loading}
              >
                <option value="">Default Camera</option>
                {videoDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="text-white/70" size={18} />
              <h3 className="text-white font-medium">Audio Settings</h3>
            </div>
            
            {/* Audio Quality */}
            <div className="ml-6 space-y-2">
              <label className="text-white/90 text-sm">Audio Quality</label>
              <select
                value={settings.audioQuality}
                onChange={(e) => updateSetting('audioQuality', e.target.value as any)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="low">Low - Data saving</option>
                <option value="medium">Medium - Balanced</option>
                <option value="high">High - Best quality</option>
              </select>
            </div>

            {/* Audio Device */}
            <div className="ml-6 space-y-2">
              <label className="text-white/90 text-sm">Microphone</label>
              <select
                value={settings.preferredAudioDevice || ''}
                onChange={(e) => updateSetting('preferredAudioDevice', e.target.value || undefined)}
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-400 focus:outline-none"
                disabled={loading}
              >
                <option value="">Default Microphone</option>
                {audioDevices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Processing */}
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/90 text-sm">Echo Cancellation</span>
                <button
                  onClick={() => updateSetting('echoCancellation', !settings.echoCancellation)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.echoCancellation ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.echoCancellation ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/90 text-sm">Noise Suppression</span>
                <button
                  onClick={() => updateSetting('noiseSuppression', !settings.noiseSuppression)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.noiseSuppression ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.noiseSuppression ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/90 text-sm">Auto Gain Control</span>
                <button
                  onClick={() => updateSetting('autoGainControl', !settings.autoGainControl)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.autoGainControl ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    settings.autoGainControl ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Network Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wifi className="text-white/70" size={18} />
              <h3 className="text-white font-medium">Network & Performance</h3>
            </div>
            
            <div className="ml-6 bg-black/20 border border-white/10 rounded-lg p-3">
              <p className="text-white/70 text-xs">
                High quality settings may use more data and require a stable internet connection.
                Lower settings are recommended for mobile data or slower connections.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <Button
            type="button"
            variant="secondary"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={saveSettings}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}