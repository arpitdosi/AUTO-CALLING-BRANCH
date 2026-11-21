import React, { useState, useMemo, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Edit3,
  CheckCircle2,
  Building2,
  Users,
  Phone,
  Palmtree,
  Sparkles,
  RotateCcw,
  Filter,
  Target,
  Briefcase,
  Smartphone,
  Plus,
  Trash2,
  Image as ImageIcon,
  Paperclip,
  BookmarkPlus,
  Check,
  X,
} from 'lucide-react';
import { BHAVNAGAR_REGIONAL_STAFF, RegionalEmployee } from '../data/bhavnagarStaff';
import { BranchManager, StaffLeaveEntry, CustomWorkRole, BranchRoleAssignment } from '../types';
import {
  getStaffLeaveEntry,
  getStaffLeaveKey,
  getTodayKey,
  isStaffOnLeave,
  getAssignmentsForStaff,
} from '../utils/storage';
import {
  WhatsAppAppMode,
  WhatsAppAttachment,
  WhatsAppTemplate,
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
import { StaffWhatsAppModal } from './StaffWhatsAppModal';

interface DirectWhatsAppTabProps {
  managers: BranchManager[];
  staffLeaves: Record<string, StaffLeaveEntry>;
  workRoles?: CustomWorkRole[];
  branchRoleAssignments?: BranchRoleAssignment[];
  density?: 'compact' | 'normal' | 'large';
  showToast: (msg: string) => void;
}

const WA_SENT_PREFIX = 'bank_bm_wa_sent_';

function loadTodaySentMap(today: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${WA_SENT_PREFIX}${today}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore storage read error
  }
  return {};
}

function saveTodaySentMap(today: string, map: Record<string, number>): void {
  try {
    localStorage.setItem(`${WA_SENT_PREFIX}${today}`, JSON.stringify(map));
  } catch {
    // ignore storage write error
  }
}

export const DirectWhatsAppTab: React.FC<DirectWhatsAppTabProps> = ({
  managers,
  staffLeaves,
  workRoles = [],
  branchRoleAssignments = [],
  density = 'normal',
  showToast,
}) => {
  const today = getTodayKey();

  // 1. WhatsApp vs WhatsApp Business App Mode (persisted globally)
  const [appMode, setAppMode] = useState<WhatsAppAppMode>(() => loadWhatsAppAppMode());

  // 2. Readymade Templates (Built-in + User Custom Templates)
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(() => loadWhatsAppTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    () => loadWhatsAppTemplates()[0]?.id || 'callback'
  );
  const [showTemplateEditor, setShowTemplateEditor] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplTitleInput, setTplTitleInput] = useState<string>('');
  const [tplBodyInput, setTplBodyInput] = useState<string>('');
  const [tplLinkCurrentImage, setTplLinkCurrentImage] = useState<boolean>(true);

  // 3. Auto Image Attachment Library & Active Selection
  const [attachments, setAttachments] = useState<WhatsAppAttachment[]>(() => loadWhatsAppAttachments());
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(() =>
    loadActiveWhatsAppAttachmentId()
  );
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Message composer state
  const [messageBody, setMessageBody] = useState<string>(
    () => loadWhatsAppTemplates()[0]?.text || ''
  );
  const [includeGreeting, setIncludeGreeting] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranchAlpha, setSelectedBranchAlpha] = useState<string>('ALL');
  const [areaCategoryFilter, setAreaCategoryFilter] = useState<'ALL' | 'RURAL' | 'SEMI-URBAN' | 'URBAN'>('ALL');
  const [designationFilter, setDesignationFilter] = useState<string>('ALL');
  const [workRoleFilter, setWorkRoleFilter] = useState<string>('ALL');
  const [hideOnLeave, setHideOnLeave] = useState<boolean>(false);
  const [sentFilter, setSentFilter] = useState<'all' | 'sent' | 'unsent'>('all');

  // Tracking sent WhatsApp messages today
  const [sentMap, setSentMap] = useState<Record<string, number>>(() => loadTodaySentMap(today));

  // Modal for customizing message for a single staff member
  const [modalStaff, setModalStaff] = useState<RegionalEmployee | null>(null);

  const activeAttachment = useMemo(
    () => attachments.find((a) => a.id === activeAttachmentId) || null,
    [attachments, activeAttachmentId]
  );

  // Switch WhatsApp vs WhatsApp Business
  const handleSwitchAppMode = (mode: WhatsAppAppMode) => {
    setAppMode(mode);
    saveWhatsAppAppMode(mode);
    showToast(
      mode === 'whatsapp_business'
        ? '💼 WhatsApp Business मोड चालू — अब मैसेज WhatsApp Business से जाएंगे!'
        : '📱 सामान्य WhatsApp मोड चालू — अब मैसेज WhatsApp से जाएंगे!'
    );
  };

  // Select Active Attachment
  const handleSelectAttachment = (id: string | null) => {
    setActiveAttachmentId(id);
    saveActiveWhatsAppAttachmentId(id);
  };

  // Upload Image from Gallery once and save in library
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const att = await processImageFileToAttachment(file);
      const updated = [att, ...attachments].slice(0, 8);
      setAttachments(updated);
      const savedOk = saveWhatsAppAttachments(updated);
      handleSelectAttachment(att.id);
      showToast(
        savedOk
          ? `🖼️ इमेज "${att.name}" (${att.sizeKB} KB) ऑटो-अटैच के लिए सेव हो गई!`
          : `🖼️ इमेज "${att.name}" लोड हो गई (पुरानी इमेज हटाकर स्पेस बनाया गया)।`
      );
    } catch {
      showToast('⚠️ इमेज लोड नहीं हो सकी। कृपया मान्य JPG/PNG इमेज चुनें।');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = (id: string) => {
    const updated = attachments.filter((a) => a.id !== id);
    setAttachments(updated);
    saveWhatsAppAttachments(updated);
    if (activeAttachmentId === id) {
      handleSelectAttachment(null);
    }
    // Unlink from any templates referencing it
    const updatedTemplates = templates.map((t) =>
      t.attachmentId === id ? { ...t, attachmentId: undefined } : t
    );
    setTemplates(updatedTemplates);
    saveWhatsAppTemplates(updatedTemplates);
    showToast('🗑️ सेव की गई इमेज हटा दी गई।');
  };

  // Select a Readymade Template (auto-loads its message + linked image if any)
  const handleSelectTemplate = (tpl: WhatsAppTemplate) => {
    setSelectedTemplateId(tpl.id);
    setMessageBody(tpl.text);
    if (tpl.attachmentId) {
      const exists = attachments.some((a) => a.id === tpl.attachmentId);
      if (exists) {
        handleSelectAttachment(tpl.attachmentId);
      }
    }
  };

  // Open Template Creator / Editor
  const openCreateTemplate = (prefillCurrentText = false) => {
    setEditingTemplateId(null);
    setTplTitleInput('');
    setTplBodyInput(prefillCurrentText ? messageBody : '');
    setTplLinkCurrentImage(!!activeAttachment);
    setShowTemplateEditor(true);
  };

  const openEditTemplate = (tpl: WhatsAppTemplate) => {
    setEditingTemplateId(tpl.id);
    setTplTitleInput(tpl.label.replace(/^⭐\s*/, ''));
    setTplBodyInput(tpl.text);
    setTplLinkCurrentImage(!!tpl.attachmentId || !!activeAttachment);
    setShowTemplateEditor(true);
  };

  const handleSaveTemplate = () => {
    const cleanTitle = tplTitleInput.trim();
    const cleanText = tplBodyInput.trim();
    if (!cleanTitle || !cleanText) {
      showToast('⚠️ कृपया टेम्पलेट का नाम और संदेश दोनों लिखें।');
      return;
    }

    const linkedAttId = tplLinkCurrentImage && activeAttachment ? activeAttachment.id : undefined;

    if (editingTemplateId) {
      const updated = templates.map((t) =>
        t.id === editingTemplateId
          ? {
              ...t,
              label: t.isDefault ? cleanTitle : `⭐ ${cleanTitle}`,
              text: cleanText,
              attachmentId: linkedAttId,
            }
          : t
      );
      setTemplates(updated);
      saveWhatsAppTemplates(updated);
      setMessageBody(cleanText);
      showToast(`✅ टेम्पलेट "${cleanTitle}" अपडेट हो गया!`);
    } else {
      const newTpl: WhatsAppTemplate = {
        id: `tpl_${Date.now().toString(36)}`,
        label: `⭐ ${cleanTitle}`,
        text: cleanText,
        attachmentId: linkedAttId,
        isDefault: false,
        createdAt: Date.now(),
      };
      const updated = [newTpl, ...templates];
      setTemplates(updated);
      saveWhatsAppTemplates(updated);
      setSelectedTemplateId(newTpl.id);
      setMessageBody(cleanText);
      showToast(`✅ नया रेडीमेड टेम्पलेट "${cleanTitle}" सेव हो गया!`);
    }

    setShowTemplateEditor(false);
    setEditingTemplateId(null);
    setTplTitleInput('');
    setTplBodyInput('');
  };

  const handleDeleteTemplate = (tpl: WhatsAppTemplate) => {
    if (tpl.isDefault) return;
    const updated = templates.filter((t) => t.id !== tpl.id);
    setTemplates(updated);
    saveWhatsAppTemplates(updated);
    showToast(`🗑️ टेम्पलेट "${tpl.label}" हटा दिया गया।`);
  };

  // All non-RO branch staff sorted alphabetically by Branch then Branch Head first then Name
  const allBranchStaff = useMemo(() => {
    return BHAVNAGAR_REGIONAL_STAFF.filter((s) => {
      if (
        s.isROStaff ||
        s.category === 'RO' ||
        s.solId === '6106' ||
        s.branchAlpha.trim().toUpperCase() === 'ROBHAV'
      ) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      const branchCmp = a.branch.localeCompare(b.branch);
      if (branchCmp !== 0) return branchCmp;
      const aBM = a.position.toUpperCase().includes('BRANCH HEAD') ? -1 : 1;
      const bBM = b.position.toUpperCase().includes('BRANCH HEAD') ? -1 : 1;
      if (aBM !== bBM) return aBM - bBM;
      return a.name.localeCompare(b.name);
    });
  }, []);

  // Alphabetical branches list for dropdown
  const sortedBranches = useMemo(() => {
    return [...managers].sort((a, b) => a.branch.localeCompare(b.branch));
  }, [managers]);

  // Unique designations present in non-RO branch staff
  const designationOptions = useMemo(() => {
    const set = new Set<string>();
    allBranchStaff.forEach((s) => {
      if (s.position) set.add(s.position);
    });
    return Array.from(set).sort();
  }, [allBranchStaff]);

  const markStaffSent = (staff: RegionalEmployee, customToast?: string) => {
    const key = getStaffLeaveKey(staff);
    const updated = { ...sentMap, [key]: Date.now() };
    setSentMap(updated);
    saveTodaySentMap(today, updated);
    const appLabel = appMode === 'whatsapp_business' ? 'WhatsApp Business' : 'WhatsApp';
    showToast(customToast || `💬 ${staff.name} (${staff.branch}) के लिए ${appLabel} खोला गया!`);
  };

  // 1-tap Send Handler (handles WhatsApp vs WA Business + Auto Image Attachment)
  const handleDirectSendToStaff = async (
    staff: RegionalEmployee,
    preferDirectChat = false
  ) => {
    const finalText = composeWhatsAppMessage(staff, messageBody, includeGreeting);
    const appLabel = appMode === 'whatsapp_business' ? 'WhatsApp Business' : 'WhatsApp';

    if (activeAttachment) {
      const result = await sendWhatsAppWithAttachment(
        staff,
        finalText,
        activeAttachment,
        appMode,
        preferDirectChat
      );
      if (result.method === 'cancelled') return;
      if (result.method === 'native_share') {
        markStaffSent(
          staff,
          `📎 ${staff.name} के लिए इमेज + मैसेज तैयार — ${appLabel} चुनें!`
        );
      } else {
        markStaffSent(
          staff,
          result.imageCopied
            ? `📎 इमेज कॉपी हो गई + ${staff.name} की ${appLabel} चैट खुली — बस Paste करें!`
            : `💬 ${staff.name} की ${appLabel} चैट खोली गई!`
        );
      }
    } else {
      openWhatsAppChat(staff.phone, finalText, appMode);
      markStaffSent(staff);
    }
  };

  const resetSentTracking = () => {
    setSentMap({});
    saveTodaySentMap(today, {});
    showToast('🔄 आज के भेजे गए WhatsApp की गिनती रीसेट की गई।');
  };

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allBranchStaff.filter((staff) => {
      if (selectedBranchAlpha !== 'ALL' && staff.branchAlpha.toUpperCase() !== selectedBranchAlpha.toUpperCase()) {
        return false;
      }
      if (areaCategoryFilter !== 'ALL' && staff.category !== areaCategoryFilter) {
        return false;
      }
      if (designationFilter !== 'ALL' && staff.position !== designationFilter) {
        return false;
      }
      if (workRoleFilter !== 'ALL') {
        const staffAssigns = getAssignmentsForStaff(staff, branchRoleAssignments);
        if (workRoleFilter === 'ANY_MARKED') {
          if (staffAssigns.length === 0) return false;
        } else if (!staffAssigns.some((a) => a.roleId === workRoleFilter)) {
          return false;
        }
      }
      if (hideOnLeave && isStaffOnLeave(staff, staffLeaves, today)) {
        return false;
      }
      const key = getStaffLeaveKey(staff);
      const wasSent = !!sentMap[key];
      if (sentFilter === 'sent' && !wasSent) return false;
      if (sentFilter === 'unsent' && wasSent) return false;

      if (q) {
        const match =
          staff.name.toLowerCase().includes(q) ||
          staff.branch.toLowerCase().includes(q) ||
          staff.phone.includes(q) ||
          staff.ecNo.toLowerCase().includes(q) ||
          staff.position.toLowerCase().includes(q) ||
          staff.branchAlpha.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    allBranchStaff,
    selectedBranchAlpha,
    areaCategoryFilter,
    designationFilter,
    workRoleFilter,
    branchRoleAssignments,
    hideOnLeave,
    staffLeaves,
    today,
    sentFilter,
    sentMap,
    searchQuery,
  ]);

  const sentTodayCount = Object.keys(sentMap).length;
  const isCompact = density === 'compact';
  const isLarge = density === 'large';

  return (
    <div className="space-y-4">
      {/* Top Hero & Message Composer */}
      <div
        className={`rounded-3xl p-4 sm:p-6 shadow-xl space-y-4 border ${
          appMode === 'whatsapp_business'
            ? 'bg-gradient-to-r from-teal-950 via-cyan-950 to-slate-900 border-cyan-600/40'
            : 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-emerald-600/40'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                  appMode === 'whatsapp_business'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                }`}
              >
                {appMode === 'whatsapp_business' ? '💼 WhatsApp Business Hub' : '💬 Direct WhatsApp Hub'}
              </span>
              <span className="text-xs text-emerald-200">
                {allBranchStaff.length} शाखा स्टाफ • 🚫 RO स्टाफ बाहर
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              {appMode === 'whatsapp_business' ? (
                <Briefcase className="w-6 h-6 text-cyan-400" />
              ) : (
                <MessageSquare className="w-6 h-6 text-emerald-400" />
              )}
              <span>डायरेक्ट WhatsApp & Business संदेश</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-3xl">
              <strong>WhatsApp</strong> या <strong>WhatsApp Business</strong> चुनें, अपने रेडीमेड टेम्पलेट बनाएं, और 1 बार इमेज अटैच करके बिना गैलरी खोले हर स्टाफ को तुरंत भेजें।
            </p>
          </div>

          {/* Today's Sent Counter */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-2.5 px-4 text-center">
              <div className="text-lg font-black text-emerald-400">{sentTodayCount}</div>
              <div className="text-[10px] text-slate-400 font-semibold">आज भेजे गए ✓</div>
            </div>
            {sentTodayCount > 0 && (
              <button
                onClick={resetSentTracking}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
                title="आज के भेजे गए स्टेटस रीसेट करें"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* OPTION 1: WhatsApp vs WhatsApp Business Selector Bar */}
        <div className="bg-slate-950/75 border border-slate-700/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-white flex items-center space-x-1.5">
              <span>1️⃣ ऐप चुनें (Send via WhatsApp or WhatsApp Business):</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Android मोबाइल में चुना गया ऐप (Personal या Business) सीधे खुलेगा। यह सेटिंग पूरे ऐप में सेव रहेगी।
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => handleSwitchAppMode('whatsapp')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
                appMode === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-300/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
              {appMode === 'whatsapp' && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchAppMode('whatsapp_business')}
              className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
                appMode === 'whatsapp_business'
                  ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md ring-1 ring-cyan-300/60'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>WA Business</span>
              {appMode === 'whatsapp_business' && <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* OPTION 2 & 3: Common Message Composer + Readymade Templates + Auto Image Attachment */}
        <div className="bg-slate-950/75 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
          {/* Option 2: Readymade Templates Header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black text-emerald-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>2️⃣ रेडीमेड टेम्पलेट्स (Readymade Templates):</span>
            </span>
            <div className="flex items-center flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => openCreateTemplate(true)}
                className="px-2.5 py-1 bg-blue-600/25 hover:bg-blue-600/40 text-blue-200 border border-blue-400/50 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors"
                title="नीचे लिखा संदेश नए टेम्पलेट के रूप में सेव करें"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>+ नया टेम्पलेट बनाएं</span>
              </button>
            </div>
          </div>

          {/* Inline Readymade Template Creator / Editor Drawer */}
          {showTemplateEditor && (
            <div className="bg-slate-900 border-2 border-blue-500/50 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-300">
                  {editingTemplateId ? '✏️ टेम्पलेट एडिट करें' : '✨ नया रेडीमेड टेम्पलेट बनाएं'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateEditor(false);
                    setEditingTemplateId(null);
                  }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={tplTitleInput}
                onChange={(e) => setTplTitleInput(e.target.value)}
                placeholder="टेम्पलेट का छोटा नाम (उदा. नया अकाउंट टारगेट, Gold Loan सर्कुलर, सुबह अपडेट)..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                autoFocus
              />

              <textarea
                rows={3}
                value={tplBodyInput}
                onChange={(e) => setTplBodyInput(e.target.value)}
                placeholder="यहाँ पूरा रेडीमेड संदेश लिखें... (आप {नाम}, {शाखा}, {पद} भी लिख सकते हैं)"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 resize-y"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center flex-wrap gap-1.5 text-[10px]">
                  <span className="text-slate-400">वेरिएबल जोड़ें:</span>
                  {['{नाम}', '{शाखा}', '{पद}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTplBodyInput((prev) => `${prev}${prev ? ' ' : ''}${tag}`)}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded font-mono font-bold"
                    >
                      +{tag}
                    </button>
                  ))}
                  {activeAttachment && (
                    <label className="flex items-center space-x-1.5 text-[11px] text-amber-200 ml-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tplLinkCurrentImage}
                        onChange={(e) => setTplLinkCurrentImage(e.target.checked)}
                        className="accent-amber-500 rounded"
                      />
                      <span>📎 वर्तमान इमेज ({activeAttachment.name}) इस टेम्पलेट से जोड़ें</span>
                    </label>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateEditor(false);
                      setEditingTemplateId(null);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg text-xs shadow-md"
                  >
                    💾 टेम्पलेट सेव करें
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Template Chips */}
          <div className="flex flex-wrap gap-1.5">
            {templates.map((tpl) => {
              const isSelected = selectedTemplateId === tpl.id && messageBody === tpl.text;
              const hasLinkedImage =
                !!tpl.attachmentId && attachments.some((a) => a.id === tpl.attachmentId);
              return (
                <div
                  key={tpl.id}
                  className={`inline-flex items-center rounded-xl border transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                      : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-emerald-500/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTemplate(tpl)}
                    className="px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1"
                  >
                    <span>{tpl.label}</span>
                    {hasLinkedImage && (
                      <Paperclip
                        className={`w-3 h-3 ${isSelected ? 'text-slate-900' : 'text-amber-300'}`}
                      />
                    )}
                  </button>
                  {!tpl.isDefault && (
                    <div
                      className={`flex items-center border-l ${
                        isSelected ? 'border-emerald-700/30' : 'border-slate-700/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => openEditTemplate(tpl)}
                        className={`px-1.5 py-1.5 transition-colors ${
                          isSelected
                            ? 'text-slate-900 hover:bg-black/10'
                            : 'text-slate-400 hover:text-blue-300'
                        }`}
                        title="टेम्पलेट एडिट करें"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl)}
                        className={`px-1.5 py-1.5 transition-colors ${
                          isSelected
                            ? 'text-slate-900 hover:bg-black/10'
                            : 'text-slate-400 hover:text-rose-400'
                        }`}
                        title="टेम्पलेट डिलीट करें"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Message Textarea + Greeting Toggle */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">
                सक्रिय संदेश (Active Message — नीचे हर स्टाफ को यही जाएगा):
              </span>
              <label className="flex items-center space-x-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGreeting}
                  onChange={(e) => setIncludeGreeting(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span>हर स्टाफ का नाम व शाखा जोड़ें (नमस्ते [नाम] जी...)</span>
              </label>
            </div>
            <textarea
              rows={2}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="यहाँ अपना WhatsApp संदेश लिखें जो किसी भी स्टाफ को 1 क्लिक में भेजा जा सके..."
              className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-y"
            />
          </div>

          {/* OPTION 3: Automatic Image Attachment Panel */}
          <div className="pt-2.5 border-t border-slate-800/90 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 flex-wrap">
                <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-black text-amber-300">
                  3️⃣ ऑटो इमेज अटैचमेंट (Auto Image Attachment):
                </span>
                {activeAttachment && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    ✓ चालू — हर मैसेज के साथ जुड़ेगी
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isUploadingImage ? 'लोड हो रहा...' : 'इमेज चुनें (1 बार अपलोड करें)'}</span>
                </button>
              </div>
            </div>

            {activeAttachment ? (
              <div className="bg-slate-900/95 border border-amber-400/40 rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={activeAttachment.dataUrl}
                    alt={activeAttachment.name}
                    className="w-14 h-14 rounded-xl object-cover border border-amber-400/40 shadow shrink-0"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-black text-white truncate flex items-center space-x-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{activeAttachment.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        ({activeAttachment.sizeKB} KB)
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-300">
                      ✅ अब नीचे किसी भी स्टाफ पर <strong>"📎 इमेज + भेजें"</strong> दबाने पर यह इमेज + मैसेज अपने आप अटैच होगा — बार-बार गैलरी नहीं खोलनी पड़ेगी!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectAttachment(null)}
                  className="px-3 py-1.5 bg-rose-950/70 hover:bg-rose-800/70 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold shrink-0 self-start sm:self-center"
                >
                  अटैचमेंट बंद करें ✕
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                यदि आप मैसेज के साथ कोई सर्कुलर, पोस्टर या फोटो भेजना चाहते हैं तो ऊपर से 1 बार इमेज अपलोड करें — फिर हर स्टाफ को बिना गैलरी खोले ऑटो-अटैच होकर जाएगी।
              </p>
            )}

            {/* Saved Image Library Strip (Switch between previously uploaded images in 1 tap) */}
            {attachments.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">सेव इमेज:</span>
                <button
                  type="button"
                  onClick={() => handleSelectAttachment(null)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border shrink-0 transition-colors ${
                    !activeAttachment
                      ? 'bg-slate-700 text-white border-slate-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  सिर्फ टेक्स्ट
                </button>
                {attachments.map((att) => {
                  const isActive = activeAttachmentId === att.id;
                  return (
                    <div
                      key={att.id}
                      className={`inline-flex items-center rounded-xl border p-1 pr-1.5 space-x-1.5 shrink-0 transition-all ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectAttachment(att.id)}
                        className="flex items-center space-x-1.5"
                      >
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="w-7 h-7 rounded-lg object-cover border border-slate-700"
                        />
                        <span className="text-[11px] font-bold max-w-[95px] truncate">
                          {att.name}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="p-0.5 text-slate-500 hover:text-rose-400"
                        title="इस सेव इमेज को हटाएं"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाम, शाखा, फोन या EC नं सर्च करें..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Branch Dropdown (Branch Alpha Keyed) */}
          <select
            value={selectedBranchAlpha}
            onChange={(e) => setSelectedBranchAlpha(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">🏦 सभी 59 शाखाएं (All Branches)</option>
            {sortedBranches.map((b) => (
              <option key={b.id} value={b.branchAlpha}>
                {b.branch} ({b.branchAlpha} • SOL {b.solId})
              </option>
            ))}
          </select>

          {/* Designation Dropdown */}
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">👔 सभी पद (All Designations)</option>
            {designationOptions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>

          {/* Area Category Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] overflow-x-auto">
            {[
              { id: 'ALL', label: 'सभी' },
              { id: 'RURAL', label: '🌾 ग्रामीण' },
              { id: 'SEMI-URBAN', label: '🏘️ अर्ध-शहरी' },
              { id: 'URBAN', label: '🏙️ शहरी' },
            ].map((area) => (
              <button
                key={area.id}
                onClick={() => setAreaCategoryFilter(area.id as 'ALL' | 'RURAL' | 'SEMI-URBAN' | 'URBAN')}
                className={`flex-1 px-2 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  areaCategoryFilter === area.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {area.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Marked Work Role Quick Filter */}
        {workRoles.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold text-fuchsia-300 flex items-center space-x-1 mr-1">
              <Target className="w-3.5 h-3.5" />
              <span>मार्क कार्य फ़िल्टर:</span>
            </span>
            <button
              onClick={() => setWorkRoleFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                workRoleFilter === 'ALL'
                  ? 'bg-slate-700 text-white border-slate-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              सभी स्टाफ
            </button>
            <button
              onClick={() => setWorkRoleFilter('ANY_MARKED')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                workRoleFilter === 'ANY_MARKED'
                  ? 'bg-fuchsia-600 text-white border-fuchsia-400'
                  : 'bg-slate-950 text-fuchsia-300 border-fuchsia-500/30 hover:border-fuchsia-400'
              }`}
            >
              🎯 सभी मार्क किए गए ({branchRoleAssignments.length})
            </button>
            {workRoles.map((role) => {
              const count = branchRoleAssignments.filter((a) => a.roleId === role.id).length;
              if (count === 0 && workRoleFilter !== role.id) return null;
              return (
                <button
                  key={role.id}
                  onClick={() => setWorkRoleFilter(role.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    workRoleFilter === role.id
                      ? 'bg-fuchsia-600 text-white border-fuchsia-300 shadow-sm'
                      : 'bg-slate-950 text-fuchsia-200 border-fuchsia-500/30 hover:border-fuchsia-400'
                  }`}
                >
                  {role.icon} {role.shortLabel} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Sub-filters: Sent Status & On-Leave Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 text-[11px] font-semibold flex items-center space-x-1 mr-1">
              <Filter className="w-3 h-3" />
              <span>फ़िल्टर:</span>
            </span>
            <button
              onClick={() => setSentFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                sentFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              सभी ({allBranchStaff.length})
            </button>
            <button
              onClick={() => setSentFilter('unsent')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                sentFilter === 'unsent' ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              बाकी
            </button>
            <button
              onClick={() => setSentFilter('sent')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                sentFilter === 'sent' ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              आज भेजे गए ✓ ({sentTodayCount})
            </button>

            <button
              onClick={() => setHideOnLeave(!hideOnLeave)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                hideOnLeave
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Palmtree className="w-3 h-3" />
              <span>{hideOnLeave ? 'छुट्टी वाले छिपे हैं' : 'छुट्टी वाले भी दिख रहे हैं'}</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono">
            दिखाए गए स्टाफ: {filteredStaff.length}
          </span>
        </div>
      </div>

      {/* Staff Cards Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">कोई स्टाफ नहीं मिला (No matching staff).</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedBranchAlpha('ALL');
              setAreaCategoryFilter('ALL');
              setDesignationFilter('ALL');
              setWorkRoleFilter('ALL');
              setHideOnLeave(false);
              setSentFilter('all');
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
          >
            सभी फ़िल्टर साफ़ करें
          </button>
        </div>
      ) : (
        <div
          className={`grid gap-3 ${
            isCompact
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : isLarge
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {filteredStaff.map((staff) => {
            const leaveEntry = getStaffLeaveEntry(staff, staffLeaves, today);
            const onLeave = !!leaveEntry;
            const key = getStaffLeaveKey(staff);
            const sentTimestamp = sentMap[key];
            const isBranchHead = staff.position.toUpperCase().includes('BRANCH HEAD');
            const staffAssigns = getAssignmentsForStaff(staff, branchRoleAssignments);

            return (
              <div
                key={staff.id}
                className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col justify-between gap-3 transition-all shadow-md ${
                  sentTimestamp
                    ? 'bg-emerald-950/15 border-emerald-500/40'
                    : onLeave
                    ? 'bg-amber-950/15 border-amber-500/40'
                    : isBranchHead
                    ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border-blue-500/40'
                    : 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="space-y-1.5">
                  {/* Top Row: Branch & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-blue-300 border border-slate-700 truncate">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{staff.branch}</span>
                      <span className="text-slate-500 font-mono">({staff.branchAlpha})</span>
                    </span>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {sentTimestamp && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>भेजा गया</span>
                        </span>
                      )}
                      {onLeave && leaveEntry && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          🏖️ छुट्टी पर ({leaveEntry.leaveUntil})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Staff Name & Position */}
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <h4 className="font-black text-white text-sm sm:text-base">{staff.name}</h4>
                      {isBranchHead && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/30">
                          BM
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-emerald-300 mt-0.5">{staff.position}</div>
                    {staffAssigns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {staffAssigns.map((a) => {
                          const role = workRoles.find((r) => r.id === a.roleId);
                          if (!role) return null;
                          return (
                            <span
                              key={a.id}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40"
                            >
                              {role.icon} {role.shortLabel}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Meta & Phone */}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 pt-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        EC: {staff.ecNo}
                      </span>
                      {staff.grade && (
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                          {staff.grade}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-emerald-400 flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{staff.phone}</span>
                    </span>
                  </div>
                </div>

                {/* Action Row: Edit Custom & Direct 1-Tap WhatsApp / WA Business / Auto-Image Send */}
                <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setModalStaff(staff)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors shrink-0"
                    title="संदेश एडिट करके भेजें"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>एडिट</span>
                  </button>

                  {activeAttachment && (
                    <button
                      type="button"
                      onClick={() => handleDirectSendToStaff(staff, true)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold shrink-0"
                      title="सीधे इस स्टाफ की चैट खोलें (इमेज क्लिपबोर्ड में कॉपी होगी)"
                    >
                      💬 चैट
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDirectSendToStaff(staff, false)}
                    className={`flex-1 py-2 px-3 font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-md transition-transform active:scale-95 min-w-0 ${
                      appMode === 'whatsapp_business'
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-teal-950/40'
                        : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-950/40'
                    }`}
                  >
                    {activeAttachment ? (
                      <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    ) : appMode === 'whatsapp_business' ? (
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <Send className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">
                      {activeAttachment
                        ? appMode === 'whatsapp_business'
                          ? '📎 इमेज + Business'
                          : '📎 इमेज + WhatsApp'
                        : appMode === 'whatsapp_business'
                        ? '💼 WA Business'
                        : '💬 WhatsApp भेजें'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Per-Staff WhatsApp Composer Modal */}
      <StaffWhatsAppModal
        isOpen={!!modalStaff}
        onClose={() => setModalStaff(null)}
        staff={modalStaff}
        initialMessage={messageBody}
        initialAppMode={appMode}
        initialAttachment={activeAttachment}
        leaveEntry={modalStaff ? getStaffLeaveEntry(modalStaff, staffLeaves, today) : null}
        onMarkSent={(s) => markStaffSent(s)}
        onTemplatesChanged={() => setTemplates(loadWhatsAppTemplates())}
        onAppModeChanged={(mode) => setAppMode(mode)}
      />
    </div>
  );
};
