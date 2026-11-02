import React, { useState } from 'react';
import { X, Settings, RotateCcw, Volume2, Smartphone, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { DialingSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DialingSettings;
  onSaveSettings: (settings: DialingSettings) => void;
  onResetSession: () => void;
  onResetToDefaultManagers: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSession,
  onResetToDefaultManagers,
}) => {
  const [localSettings, setLocalSettings] = useState<DialingSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white my-auto">
        <div className="bg-slate-800 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold">Calling System Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 text-sm">
          {/* Hands-Free Auto Dialing & Call-Cut Controls */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
              <span>⚡ हैंड्स-फ्री ऑटोमेशन सेटिंग्स (Hands-Free Automation)</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-semibold text-xs text-white">स्वतः फोन डायल (Hands-Free Auto-Dial)</div>
                <div className="text-[11px] text-slate-400">हर नंबर पर बिना क्लिक किए स्वतः फोन कॉल शुरू करें</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.handsFreeAutoDial ?? true}
                onChange={(e) => setLocalSettings({ ...localSettings, handsFreeAutoDial: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 rounded"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer border-t border-slate-700/60 pt-2.5">
              <div>
                <div className="font-semibold text-xs text-white">कॉल-कट स्वतः पहचानें (Auto Call-Cut Detection)</div>
                <div className="text-[11px] text-slate-400">कॉल कट होते ही सिस्टम स्वतः पहचान लेगा और अगला नंबर मिलाएगा</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.detectCallCut ?? true}
                onChange={(e) => setLocalSettings({ ...localSettings, detectCallCut: e.target.checked })}
                className="w-4 h-4 accent-blue-500 rounded"
              />
            </label>

            {/* Auto-Dial Preparation Countdown */}
            <div className="border-t border-slate-700/60 pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">डायल से पहले तैयारी समय (Prep Delay):</span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {(localSettings.autoDialPrepSeconds ?? 2) === 0 ? 'तुरंत (Instant)' : `${localSettings.autoDialPrepSeconds ?? 2} सेकंड`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, autoDialPrepSeconds: sec })}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      (localSettings.autoDialPrepSeconds ?? 2) === sec
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {sec === 0 ? 'Instant' : `${sec}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto Next Delay */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-semibold">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Next Call Auto-Countdown</span>
              </div>
              <span className="text-xs text-amber-300 font-mono">
                {localSettings.autoNextDelaySeconds === 0 ? 'Manual Click' : `${localSettings.autoNextDelaySeconds}s delay`}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              बात हो जाने के बाद कितने सेकंड में अगला कॉल अपने आप शुरू हो:
            </p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[0, 2, 3, 5].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setLocalSettings({ ...localSettings, autoNextDelaySeconds: sec })}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                    localSettings.autoNextDelaySeconds === sec
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {sec === 0 ? 'Manual' : `${sec}s Delay`}
                </button>
              ))}
            </div>
          </div>

          {/* Sound & Haptics */}
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700 rounded-xl cursor-pointer">
              <div className="flex items-center space-x-3">
                <Volume2 className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="font-semibold text-xs text-white">Sound Effects (ध्वनि संकेत)</div>
                  <div className="text-[11px] text-slate-400">Chime on successful connection & dial</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.soundEffects}
                onChange={(e) => setLocalSettings({ ...localSettings, soundEffects: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-800/60 border border-slate-700 rounded-xl cursor-pointer">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="font-semibold text-xs text-white">Vibration on Click (वाइब्रेशन)</div>
                  <div className="text-[11px] text-slate-400">Haptic feedback on mobile devices</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.vibrate}
                onChange={(e) => setLocalSettings({ ...localSettings, vibrate: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
          </div>

          {/* WhatsApp Follow-up Template */}
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <span>Default WhatsApp Follow-up Message</span>
            </div>
            <textarea
              rows={2}
              value={localSettings.whatsappTemplate}
              onChange={(e) => setLocalSettings({ ...localSettings, whatsappTemplate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Danger Zone: Resets */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Reset Actions</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset today's calling session to start fresh?")) {
                    onResetSession();
                    onClose();
                  }
                }}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>Reset Today's Progress</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Restore the original 59 branch managers from the image document?')) {
                    onResetToDefaultManagers();
                    onClose();
                  }
                }}
                className="p-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-xl text-xs font-semibold text-rose-300 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Restore 59 Default BMs</span>
              </button>
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
