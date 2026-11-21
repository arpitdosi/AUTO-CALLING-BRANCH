import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  AlertTriangle,
  Phone,
  Building2,
  Briefcase,
  Smartphone,
  Plus,
  Trash2,
  Image as ImageIcon,
  Paperclip,
  BookmarkPlus,
} from 'lucide-react';
import { RegionalEmployee } from '../data/bhavnagarStaff';
import { StaffLeaveEntry } from '../types';
import {
  DEFAULT_WHATSAPP_TEMPLATES,
  WhatsAppAppMode,
  WhatsAppAttachment,
  WhatsAppTemplate,
  buildWhatsAppAppUrl,
  composeWhatsAppMessage,
  loadActiveWhatsAppAttachmentId,
  loadWhatsAppAppMode,
  loadWhatsAppAttachments,
  loadWhatsAppTemplates,
  openWhatsAppChat,
  processImageFileToAttachment,
  saveActiveWhatsAppAttachmentId,
  saveWhatsAppAppMode,
  saveWhatsAppAttachments,
  saveWhatsAppTemplates,
  sendWhatsAppWithAttachment,
} from '../utils/whatsapp';

// Kept for backward compatibility across existing imports
export const WHATSAPP_QUICK_TEMPLATES = DEFAULT_WHATSAPP_TEMPLATES;

export function buildWhatsAppLink(
  staff: { name: string; position?: string; branch?: string; phone: string },
  messageBody: string,
  includeGreeting = true,
  appMode: WhatsAppAppMode = loadWhatsAppAppMode()
): string {
  const finalText = composeWhatsAppMessage(staff, messageBody, includeGreeting);
  return buildWhatsAppAppUrl(staff.phone, finalText, appMode);
}

interface StaffWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: RegionalEmployee | null;
  initialMessage?: string;
  initialAppMode?: WhatsAppAppMode;
  initialAttachment?: WhatsAppAttachment | null;
  leaveEntry?: StaffLeaveEntry | null;
  onMarkSent?: (staff: RegionalEmployee) => void;
  onTemplatesChanged?: () => void;
  onAppModeChanged?: (mode: WhatsAppAppMode) => void;
}

export const StaffWhatsAppModal: React.FC<StaffWhatsAppModalProps> = ({
  isOpen,
  onClose,
  staff,
  initialMessage,
  initialAppMode,
  initialAttachment,
  leaveEntry,
  onMarkSent,
  onTemplatesChanged,
  onAppModeChanged,
}) => {
  const [appMode, setAppMode] = useState<WhatsAppAppMode>(() => initialAppMode || loadWhatsAppAppMode());
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() => loadWhatsAppTemplates());
  const [attachments, setAttachments] = useState<WhatsAppAttachment[]>(() => loadWhatsAppAttachments());
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(() =>
    initialAttachment ? initialAttachment.id : loadActiveWhatsAppAttachmentId()
  );

  const [message, setMessage] = useState<string>(DEFAULT_WHATSAPP_TEMPLATES[0].text);
  const [includeGreeting, setIncludeGreeting] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // Quick Save as Template UI
  const [showSaveTemplate, setShowSaveTemplate] = useState<boolean>(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && staff) {
      const loadedTemplates = loadWhatsAppTemplates();
      const loadedAttachments = loadWhatsAppAttachments();
      setTemplates(loadedTemplates);
      setAttachments(loadedAttachments);
      setAppMode(initialAppMode || loadWhatsAppAppMode());
      setActiveAttachmentId(
        initialAttachment !== undefined
          ? initialAttachment?.id || null
          : loadActiveWhatsAppAttachmentId()
      );
      setMessage(
        initialMessage && initialMessage.trim()
          ? initialMessage
          : loadedTemplates[0]?.text || DEFAULT_WHATSAPP_TEMPLATES[0].text
      );
      setCopied(false);
      setStatusNote(null);
      setShowSaveTemplate(false);
      setNewTemplateTitle('');
    }
  }, [isOpen, staff, initialMessage, initialAppMode, initialAttachment]);

  if (!isOpen || !staff) return null;

  const activeAttachment = attachments.find((a) => a.id === activeAttachmentId) || null;
  const previewText = composeWhatsAppMessage(staff, message, includeGreeting);

  const handleModeChange = (mode: WhatsAppAppMode) => {
    setAppMode(mode);
    saveWhatsAppAppMode(mode);
    if (onAppModeChanged) onAppModeChanged(mode);
  };

  const handleSelectAttachment = (id: string | null) => {
    setActiveAttachmentId(id);
    saveActiveWhatsAppAttachmentId(id);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const att = await processImageFileToAttachment(file);
      const updated = [att, ...attachments].slice(0, 8);
      setAttachments(updated);
      saveWhatsAppAttachments(updated);
      handleSelectAttachment(att.id);
      setStatusNote(`🖼️ "${att.name}" (${att.sizeKB} KB) ऑटो-अटैच के लिए तैयार है!`);
    } catch {
      setStatusNote('⚠️ इमेज अपलोड नहीं हो सकी। कृपया JPG या PNG चुनें।');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveAsTemplate = () => {
    const label = newTemplateTitle.trim();
    const text = message.trim();
    if (!label || !text) return;

    const newTpl: WhatsAppTemplate = {
      id: `tpl_${Date.now().toString(36)}`,
      label: `⭐ ${label}`,
      text,
      attachmentId: activeAttachment?.id,
      isDefault: false,
      createdAt: Date.now(),
    };
    const updated = [newTpl, ...templates];
    setTemplates(updated);
    saveWhatsAppTemplates(updated);
    setNewTemplateTitle('');
    setShowSaveTemplate(false);
    setStatusNote(`✅ रेडीमेड टेम्पलेट "${label}" सेव हो गया!`);
    if (onTemplatesChanged) onTemplatesChanged();
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveWhatsAppTemplates(updated);
    if (onTemplatesChanged) onTemplatesChanged();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSend = async (preferDirectChat = false) => {
    if (isSending) return;
    setIsSending(true);
    try {
      if (activeAttachment) {
        const result = await sendWhatsAppWithAttachment(
          staff,
          previewText,
          activeAttachment,
          appMode,
          preferDirectChat
        );
        if (result.method === 'cancelled') {
          setIsSending(false);
          return;
        }
        if (onMarkSent) onMarkSent(staff);
        onClose();
      } else {
        openWhatsAppChat(staff.phone, previewText, appMode);
        if (onMarkSent) onMarkSent(staff);
        onClose();
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden text-white my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between shrink-0 ${
            appMode === 'whatsapp_business'
              ? 'bg-gradient-to-r from-teal-700 to-cyan-800'
              : 'bg-gradient-to-r from-emerald-600 to-teal-700'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-black/20 rounded-lg">
              {appMode === 'whatsapp_business' ? (
                <Briefcase className="w-5 h-5 text-cyan-100" />
              ) : (
                <MessageSquare className="w-5 h-5 text-emerald-100" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {appMode === 'whatsapp_business' ? 'WhatsApp Business संदेश' : 'डायरेक्ट WhatsApp संदेश'}
              </h3>
              <p className="text-[11px] text-emerald-100">
                टेम्पलेट, WhatsApp / Business चयन और ऑटो इमेज अटैचमेंट
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm overflow-y-auto flex-1">
          {/* Staff Info Card */}
          <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>
                  {staff.branch} शाखा (SOL: {staff.solId})
                </span>
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

          {/* 1. WhatsApp vs WhatsApp Business Switcher */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-300">
              1️⃣ ऐप चुनें (किससे भेजना है?):
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('whatsapp')}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 border transition-all ${
                  appMode === 'whatsapp'
                    ? 'bg-emerald-600 text-white border-emerald-300 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('whatsapp_business')}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 border transition-all ${
                  appMode === 'whatsapp_business'
                    ? 'bg-teal-600 text-white border-cyan-300 shadow-md'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>WhatsApp Business</span>
              </button>
            </div>
          </div>

          {/* Warning if currently on leave */}
          {leaveEntry && (
            <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 flex items-start space-x-2 text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>सूचना:</strong> यह स्टाफ <strong>{leaveEntry.leaveUntil}</strong> तक छुट्टी पर हैं
                {leaveEntry.leaveReason ? ` (${leaveEntry.leaveReason})` : ''}।
              </div>
            </div>
          )}

          {/* 2. Readymade Templates */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300">
                2️⃣ रेडीमेड टेम्पलेट चुनें:
              </label>
              <button
                type="button"
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-200 border border-blue-400/40 rounded-lg text-[11px] font-bold flex items-center space-x-1"
              >
                <BookmarkPlus className="w-3 h-3" />
                <span>नया टेम्पलेट सेव करें</span>
              </button>
            </div>

            {showSaveTemplate && (
              <div className="flex items-center gap-2 p-2 bg-slate-950 border border-blue-500/40 rounded-xl">
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveAsTemplate();
                  }}
                  placeholder="टेम्पलेट का नाम लिखें (उदा. खाता खोलने का सर्कुलर)..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shrink-0"
                >
                  सेव ✓
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl) => (
                <div key={tpl.id} className="inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMessage(tpl.text);
                      if (tpl.attachmentId && attachments.some((a) => a.id === tpl.attachmentId)) {
                        handleSelectAttachment(tpl.attachmentId);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                      message === tpl.text
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/70'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <span>{tpl.label}</span>
                    {tpl.attachmentId && <Paperclip className="w-2.5 h-2.5 text-amber-300" />}
                  </button>
                  {!tpl.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="ml-0.5 p-1 text-slate-500 hover:text-rose-400"
                      title="टेम्पलेट हटाएं"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
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
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="यहाँ अपना WhatsApp संदेश टाइप करें..."
              className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-y"
            />
          </div>

          {/* 3. Auto Image Attachment Section */}
          <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>3️⃣ ऑटो इमेज अटैचमेंट (Auto Image Attach):</span>
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50 rounded-lg text-[11px] font-bold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>इमेज अपलोड करें</span>
              </button>
            </div>

            {activeAttachment ? (
              <div className="flex items-center justify-between gap-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl p-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <img
                    src={activeAttachment.dataUrl}
                    alt={activeAttachment.name}
                    className="w-11 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-emerald-300 truncate">
                      📎 {activeAttachment.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {activeAttachment.sizeKB} KB • अपने आप मैसेज के साथ जुड़ेगी
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAttachment(null)}
                  className="px-2 py-1 bg-rose-950/70 hover:bg-rose-800/70 text-rose-200 border border-rose-500/40 rounded-lg text-[10px] font-bold shrink-0"
                >
                  हटाएं ✕
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                कोई इमेज अटैच नहीं है — ऊपर से 1 बार इमेज चुनें, हर स्टाफ को अपने आप जुड़ जाएगी।
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectAttachment(null)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${
                    !activeAttachment
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  बिना इमेज
                </button>
                {attachments.map((att) => (
                  <button
                    key={att.id}
                    type="button"
                    onClick={() => handleSelectAttachment(att.id)}
                    className={`p-1 rounded-lg border flex items-center space-x-1.5 shrink-0 ${
                      activeAttachmentId === att.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                    <span className="text-[10px] font-semibold max-w-[80px] truncate">
                      {att.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {statusNote && (
            <div className="text-[11px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 rounded-xl px-3 py-2">
              {statusNote}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'कॉपी ✓' : 'मैसेज कॉपी'}</span>
          </button>

          <div className="flex items-center gap-2">
            {activeAttachment && (
              <button
                type="button"
                disabled={isSending}
                onClick={() => handleSend(true)}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-colors"
                title="सीधे स्टाफ की चैट खोलें और इमेज क्लिपबोर्ड में कॉपी करें"
              >
                💬 डायरेक्ट चैट
              </button>
            )}

            <button
              type="button"
              disabled={isSending}
              onClick={() => handleSend(false)}
              className={`flex-1 sm:flex-none px-5 py-2.5 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95 ${
                appMode === 'whatsapp_business'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-teal-950/60'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 shadow-emerald-950/60'
              }`}
            >
              {activeAttachment ? <Paperclip className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>
                {activeAttachment
                  ? appMode === 'whatsapp_business'
                    ? '📎 इमेज + WA Business भेजें'
                    : '📎 इमेज + WhatsApp भेजें'
                  : appMode === 'whatsapp_business'
                  ? '💼 WA Business भेजें ↗'
                  : '💬 WhatsApp भेजें ↗'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
