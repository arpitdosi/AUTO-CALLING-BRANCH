import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  PhoneIncoming, 
  PhoneOff, 
  Clock, 
  RotateCcw, 
  Save, 
  Tag, 
  MessageSquare,
  Building2,
  Phone
} from 'lucide-react';
import { BranchManager, CallLogEntry, CallOutcome } from '../types';

interface EditCallStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  manager: BranchManager | null;
  currentCallLog?: CallLogEntry;
  targetOfficerName?: string;
  targetOfficerRole?: string;
  targetOfficerPhone?: string;
  onSaveStatus: (
    managerId: string,
    outcome: CallOutcome | 'clear',
    notes: string,
    tags: string[],
    contactedPerson?: string
  ) => void;
}

export const EditCallStatusModal: React.FC<EditCallStatusModalProps> = ({
  isOpen,
  onClose,
  manager,
  currentCallLog,
  targetOfficerName,
  targetOfficerRole,
  targetOfficerPhone,
  onSaveStatus,
}) => {
  if (!isOpen || !manager) return null;

  const initialOutcome = currentCallLog?.outcome || 'not_answered';
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | 'clear'>(
    initialOutcome === 'pending_call' ? 'connected' : initialOutcome
  );
  const [notes, setNotes] = useState(currentCallLog?.notes || '');
  const [tags, setTags] = useState<string[]>(currentCallLog?.tags || []);
  const [isIncomingCallback, setIsIncomingCallback] = useState(
    currentCallLog?.notes?.includes('वापस कॉल आया') || 
    currentCallLog?.tags?.some(t => t.includes('वापस कॉल')) || 
    false
  );

  const activeName = targetOfficerName || manager.name;
  const activeRole = targetOfficerRole || 'Branch Manager';
  const activePhone = targetOfficerPhone || manager.phone;

  // Quick preset chips for notes
  const notePresets = [
    'शाखा से वापस कॉल आया - बात हो गई ✅',
    'प्रबंधक ने कॉल बैक कर दैनिक प्रगति साझा की',
    'कॉल रिसीव नहीं हुआ - बाद में पुनः प्रयास करेंगे',
    'मीटिंग / ऑडिट में व्यस्त थे',
    'नंबर स्विच ऑफ या नेटवर्क कवरेज से बाहर था',
    'लंच के बाद बात संपन्न हुई',
  ];

  const handleSelectIncomingCallback = () => {
    setSelectedOutcome('connected');
    setIsIncomingCallback(true);
    if (!notes.includes('वापस कॉल आया')) {
      setNotes((prev) => (prev ? `${prev} • शाखा से वापस कॉल आया (बात संपन्न)` : 'शाखा से वापस कॉल आया - बात हो गई ✅'));
    }
    if (!tags.includes('वापस कॉल आया (Incoming)')) {
      setTags((prev) => [...prev, 'वापस कॉल आया (Incoming)', 'बात हो गई']);
    }
  };

  const handleSave = () => {
    let finalTags = [...tags];
    if (isIncomingCallback && !finalTags.includes('वापस कॉल आया (Incoming)')) {
      finalTags.push('वापस कॉल आया (Incoming)');
    }
    if (selectedOutcome === 'connected' && !finalTags.includes('बात हो गई')) {
      finalTags.push('बात हो गई');
    }

    const contactedPerson = isIncomingCallback
      ? `${activeName} (वापस कॉल आया)`
      : activeName;

    onSaveStatus(manager.id, selectedOutcome, notes.trim(), finalTags, contactedPerson);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
              <PhoneIncoming className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">कॉल स्थिति व परिणाम अपडेट करें</h3>
              <p className="text-xs text-slate-400">
                Update Call Status • Callback Received • Notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Target Branch & Officer Info */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-mono font-bold">
                SOL {manager.solId} • {manager.branchAlpha}
              </span>
              <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                <span>{manager.branch} Branch</span>
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-bold text-white text-sm">{activeName}</div>
                <div className="text-[11px] text-slate-400">{activeRole}</div>
              </div>
              <div className="font-mono text-sm font-black text-amber-300 flex items-center space-x-1">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>+91 {activePhone}</span>
              </div>
            </div>
          </div>

          {/* Special Quick Callback Button */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border-2 border-emerald-500/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-emerald-300 flex items-center space-x-1.5">
                <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                <span>शाखा से वापस फोन आया? (Branch Called Back)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full font-bold">
                1-क्लिक समाधान
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectIncomingCallback}
              className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-[0.98] ${
                isIncomingCallback && selectedOutcome === 'connected'
                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>वापस कॉल आया - बात हो गई ✅ (Mark Connected)</span>
            </button>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              (इसे दबाने से यह पेंडिंग लिस्ट से हट जाएगा और "बात हो गई" में जुड़ जाएगा)
            </p>
          </div>

          {/* Outcome Selectors */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              कॉल का परिणाम चुनें (Select Call Outcome):
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Connected */}
              <button
                type="button"
                onClick={() => {
                  setSelectedOutcome('connected');
                  setIsIncomingCallback(false);
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                  selectedOutcome === 'connected' && !isIncomingCallback
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">बात हो गई ✅</div>
                  <div className="text-[10px] text-slate-400">Call Connected</div>
                </div>
              </button>

              {/* Not Answered */}
              <button
                type="button"
                onClick={() => {
                  setSelectedOutcome('not_answered');
                  setIsIncomingCallback(false);
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                  selectedOutcome === 'not_answered'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 ring-1 ring-rose-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">बात नहीं हुई ❌</div>
                  <div className="text-[10px] text-slate-400">Not Answered</div>
                </div>
              </button>

              {/* Busy */}
              <button
                type="button"
                onClick={() => {
                  setSelectedOutcome('busy');
                  setIsIncomingCallback(false);
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                  selectedOutcome === 'busy'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">व्यस्त (Busy) ⏳</div>
                  <div className="text-[10px] text-slate-400">Busy / Call Cut</div>
                </div>
              </button>

              {/* Switched Off */}
              <button
                type="button"
                onClick={() => {
                  setSelectedOutcome('switched_off');
                  setIsIncomingCallback(false);
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all ${
                  selectedOutcome === 'switched_off'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 ring-1 ring-purple-400'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <PhoneOff className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="font-bold text-xs">स्विच ऑफ 📵</div>
                  <div className="text-[10px] text-slate-400">Unreachable</div>
                </div>
              </button>
            </div>

            {/* Reset to uncalled option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSelectedOutcome('clear')}
                className={`w-full py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                  selectedOutcome === 'clear'
                    ? 'bg-slate-700 text-amber-300 border-amber-400/50'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>स्थिति रिसेट करें (बाकी / Uncalled बनाएं)</span>
              </button>
            </div>
          </div>

          {/* Notes & Quick Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>टिप्पणी / विवरण (Notes):</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. शाखा प्रबंधक ने 10 मिनट बाद कॉल बैक किया, शाखा का डेटा कन्फर्म किया..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {notePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNotes(preset)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700/80 transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            रद्द करें (Cancel)
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>अपडेट सुरक्षित करें (Save Status)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
