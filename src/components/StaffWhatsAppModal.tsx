import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Copy, Check, AlertTriangle, Phone, Building2 } from 'lucide-react';
import { RegionalEmployee } from '../data/bhavnagarStaff';
import { StaffLeaveEntry } from '../types';

export const WHATSAPP_QUICK_TEMPLATES = [
  {
    id: 'callback',
    label: '📞 कॉल बैक अनुरोध',
    text: 'रीजनल ऑफिस (RO) भावनगर से आपसे संपर्क करना था। कृपया उपलब्ध होते ही तुरंत कॉल बैक करें। धन्यवाद।',
  },
  {
    id: 'daily_figures',
    label: '📊 दैनिक बिजनेस रिपोर्ट',
    text: 'कृपया आज के दैनिक बिजनेस फिगर्स (CASA, डिपॉजिट एवं लोन) तुरंत शेयर करें। धन्यवाद।',
  },
  {
    id: 'npa_recovery',
    label: '💰 NPA / रिकवरी',
    text: 'कृपया अपनी शाखा की आज की NPA एवं SMA रिकवरी की ताज़ा प्रगति रिपोर्ट तुरंत अपडेट करें।',
  },
  {
    id: 'vc_meeting',
    label: '💻 VC / मीटिंग सूचना',
    text: 'आज क्षेत्रीय कार्यालय की महत्वपूर्ण VC / मीटिंग निर्धारित है। कृपया समय पर जुड़ना सुनिश्चित करें।',
  },
  {
    id: 'compliance',
    label: '📋 ऑडिट / अनुपालन',
    text: 'कृपया शाखा के लंबित ऑडिट / अनुपालन बिंदु आज ही पूर्ण कर रिपोर्ट भेजें।',
  },
];

export function buildWhatsAppLink(
  staff: { name: string; position?: string; branch?: string; phone: string },
  messageBody: string,
  includeGreeting = true
): string {
  const cleanNumber = (staff.phone || '').replace(/[^0-9]/g, '');
  const fullNumber = cleanNumber.startsWith('91') && cleanNumber.length > 10 ? cleanNumber : `91${cleanNumber}`;
  const greeting = includeGreeting
    ? `नमस्ते ${staff.name} जी (${staff.position ? `${staff.position}, ` : ''}${staff.branch || ''} शाखा),\n\n`
    : '';
  const finalText = `${greeting}${messageBody.trim()}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(finalText)}`;
}

interface StaffWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: RegionalEmployee | null;
  initialMessage?: string;
  leaveEntry?: StaffLeaveEntry | null;
  onMarkSent?: (staff: RegionalEmployee) => void;
}

export const StaffWhatsAppModal: React.FC<StaffWhatsAppModalProps> = ({
  isOpen,
  onClose,
  staff,
  initialMessage,
  leaveEntry,
  onMarkSent,
}) => {
  const [message, setMessage] = useState<string>(WHATSAPP_QUICK_TEMPLATES[0].text);
  const [includeGreeting, setIncludeGreeting] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && staff) {
      setMessage(initialMessage && initialMessage.trim() ? initialMessage : WHATSAPP_QUICK_TEMPLATES[0].text);
      setCopied(false);
    }
  }, [isOpen, staff, initialMessage]);

  if (!isOpen || !staff) return null;

  const waHref = buildWhatsAppLink(staff, message, includeGreeting);
  const previewText = includeGreeting
    ? `नमस्ते ${staff.name} जी (${staff.position ? `${staff.position}, ` : ''}${staff.branch} शाखा),\n\n${message.trim()}`
    : message.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden text-white my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-black/20 rounded-lg">
              <MessageSquare className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">डायरेक्ट WhatsApp संदेश</h3>
              <p className="text-[11px] text-emerald-100">सीधे स्टाफ के WhatsApp नंबर पर मैसेज भेजें</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs sm:text-sm">
          {/* Staff Info Card */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>{staff.branch} शाखा (SOL: {staff.solId})</span>
              </span>
              {staff.ecNo && (
                <span className="text-[10px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">
                  EC: {staff.ecNo}
                </span>
              )}
            </div>
            <div className="text-base font-black text-white">{staff.name}</div>
            <div className="text-xs text-blue-300 font-semibold">{staff.position}</div>
            <div className="text-xs text-emerald-300 font-mono flex items-center space-x-1">
              <Phone className="w-3 h-3" />
              <span>+91 {staff.phone}</span>
            </div>
          </div>

          {/* Warning if currently on leave */}
          {leaveEntry && (
            <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 flex items-start space-x-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>सूचना:</strong> यह स्टाफ <strong>{leaveEntry.leaveUntil}</strong> तक छुट्टी पर हैं
                {leaveEntry.leaveReason ? ` (${leaveEntry.leaveReason})` : ''}। कॉल ब्लॉक है, आवश्यकता होने पर ही WhatsApp भेजें।
              </div>
            </div>
          )}

          {/* Quick Templates */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">
              त्वरित संदेश चुनें (Quick Message Templates):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WHATSAPP_QUICK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setMessage(tpl.text)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    message === tpl.text
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/60'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">संदेश लिखें (Message Text):</label>
              <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGreeting}
                  onChange={(e) => setIncludeGreeting(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span>नाम व शाखा अभिवादन जोड़ें</span>
              </label>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="यहाँ अपना WhatsApp संदेश टाइप करें..."
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-y"
            />
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'कॉपी हो गया ✓' : 'मैसेज कॉपी करें'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                रद्द करें
              </button>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (onMarkSent) onMarkSent(staff);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/60 transition-transform active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp भेजें ↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
