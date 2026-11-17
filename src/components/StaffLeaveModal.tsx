import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, Check, ShieldAlert, Ban } from 'lucide-react';
import { RegionalEmployee } from '../data/bhavnagarStaff';
import { StaffLeaveEntry } from '../types';
import { calculateDateAfterDays, getTodayKey } from '../utils/storage';

interface StaffLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: RegionalEmployee | null;
  existingLeave: StaffLeaveEntry | null;
  onUpdateLeave: (staff: RegionalEmployee, leaveUntil?: string, reason?: string) => void;
}

const QUICK_REASONS = [
  'आकस्मिक अवकाश (CL)',
  'बीमारी / मेडिकल (SL)',
  'अर्जित अवकाश (EL)',
  'ट्रेनिंग / RO मीटिंग',
  'टूर / बाहर गए हैं',
];

export const StaffLeaveModal: React.FC<StaffLeaveModalProps> = ({
  isOpen,
  onClose,
  staff,
  existingLeave,
  onUpdateLeave,
}) => {
  const today = getTodayKey();
  const [selectedDays, setSelectedDays] = useState<number | null>(0);
  const [customDate, setCustomDate] = useState<string>(today);
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && staff) {
      setErrorMsg(null);
      if (existingLeave && existingLeave.leaveUntil >= today) {
        setCustomDate(existingLeave.leaveUntil);
        setReason(existingLeave.leaveReason || '');
        setSelectedDays(null);
      } else {
        setSelectedDays(0);
        setCustomDate(today);
        setReason('');
      }
    }
  }, [isOpen, staff, existingLeave, today]);

  if (!isOpen || !staff) return null;

  const isCurrentlyOnLeave = !!(existingLeave && existingLeave.leaveUntil >= today);

  const handleApplyDays = (daysOffset: number) => {
    const targetDate = calculateDateAfterDays(daysOffset);
    setSelectedDays(daysOffset);
    setCustomDate(targetDate);
    setErrorMsg(null);
  };

  const handleSave = () => {
    if (!customDate) {
      setErrorMsg('कृपया छुट्टी की अंतिम तिथि चुनें।');
      return;
    }
    onUpdateLeave(staff, customDate, reason.trim() || 'छुट्टी / अवकाश पर');
    onClose();
  };

  const handleRemoveLeave = () => {
    onUpdateLeave(staff, undefined, undefined);
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
              <h3 className="text-base font-bold text-white">स्टाफ छुट्टी / कॉल ब्लॉक (Staff Leave)</h3>
              <p className="text-[11px] text-amber-100">छुट्टी पर रहने तक इस स्टाफ को कॉल ब्लॉक रहेगा</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Staff Details */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-400">
                {staff.branch} शाखा (SOL: {staff.solId})
              </span>
              {staff.ecNo && (
                <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">
                  EC: {staff.ecNo}
                </span>
              )}
            </div>
            <div className="text-base font-black text-white">{staff.name}</div>
            <div className="text-xs text-blue-300 font-semibold">{staff.position}</div>
            <div className="text-xs text-amber-300 font-mono">📞 +91 {staff.phone}</div>
          </div>

          {/* Current Leave Status Banner */}
          {isCurrentlyOnLeave && existingLeave && (
            <div className="bg-amber-950/60 border border-amber-500/60 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center space-x-2 text-amber-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>वर्तमान में छुट्टी पर हैं (कॉल ब्लॉक है)</span>
              </div>
              <p className="text-xs text-slate-200">
                अंतिम तिथि: <strong className="text-white font-mono">{existingLeave.leaveUntil}</strong>
                {existingLeave.leaveReason && ` • कारण: ${existingLeave.leaveReason}`}
              </p>
              <button
                type="button"
                onClick={handleRemoveLeave}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>✅ छुट्टी समाप्त करें और अनब्लॉक करें (Unblock Calls)</span>
              </button>
            </div>
          )}

          {/* Quick Days Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              कब तक छुट्टी पर हैं / कॉल ब्लॉक रखना है?
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'आज', days: 0 },
                { label: '2 दिन', days: 1 },
                { label: '3 दिन', days: 2 },
                { label: '5 दिन', days: 4 },
                { label: '7 दिन', days: 6 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleApplyDays(days)}
                  className={`py-2 px-1.5 text-xs font-bold rounded-xl border transition-all ${
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

          {/* Custom Date Picker */}
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
                setErrorMsg(null);
              }}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Quick Reasons */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">
              कारण चुनें या लिखें (वैकल्पिक):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASONS.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    reason === qr
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {qr}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="उदा. CL, मेडिकल लीव, ट्रेनिंग, बाहर टूर..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {errorMsg && (
            <div className="text-xs font-bold text-rose-400 bg-rose-950/50 border border-rose-500/40 rounded-lg px-3 py-2">
              {errorMsg}
            </div>
          )}

          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              इस तारीख तक इस स्टाफ को रैंडम कॉलिंग और ऑटो-कॉलिंग दोनों में <strong>कॉल नहीं लगेगा (ब्लॉक रहेगा)</strong>। छुट्टी की अवधि पूरी होते ही यह स्वतः अनब्लॉक हो जाएगा।
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center space-x-1.5"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>छुट्टी दर्ज करें & कॉल ब्लॉक करें</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
