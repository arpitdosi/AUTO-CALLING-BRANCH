/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  PhoneCall,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  UserPlus,
  Settings as SettingsIcon,
  HelpCircle,
  Building2,
  Users,
  ShieldCheck,
  ChevronRight,
  ListFilter,
  LayoutGrid,
  Table as TableIcon,
  Play,
  Share2,
  Palmtree,
  EyeOff,
  PhoneIncoming,
} from 'lucide-react';

import { BranchManager, CallOutcome, DailySession, DialingSettings, CallLogEntry, StaffContact } from './types';
import {
  loadManagers,
  saveManagers,
  loadTodaySession,
  saveDailySession,
  loadSettings,
  saveSettings,
  getTodayKey,
  isManagerOnLeave,
  isManagerSkippedToday,
} from './utils/storage';
import { INITIAL_BRANCH_MANAGERS } from './data/defaultManagers';
import { AutoDialerModal } from './components/AutoDialerModal';
import { ReportModal } from './components/ReportModal';
import { AddEditManagerModal } from './components/AddEditManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { ManagerCard } from './components/ManagerCard';
import { LeaveModal } from './components/LeaveModal';
import { StaffHierarchyModal } from './components/StaffHierarchyModal';
import { RegionalStaffModal } from './components/RegionalStaffModal';
import { ShareModal } from './components/ShareModal';
import { EditCallStatusModal } from './components/EditCallStatusModal';
import {
  buildDesignationCallingQueue,
  DESIGNATION_OPTIONS,
  CampaignCallingItem,
} from './utils/staffMatcher';

export default function App() {
  const [managers, setManagers] = useState<BranchManager[]>([]);
  const [session, setSession] = useState<DailySession>(loadTodaySession());
  const [settings, setSettings] = useState<DialingSettings>(loadSettings());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'connected' | 'pending' | 'uncalled' | 'on_leave' | 'skipped_today'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialerQueue, setDialerQueue] = useState<CampaignCallingItem[]>([]);
  const [dialerRound, setDialerRound] = useState<number>(1);
  const [dialerStartIndex, setDialerStartIndex] = useState<number>(0);

  // Target Designation for Daily Calling
  const [selectedDesignation, setSelectedDesignation] = useState<string>('ALL_BM');
  const [isRegionalStaffOpen, setIsRegionalStaffOpen] = useState(false);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<BranchManager | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Point 1 & 2 Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [selectedLeaveManager, setSelectedLeaveManager] = useState<BranchManager | null>(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [selectedHierarchyManager, setSelectedHierarchyManager] = useState<BranchManager | null>(null);

  // Status Edit & Callback State
  const [isStatusEditOpen, setIsStatusEditOpen] = useState(false);
  const [statusEditManager, setStatusEditManager] = useState<BranchManager | null>(null);
  const [statusEditTargetItem, setStatusEditTargetItem] = useState<CampaignCallingItem | undefined>(undefined);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize data on mount
  useEffect(() => {
    const loaded = loadManagers();
    setManagers(loaded);
  }, []);

  // Update session and save
  const updateSession = (newSession: DailySession) => {
    setSession(newSession);
    saveDailySession(newSession);
  };

  const today = getTodayKey();

  // Point 1: Update Leave / DND status
  const handleUpdateLeave = (managerId: string, leaveUntil?: string, reason?: string) => {
    const updated = managers.map((m) => {
      if (m.id === managerId) {
        return {
          ...m,
          leaveUntil: leaveUntil || undefined,
          leaveReason: reason || undefined,
        };
      }
      return m;
    });
    setManagers(updated);
    saveManagers(updated);
  };

  // Point 2: Update Backup / Alternate Staff contacts
  const handleUpdateBackupContacts = (managerId: string, backupContacts: StaffContact[]) => {
    const updated = managers.map((m) => {
      if (m.id === managerId) {
        return { ...m, backupContacts };
      }
      return m;
    });
    setManagers(updated);
    saveManagers(updated);
  };

  // Point 3: Toggle Skip Today for a branch
  const handleToggleSkipToday = (managerId: string) => {
    const updated = managers.map((m) => {
      if (m.id === managerId) {
        const isAlreadySkipped = isManagerSkippedToday(m, today);
        return {
          ...m,
          skipTodayDate: isAlreadySkipped ? undefined : today,
        };
      }
      return m;
    });
    setManagers(updated);
    saveManagers(updated);
  };

  // Record a call attempt from either dialer or quick card click
  const handleRecordCall = (
    managerId: string,
    outcome: CallOutcome,
    notes?: string,
    duration?: number,
    tags?: string[],
    contactedPerson?: string
  ) => {
    const targetManager = managers.find((m) => m.id === managerId);
    if (!targetManager) return;

    const newLog: CallLogEntry = {
      id: `${managerId}_${Date.now()}`,
      managerId,
      managerName: contactedPerson || targetManager.name,
      branch: targetManager.branch,
      solId: targetManager.solId,
      phone: targetManager.phone,
      contactPersonRole: contactedPerson ? `Officer: ${contactedPerson}` : 'Primary BM',
      timestamp: Date.now(),
      outcome,
      round: dialerRound,
      notes: notes || '',
      callDurationSeconds: duration || 0,
      tags: tags || [],
    };

    const updatedSession: DailySession = {
      ...session,
      lastUpdatedAt: Date.now(),
      callLogs: {
        ...session.callLogs,
        [managerId]: newLog,
      },
      callHistory: [newLog, ...session.callHistory],
    };

    updateSession(updatedSession);
  };

  // Quick manual status update
  const handleQuickStatusUpdate = (managerId: string, outcome: CallOutcome) => {
    handleRecordCall(managerId, outcome, '', 0, []);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Point 10: One-click Callback Received - Mark as Connected & Clear from Pending Queue
  const handleCallbackReceived = (managerId: string) => {
    const mgr = managers.find((m) => m.id === managerId);
    if (!mgr) return;
    const activeTarget = designationItemByBranchId.get(managerId);
    const targetName = activeTarget?.targetName || mgr.name;

    handleRecordCall(
      managerId,
      'connected',
      'शाखा से वापस कॉल आया - बात संपन्न ✅ (Incoming Callback)',
      60,
      ['वापस कॉल आया (Incoming)', 'बात हो गई'],
      `${targetName} (वापस कॉल आया)`
    );

    showToast(`✓ ${mgr.branch} शाखा से वापस कॉल आया: 'बात हो गई ✅' दर्ज हुआ!`);
  };

  // Detailed save from EditCallStatusModal
  const handleSaveCallStatus = (
    managerId: string,
    outcome: CallOutcome | 'clear',
    notes: string,
    tags: string[],
    contactedPerson?: string
  ) => {
    const mgr = managers.find((m) => m.id === managerId);
    if (!mgr) return;

    if (outcome === 'clear') {
      const newLogs = { ...session.callLogs };
      delete newLogs[managerId];
      const updatedSession: DailySession = {
        ...session,
        lastUpdatedAt: Date.now(),
        callLogs: newLogs,
      };
      updateSession(updatedSession);
      showToast(`🔄 ${mgr.branch} शाखा: कॉल स्थिति रीसेट (बाकी / Uncalled) की गई।`);
    } else {
      handleRecordCall(
        managerId,
        outcome,
        notes,
        outcome === 'connected' ? 60 : 0,
        tags,
        contactedPerson
      );
      const outcomeLabel =
        outcome === 'connected'
          ? 'बात हो गई ✅'
          : outcome === 'not_answered'
          ? 'बात नहीं हुई ❌'
          : outcome === 'busy'
          ? 'व्यस्त ⏳'
          : 'स्विच ऑफ 📵';
      showToast(`✓ ${mgr.branch} शाखा: स्थिति '${outcomeLabel}' अपडेट हो गई।`);
    }
  };

  // Active calling managers (excluding on_leave and skipped_today for active dialing)
  const activeCallingManagers = useMemo(() => {
    return managers.filter((m) => !isManagerOnLeave(m, today) && !isManagerSkippedToday(m, today));
  }, [managers, today]);

  const onLeaveCount = useMemo(() => {
    return managers.filter((m) => isManagerOnLeave(m, today)).length;
  }, [managers, today]);

  const skippedTodayCount = useMemo(() => {
    return managers.filter((m) => isManagerSkippedToday(m, today)).length;
  }, [managers, today]);

  // Calculate statistics for active calling scope
  const stats = useMemo(() => {
    const total = managers.length;
    let connectedCount = 0;
    let pendingCount = 0;
    let uncalledCount = 0;

    managers.forEach((m) => {
      const log = session.callLogs[m.id];
      if (!log) {
        uncalledCount++;
      } else if (log.outcome === 'connected') {
        connectedCount++;
      } else {
        pendingCount++;
      }
    });

    const completionPercent = total > 0 ? Math.round((connectedCount / total) * 100) : 0;
    return { total, connectedCount, pendingCount, uncalledCount, completionPercent };
  }, [managers, session.callLogs]);

  // Designation-based calling queue
  const currentDesignationQueue = useMemo(() => {
    return buildDesignationCallingQueue(selectedDesignation, managers);
  }, [selectedDesignation, managers]);

  const activeDesignationQueue = useMemo(() => {
    return currentDesignationQueue.filter((item) => !item.isOnLeave && !item.isSkippedToday);
  }, [currentDesignationQueue]);

  // Determine the index to resume from (first uncalled active item in this designation campaign)
  const resumeIndex = useMemo(() => {
    const idx = activeDesignationQueue.findIndex((item) => !session.callLogs[item.branchId]);
    return idx !== -1 ? idx : 0;
  }, [activeDesignationQueue, session.callLogs]);

  const isCampaignPartiallyDone = useMemo(() => {
    return (stats.connectedCount + stats.pendingCount > 0) && stats.uncalledCount > 0;
  }, [stats]);

  // Start complete campaign using active designation queue
  const startFullCampaign = (fromIndex?: number) => {
    if (activeDesignationQueue.length === 0) {
      alert('All branches are currently on leave or skipped for today!');
      return;
    }
    const targetIndex = typeof fromIndex === 'number' ? fromIndex : resumeIndex;
    setDialerQueue(activeDesignationQueue);
    setDialerStartIndex(targetIndex);
    setDialerRound(1);
    setIsDialerOpen(true);
  };

  // Start Pending Re-dial Round:
  // "agar kisi branch me 1 se jayada ek hi designation wale log hai to usme se koi bhi ek pehle randomly select ho jaye par agar wo call pending me jaye to automatically second wale ko call jaye."
  const startPendingReDialRound = () => {
    const pendingItems = activeDesignationQueue
      .filter((item) => {
        const outcome = session.callLogs[item.branchId]?.outcome;
        return outcome === 'not_answered' || outcome === 'busy' || outcome === 'switched_off';
      })
      .map((item) => {
        // If this branch had more than 1 officer of this designation, rotate to the second officer!
        if (item.alternativeStaff && item.alternativeStaff.length > 0) {
          const nextOfficer = item.alternativeStaff[0];
          return {
            ...item,
            targetName: nextOfficer.name,
            name: nextOfficer.name,
            targetPhone: nextOfficer.phone,
            phone: nextOfficer.phone,
            targetPosition: `${nextOfficer.position} (2nd Officer)`,
            targetGrade: nextOfficer.grade,
            alternativeStaff: item.alternativeStaff.slice(1),
          };
        }
        return item;
      });

    if (pendingItems.length === 0) {
      alert('No pending calls in this campaign!');
      return;
    }

    const nextRound = (session.activeRound || 1) + 1;
    setDialerRound(nextRound);
    setDialerQueue(pendingItems);
    setDialerStartIndex(0);
    setIsDialerOpen(true);
  };

  // Map of branchId -> CampaignCallingItem based on selected designation
  const designationItemByBranchId = useMemo(() => {
    const map = new Map<string, CampaignCallingItem>();
    currentDesignationQueue.forEach((item) => {
      map.set(item.branchId, item);
    });
    return map;
  }, [currentDesignationQueue]);

  // Start single call session with designated target officer support
  const startSingleCall = (manager: BranchManager, targetItem?: CampaignCallingItem) => {
    const activeTarget: CampaignCallingItem = targetItem || designationItemByBranchId.get(manager.id) || {
      id: `bm_${manager.id}`,
      branchId: manager.id,
      branchName: manager.branch,
      branch: manager.branch,
      solId: manager.solId,
      branchAlpha: manager.branchAlpha,
      targetName: manager.name,
      name: manager.name,
      targetPosition: 'BRANCH HEAD (शाखा प्रबंधक)',
      targetPhone: manager.phone,
      phone: manager.phone,
      targetGrade: 'BM',
      isFallbackToBM: false,
      alternativeStaff: [],
      branchHeadName: manager.name,
      branchHeadPhone: manager.phone,
      isOnLeave: isManagerOnLeave(manager, today),
      isSkippedToday: isManagerSkippedToday(manager, today),
    };

    setDialerQueue([activeTarget]);
    setDialerStartIndex(0);
    setDialerRound(session.callLogs[manager.id] ? 2 : 1);
    setIsDialerOpen(true);
  };

  // Save or edit manager
  const handleSaveManager = (manager: BranchManager) => {
    let updated: BranchManager[];
    const exists = managers.some((m) => m.id === manager.id);
    if (exists) {
      updated = managers.map((m) => (m.id === manager.id ? manager : m));
    } else {
      updated = [manager, ...managers];
    }
    setManagers(updated);
    saveManagers(updated);
  };

  // Delete manager
  const handleDeleteManager = (managerId: string) => {
    if (confirm('Are you sure you want to remove this branch manager?')) {
      const updated = managers.filter((m) => m.id !== managerId);
      setManagers(updated);
      saveManagers(updated);
    }
  };

  // Reset session
  const handleResetSession = () => {
    const cleanSession: DailySession = {
      date: getTodayKey(),
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      activeRound: 1,
      callLogs: {},
      callHistory: [],
    };
    updateSession(cleanSession);
  };

  // Restore 59 initial managers
  const handleResetToDefault = () => {
    setManagers(INITIAL_BRANCH_MANAGERS);
    saveManagers(INITIAL_BRANCH_MANAGERS);
    handleResetSession();
  };

  // Filtered managers for list/table view - also matches against selected designated target officers
  const filteredManagers = useMemo(() => {
    return managers.filter((m) => {
      const targetItem = designationItemByBranchId.get(m.id);
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.branch.toLowerCase().includes(q) ||
        m.solId.includes(q) ||
        m.phone.includes(q) ||
        m.branchAlpha.toLowerCase().includes(q) ||
        (targetItem && (
          targetItem.targetName.toLowerCase().includes(q) ||
          targetItem.targetPhone.includes(q) ||
          targetItem.targetPosition.toLowerCase().includes(q)
        ));

      if (!matchQuery) return false;

      // Status filter
      const outcome = session.callLogs[m.id]?.outcome;
      if (activeFilter === 'all') return true;
      if (activeFilter === 'connected') return outcome === 'connected';
      if (activeFilter === 'pending') {
        return outcome === 'not_answered' || outcome === 'busy' || outcome === 'switched_off';
      }
      if (activeFilter === 'uncalled') return !outcome && !isManagerOnLeave(m, today) && !isManagerSkippedToday(m, today);
      if (activeFilter === 'on_leave') return isManagerOnLeave(m, today);
      if (activeFilter === 'skipped_today') return isManagerSkippedToday(m, today);

      return true;
    });
  }, [managers, searchQuery, activeFilter, session.callLogs, today, designationItemByBranchId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Bank BM Call Manager
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Auto-Dialer
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                दैनिक 1-बाय-1 ऑटो कॉलिंग एवं पेंडिंग कॉल री-डायल सिस्टम
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsShareOpen(true)}
              className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-95"
              title="स्टाफ के साथ ऐप लिंक शेयर करें या Vercel लिंक बनाएं"
            >
              <Share2 className="w-4 h-4" />
              <span>शेयर लिंक (Share)</span>
            </button>

            <button
              onClick={() => setIsRegionalStaffOpen(true)}
              className="px-3 py-2 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="View all 452 staff of Bhavnagar region"
            >
              <Users className="w-4 h-4 text-indigo-300" />
              <span className="hidden md:inline">रीजनल डायरेक्टरी (452 Staff)</span>
            </button>

            <button
              onClick={() => setIsReportOpen(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="Daily Report & WhatsApp Export"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">दैनिक रिपोर्ट (Report)</span>
            </button>

            <button
              onClick={() => {
                setEditingManager(null);
                setIsAddEditOpen(true);
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="Add New Branch Manager"
            >
              <UserPlus className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">नया जोड़ें (Add)</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Hero Action Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-700/50 p-5 sm:p-7 shadow-2xl space-y-5">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 rounded-full text-xs font-semibold">
                  <span>📅 Date: {session.date}</span>
                  <span>•</span>
                  <span>{stats.total} Branches Loaded</span>
                  <span>•</span>
                  <span>452 Regional Staff Added</span>
                </div>
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>स्टाफ को ऐप लिंक भेजें ↗</span>
                </button>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                दैनिक ऑटो-कॉलिंग प्रोग्राम
              </h2>
              <p className="text-sm text-blue-200 leading-relaxed">
                आज आप जिस पद के अधिकारियों को कॉल करना चाहते हैं, उसे नीचे चुनें। यदि किसी शाखा में वह अधिकारी उपलब्ध नहीं होगा, तो सिस्टम <strong>स्वतः उस शाखा के प्रबंधक (BM)</strong> का नंबर डायल करेगा!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Primary Start Full Campaign Button */}
              <button
                onClick={() => startFullCampaign()}
                className="px-6 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-3 transition-transform active:scale-95 text-base"
              >
                <Play className="w-6 h-6 fill-current" />
                <span>
                  {isCampaignPartiallyDone
                    ? `कॉलिंग जारी रखें (Resume #${resumeIndex + 1})`
                    : `1-by-1 कॉलिंग शुरू करें`}
                </span>
              </button>

              {/* If partially done, offer restart from #1 button */}
              {isCampaignPartiallyDone && (
                <button
                  onClick={() => startFullCampaign(0)}
                  className="px-4 py-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-bold rounded-2xl flex items-center justify-center space-x-2 transition-colors text-sm"
                  title="पहले नंबर (#1) से फिर शुरू करें"
                >
                  <RotateCcw className="w-4 h-4 text-blue-400" />
                  <span>शुरू से (#1)</span>
                </button>
              )}

              {/* Pending Re-dial Round button if any pending */}
              {stats.pendingCount > 0 && (
                <button
                  onClick={startPendingReDialRound}
                  className="px-5 py-4 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-bold rounded-2xl flex items-center justify-center space-x-2 transition-colors active:scale-95 text-sm"
                >
                  <RotateCcw className="w-5 h-5 text-amber-400" />
                  <span>पेंडिंग री-डायल राउंड ({stats.pendingCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Designation Calling Mode Selector (User Specific Requirement) */}
          <div className="pt-2 border-t border-blue-800/60 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>आज किसे कॉल करना है? पद चुनें (Select Calling Designation):</span>
              </span>
              <span className="text-[11px] text-blue-300 bg-blue-950/80 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-mono">
                {currentDesignationQueue.filter((x) => !x.isFallbackToBM).length} शाखाओं में यह पद मौजूद •{' '}
                {currentDesignationQueue.filter((x) => x.isFallbackToBM).length} में ऑटो-फॉलबैक BM को
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DESIGNATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedDesignation(opt.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all border flex items-center justify-between ${
                    selectedDesignation === opt.id
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/30'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {selectedDesignation === opt.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white ml-1"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* How it works collapsible trigger */}
          <div className="mt-4 pt-4 border-t border-blue-800/60 flex items-center justify-between text-xs text-blue-300">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="flex items-center space-x-1.5 hover:text-white transition-colors underline font-medium"
            >
              <HelpCircle className="w-4 h-4" />
              <span>सिस्टम कैसे काम करता है (How It Works)?</span>
            </button>
            <span className="text-[11px] text-blue-300/80">
              {stats.completionPercent}% Complete ({stats.connectedCount}/{stats.total})
            </span>
          </div>

          {/* Explanatory Drawer */}
          {showHowItWorks && (
            <div className="mt-3 p-4 bg-slate-950/80 border border-blue-500/30 rounded-2xl text-xs space-y-2 text-slate-300">
              <div className="font-bold text-emerald-400">
                ✅ आपकी आवश्यकता अनुसार बनाया गया ऑटो-डायल फ्लो:
              </div>
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>
                  <strong>1-by-1 ऑटो कॉलिंग:</strong> "1-by-1 कॉलिंग शुरू करें" दबाने पर पहला अधिकारी स्क्रीन पर आएगा और डायल होगा।
                </li>
                <li>
                  <strong className="text-amber-300">⏸️ पॉज़ बटन (Pause Calling):</strong> कॉलिंग स्क्रीन में ऊपर हेडर में और बीच में बड़ा <strong>"⏸️ थोड़ी देर के लिए रोकें / ब्रेक लें"</strong> बटन दिया गया है। जब भी आप चाय, लंच या मीटिंग ब्रेक लेना चाहें, इस बटन को दबाएं। ब्रेक टाइमर चलेगा और आपकी प्रगति सुरक्षित रहेगी।
                </li>
                <li>
                  <strong className="text-emerald-300">⚡ 3 सेकंड ऑटो-कन्फर्म (Auto-Confirm):</strong> कॉल कटने के बाद अगर आप 3 सेकंड तक कोई बटन नहीं दबाएंगे, तो सिस्टम इसे अपने आप <strong>'बात हो गई ✅'</strong> मानकर तुरंत अगला कॉल स्क्रीन पर ले आएगा! यदि बात नहीं हुई हो, तो बस लाल <em>"बात नहीं हुई ❌"</em> बटन दबाएं।
                </li>
                <li>
                  <strong className="text-indigo-300">🎯 पद अनुसार सूची (Designation List):</strong> ऊपर दिए गए बटन्स (जैसे ऑपरेशंस हेड, क्रेडिट ऑफिसर, कैशियर आदि) में से कोई भी पद चुनते ही नीचे 59 शाखाओं के कार्ड्स में उस शाखा के संबंधित अधिकारी का नाम व मोबाइल नंबर तुरंत अपडेट हो जाएगा। जहाँ वह पद नहीं होगा, वहाँ BM का नंबर दिखेगा।
                </li>
                <li>
                  <strong className="text-blue-300">📱 बैकग्राउंड मल्टीटास्किंग (WhatsApp / Instagram):</strong> कॉलिंग शुरू करने के बाद आप बेझिझक WhatsApp, Instagram या अन्य ऐप्स खोल सकते हैं। बैकग्राउंड कीप-अलाइव और स्क्रीन वेक-लॉक की मदद से कॉलिंग प्रक्रिया बैकग्राउंड में बिना रुके चलती रहेगी।
                </li>
                <li>
                  <strong>पेंडिंग री-डायल राउंड:</strong> सभी कॉल होने के बाद पेंडिंग कॉल्स को 1 क्लिक में दोबारा डायल किया जा सकता है।
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Live Calling Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{stats.total}</div>
              <div className="text-xs text-slate-400 font-medium">कुल शाखाएं (Total)</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">{stats.connectedCount}</div>
              <div className="text-xs text-emerald-300 font-medium">बात हो गई (Done)</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center font-bold">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-rose-400">{stats.pendingCount}</div>
              <div className="text-xs text-rose-300 font-medium">पेंडिंग री-डायल (Pending)</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-200">{stats.uncalledCount}</div>
              <div className="text-xs text-slate-400 font-medium">कॉल बाकी (Uncalled)</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">
              आज की कॉलिंग प्रगति (Daily Progress): {stats.connectedCount} of {stats.total} Done
            </span>
            <span className="font-bold text-emerald-400">{stats.completionPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${(stats.connectedCount / (stats.total || 1)) * 100}%` }}
              title="Connected"
            />
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${(stats.pendingCount / (stats.total || 1)) * 100}%` }}
              title="Pending"
            />
          </div>
        </div>

        {/* Search, Filter & List Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search branch name, manager, Sol ID, phone..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center space-x-1.5 self-end sm:self-center">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Grid Cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold flex items-center space-x-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>फ़िल्टर:</span>
            </span>

            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
            >
              सभी (All) ({stats.total})
            </button>

            <button
              onClick={() => setActiveFilter('connected')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1 ${
                activeFilter === 'connected'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>बात हो गई ({stats.connectedCount})</span>
            </button>

            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1 ${
                activeFilter === 'pending'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-rose-300 hover:bg-slate-800'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>बात नहीं हुई (पेंडिंग) ({stats.pendingCount})</span>
            </button>

            <button
              onClick={() => setActiveFilter('uncalled')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1 ${
                activeFilter === 'uncalled'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>कॉल बाकी ({stats.uncalledCount})</span>
            </button>

            {onLeaveCount > 0 && (
              <button
                onClick={() => setActiveFilter('on_leave')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1 ${
                  activeFilter === 'on_leave'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
                }`}
              >
                <Palmtree className="w-3.5 h-3.5" />
                <span>छुट्टी पर ({onLeaveCount})</span>
              </button>
            )}

            {skippedTodayCount > 0 && (
              <button
                onClick={() => setActiveFilter('skipped_today')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors flex items-center space-x-1 ${
                  activeFilter === 'skipped_today'
                    ? 'bg-rose-700 text-white shadow-sm'
                    : 'bg-slate-800/80 text-rose-300 hover:bg-slate-800'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>आज छोड़े गए ({skippedTodayCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Active Designation Banner (Requirement 2) */}
        <div className="bg-gradient-to-r from-indigo-950/90 via-blue-950/80 to-slate-900 border-2 border-indigo-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/50 text-indigo-300 flex items-center justify-center font-bold shadow-inner">
              <Users className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-extrabold text-indigo-300 flex items-center space-x-1.5">
                <span>🎯 वर्तमान चयनित पद (Selected Calling Position):</span>
                {selectedDesignation !== 'ALL_BM' && (
                  <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px]">
                    सूची ऑटो-अपडेट हो चुकी है
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-black text-white">
                {DESIGNATION_OPTIONS.find((o) => o.id === selectedDesignation)?.label || selectedDesignation}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                नीचे सभी 59 शाखाओं के कार्ड्स में इस पद के अधिकारी का नाम व नंबर ऑटो-लोड है। जहाँ यह पद नहीं है, वहाँ BM का नंबर दिखेगा।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 font-bold">
              ⏸️ पॉज़ बटन उपलब्ध
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold">
              ⚡ 3s ऑटो-कन्फर्म
            </span>
            <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 font-bold">
              📱 बैकग्राउंड मोड
            </span>
          </div>
        </div>

        {/* Branch Managers Display Section */}
        {filteredManagers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">कोई रिकॉर्ड नहीं मिला</h3>
            <p className="text-xs text-slate-400">
              कृपया सर्च शब्द या फ़िल्टर बदलें।
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('all');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
            >
              सारे 59 रिकॉर्ड्स देखें
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredManagers.map((m) => (
              <ManagerCard
                key={m.id}
                manager={m}
                targetCallingItem={designationItemByBranchId.get(m.id)}
                selectedDesignation={selectedDesignation}
                callLog={session.callLogs[m.id]}
                onCallSingle={startSingleCall}
                onUpdateStatusQuick={handleQuickStatusUpdate}
                onCallbackReceived={handleCallbackReceived}
                onOpenEditStatus={(mgr, targetItem) => {
                  setStatusEditManager(mgr);
                  setStatusEditTargetItem(targetItem);
                  setIsStatusEditOpen(true);
                }}
                onEdit={(mgr) => {
                  setEditingManager(mgr);
                  setIsAddEditOpen(true);
                }}
                onDelete={handleDeleteManager}
                onManageLeave={(mgr) => {
                  setSelectedLeaveManager(mgr);
                  setIsLeaveModalOpen(true);
                }}
                onManageHierarchy={(mgr) => {
                  setSelectedHierarchyManager(mgr);
                  setIsHierarchyModalOpen(true);
                }}
                onToggleSkipToday={handleToggleSkipToday}
                isSkippedToday={isManagerSkippedToday(m, today)}
                isOnLeave={isManagerOnLeave(m, today)}
                whatsappTemplate={settings.whatsappTemplate}
              />
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Sol ID</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">
                      {selectedDesignation === 'ALL_BM' ? 'Manager Name' : 'लक्षित अधिकारी (Target Officer)'}
                    </th>
                    <th className="py-3 px-4">पद (Role)</th>
                    <th className="py-3 px-4">Calling Mobile</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredManagers.map((m) => {
                    const log = session.callLogs[m.id];
                    const targetItem = designationItemByBranchId.get(m.id);
                    const isCustom = selectedDesignation !== 'ALL_BM' && !!targetItem;
                    const activeName = isCustom ? targetItem.targetName : m.name;
                    const activeRole = isCustom ? targetItem.targetPosition : 'Branch Manager';
                    const activePhone = isCustom ? targetItem.targetPhone : m.phone;
                    const isFallback = isCustom && targetItem.isFallbackToBM;

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-300">
                          {m.solId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{m.branch}</div>
                          <div className="text-[10px] text-slate-500">{m.branchAlpha}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-100">{activeName}</div>
                          {isCustom && !isFallback && (
                            <div className="text-[10px] text-slate-400">BM: {m.name}</div>
                          )}
                          {isFallback && (
                            <div className="text-[10px] text-amber-400">⚡ ऑटो-फॉलबैक (BM)</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-500/40">
                            {activeRole}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-300 font-bold">
                          +91 {activePhone}
                        </td>
                        <td className="py-3 px-4">
                          {isManagerOnLeave(m, today) ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                              🏖️ छुट्टी पर ({m.leaveUntil})
                            </span>
                          ) : isManagerSkippedToday(m, today) ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
                              🚫 आज छोड़ा
                            </span>
                          ) : log?.outcome === 'connected' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                              बात हो गई ✅
                            </span>
                          ) : log?.outcome === 'not_answered' || log?.outcome === 'busy' || log?.outcome === 'switched_off' ? (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-500/40 inline-block">
                                {log.outcome === 'busy' ? 'व्यस्त ⏳' : log.outcome === 'switched_off' ? 'स्विच ऑफ 📵' : 'बात नहीं हुई ❌'}
                              </span>
                              <div>
                                <button
                                  onClick={() => handleCallbackReceived(m.id)}
                                  className="px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-[10px] font-bold inline-flex items-center space-x-1 shadow-sm transition-transform active:scale-95"
                                  title="शाखा से वापस कॉल आया - बात हो गई के रूप में दर्ज करें"
                                >
                                  <PhoneIncoming className="w-3 h-3 text-emerald-200" />
                                  <span>वापस कॉल आया ✅</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                              बाकी (Uncalled)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setStatusEditManager(m);
                              setStatusEditTargetItem(targetItem);
                              setIsStatusEditOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                            title="कॉल स्थिति बदलें / नोट लिखें"
                          >
                            स्थिति ▾
                          </button>
                          <button
                            onClick={() => startSingleCall(m, targetItem)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-sm"
                          >
                            Call
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-4 px-4 text-center text-xs text-slate-500">
        Bank Branch Manager Daily Calling & Re-dial Workflow • Preloaded with 59 branches from Gujarat region
      </footer>

      {/* Modals */}
      <AutoDialerModal
        isOpen={isDialerOpen}
        onClose={() => setIsDialerOpen(false)}
        queue={dialerQueue}
        round={dialerRound}
        onRecordCall={handleRecordCall}
        settings={settings}
        onStartPendingRound={startPendingReDialRound}
        pendingCount={stats.pendingCount}
        initialIndex={dialerStartIndex}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        managers={managers}
        session={session}
      />

      <AddEditManagerModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingManager(null);
        }}
        onSave={handleSaveManager}
        editingManager={editingManager}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettings(newSettings);
        }}
        onResetSession={handleResetSession}
        onResetToDefaultManagers={handleResetToDefault}
      />

      {/* Point 1: Leave & DND Modal */}
      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          setSelectedLeaveManager(null);
        }}
        manager={selectedLeaveManager}
        onUpdateLeave={handleUpdateLeave}
      />

      {/* Point 2: Staff Calling Order & Hierarchy Modal */}
      <StaffHierarchyModal
        isOpen={isHierarchyModalOpen}
        onClose={() => {
          setIsHierarchyModalOpen(false);
          setSelectedHierarchyManager(null);
        }}
        manager={selectedHierarchyManager}
        onUpdateBackupContacts={handleUpdateBackupContacts}
      />

      {/* Regional Staff Directory (452 Staff) Modal */}
      <RegionalStaffModal
        isOpen={isRegionalStaffOpen}
        onClose={() => setIsRegionalStaffOpen(false)}
      />

      {/* Share / Vercel Link Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      {/* Point 10: Call Status, Callback & Outcome Editor Modal */}
      <EditCallStatusModal
        isOpen={isStatusEditOpen}
        onClose={() => {
          setIsStatusEditOpen(false);
          setStatusEditManager(null);
          setStatusEditTargetItem(undefined);
        }}
        manager={statusEditManager}
        currentCallLog={statusEditManager ? session.callLogs[statusEditManager.id] : undefined}
        targetOfficerName={statusEditTargetItem?.targetName}
        targetOfficerRole={statusEditTargetItem?.targetPosition}
        targetOfficerPhone={statusEditTargetItem?.targetPhone}
        onSaveStatus={handleSaveCallStatus}
      />

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 border border-emerald-400/50 backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <span className="text-xs sm:text-sm tracking-wide">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

