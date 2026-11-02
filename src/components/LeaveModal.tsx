import React, { useState } from 'react';
import { X, Calendar, Clock, AlertTriangle, Check, ShieldAlert, Sparkles } from 'lucide-react';
import { BranchManager } from '../types';
import { calculateDateAfterDays, getTodayKey } from '../utils/storage';

interface LeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  manager: BranchManager | null;
  onUpdateLeave: (managerId: string, leaveUntil?: string, reason?: string) => void;
}

export const LeaveModal: React.FC<LeaveModalProps> = ({
  isOpen,
  onClose,
  manager,
  onUpdateLeave,
}) => {
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  if (!isOpen || !manager) return null;

  const today = getTodayKey();
  const isCurrentlyOnLeave = manager.leaveUntil && manager.leaveUntil >= today;

  const handleApplyDays = (days: number) => {
    const targetDate = calculateDateAfterDays(days);
    setSelectedDays(days);
    setCustomDate(targetDate);
  };

  const handleSave = () => {
    const finalDate = customDate;
    if (!finalDate) {
      alert('कृपया छुट्टी की अंतिम तारीख चुनें।');
      return;
    }
    onUpdateLeave(manager.id, finalDate, reason.trim() || 'छुट्टी / अवकाश पर');
    onClose();
  };

  const handleRemoveLeave = () => {
    onUpdateLeave(manager.id, undefined, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-white my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-black/20 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">मैनेजर लीव / डीएनडी (Leave & DND)</h3>
              <p className="text-[11px] text-amber-100">अस्थायी रूप से कॉलिंग ब्लॉक करें</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Target Manager Details */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3">
            <div className="text-xs font-semibold text-emerald-400">
              {manager.branch} Branch (SOL: {manager.solId})
            </div>
            <div className="text-base font-bold text-white mt-0.5">
              {manager.name}
            </div>
            <div className="text-xs text-amber-300 font-mono mt-0.5">
              📞 +91 {manager.phone}
            </div>
          </div>

          {/* Current Status Banner if on leave */}
          {isCurrentlyOnLeave && (
            <div className="bg-amber-950/50 border border-amber-600/50 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>वर्तमान में छुट्टी पर हैं (Currently On Leave)</span>
              </div>
              <p className="text-xs text-slate-300">
                अंतिम तिथि: <strong className="text-white font-mono">{manager.leaveUntil}</strong>
                {manager.leaveReason && ` • कारण: ${manager.leaveReason}`}
              </p>
              <button
                type="button"
                onClick={handleRemoveLeave}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>छुट्टी समाप्त करें और कॉलिंग लिस्ट में वापस जोड़ें</span>
              </button>
            </div>
          )}

          {/* Preset Buttons for Quick Leave Days */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              कितने दिनों के लिए ब्लॉक / पॉज़ करना है?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '1 दिन', days: 1 },
                { label: '2 दिन', days: 2 },
                { label: '4 दिन', days: 4 },
                { label: '7 दिन', days: 7 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleApplyDays(days)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                    selectedDays === days
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Date Picker */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">
              छुट्टी की अंतिम तिथि (Leave Till Date):
            </label>
            <input
              type="date"
              min={today}
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setSelectedDays(null);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400">
              कारण / विवरण (वैकल्पिक):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="उदा. बाहर टूर पर, मेडिकल लीव, ट्रेनिंग, आदि..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              चुने हुए दिनों तक यह नंबर रोज़ाना के 1-by-1 ऑटो-डायल प्रोग्राम में <strong>नहीं आएगा</strong> ताकि अधिकारी को कोई डिस्टर्बेंस न हो। तारीख समाप्त होते ही यह अपने आप एक्टिव हो जाएगा।
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
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
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md"
            >
              छुट्टी दर्ज करें (Apply DND)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
