import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Phone,
  PhoneOff,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  MessageSquare,
  Volume2,
  Pause,
  Play,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Users,
  Smartphone,
  Bell,
  Sparkles,
  Zap,
  Activity,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CallOutcome, CallLogEntry, DialingSettings, StaffContact } from '../types';
import { CampaignCallingItem, getStaffForBranch } from '../utils/staffMatcher';
import { RegionalEmployee } from '../data/bhavnagarStaff';
import { playAudioFeedback } from '../utils/storage';
import { backgroundManager } from '../utils/backgroundManager';

interface AutoDialerModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: CampaignCallingItem[];
  round: number; // 1 = first attempt, 2+ = pending retry rounds
  onRecordCall: (
    branchId: string,
    outcome: CallOutcome,
    notes?: string,
    duration?: number,
    tags?: string[],
    contactedPerson?: string
  ) => void;
  settings: DialingSettings;
  onStartPendingRound?: () => void;
  pendingCount?: number;
  initialIndex?: number;
}

export const AutoDialerModal: React.FC<AutoDialerModalProps> = ({
  isOpen,
  onClose,
  queue,
  round,
  onRecordCall,
  settings,
  onStartPendingRound,
  pendingCount = 0,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [callDuration, setCallDuration] = useState(0);
  const [pauseDuration, setPauseDuration] = useState(0);
  const [isDialed, setIsDialed] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [nextCallCountdown, setNextCallCountdown] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Branch Staff Escalation State (User Requirement)
  const [activeEscalation, setActiveEscalation] = useState<RegionalEmployee | null>(null);
  const [hasAttemptedBackup, setHasAttemptedBackup] = useState<boolean>(false);
  const [showingBranchStaffPicker, setShowingBranchStaffPicker] = useState<boolean>(false);
  const [initialFailedOutcome, setInitialFailedOutcome] = useState<CallOutcome | null>(null);

  // Hands-Free Auto-Dialing State
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(settings.handsFreeAutoDial ?? true);
  const [callCutDetectionEnabled, setCallCutDetectionEnabled] = useState(settings.detectCallCut ?? true);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);

  // Call-Cut Detection State
  const [callCutDetected, setCallCutDetected] = useState(false);

  // Background Multitasking Notification permission
  const [hasNotifPerm, setHasNotifPerm] = useState(backgroundManager.hasNotificationPermission);

  const hiddenDialAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const hasNavigatedToDialer = useRef(false);
  const callDialedTimestamp = useRef<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentManager = queue[currentIndex];

  // Quick banking topics for notes
  const quickTags = [
    'Targets Discussed',
    'NPA / Recovery',
    'CASA / Deposit',
    'Loan Sanction',
    'Branch Visit',
    'Staff / Leave',
    'Satisfactory',
  ];

  // Retrieve all other available staff members for this branch (excluding current dialed officer and RO staff)
  const availableBranchStaff = useMemo(() => {
    if (!currentManager) return [];
    const allStaff = getStaffForBranch(currentManager.branch);

    const currentPhone = (activeEscalation ? activeEscalation.phone : currentManager.targetPhone).replace(/[^0-9]/g, '');
    const currentName = (activeEscalation ? activeEscalation.name : currentManager.targetName).trim().toLowerCase();

    return allStaff.filter((s) => {
      const staffPhone = (s.phone || '').replace(/[^0-9]/g, '');
      if (staffPhone && staffPhone === currentPhone) return false;
      if (s.name && s.name.trim().toLowerCase() === currentName) return false;
      return true;
    });
  }, [currentManager, activeEscalation]);

  const triggerPhoneCall = (phoneNumber: string) => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    setPrepCountdown(null);

    setIsDialed(true);
    setCallCutDetected(false);
    hasNavigatedToDialer.current = true;
    callDialedTimestamp.current = Date.now();

    if (settings.soundEffects) {
      playAudioFeedback('dial');
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
      if (hiddenDialAnchorRef.current) {
        hiddenDialAnchorRef.current.href = `tel:${cleanNumber}`;
        hiddenDialAnchorRef.current.click();
      } else {
        window.location.href = `tel:${cleanNumber}`;
      }
    } catch (err) {
      window.location.href = `tel:${cleanNumber}`;
    }

    if (currentManager) {
      backgroundManager.sendNotification(`डायल हो रहा है: ${currentManager.branchName}`, {
        body: `${currentManager.targetPosition}: ${currentManager.targetName} (${cleanNumber})`,
      });
    }
  };

  const startPrepCountdown = (phone: string) => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }

    const prepDelay = settings.autoDialPrepSeconds ?? 2;
    if (prepDelay <= 0) {
      triggerPhoneCall(phone);
      return;
    }

    setPrepCountdown(prepDelay);
    let count = prepDelay;

    prepTimerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        if (prepTimerRef.current) {
          clearInterval(prepTimerRef.current);
          prepTimerRef.current = null;
        }
        setPrepCountdown(null);
        triggerPhoneCall(phone);
      } else {
        setPrepCountdown(count);
      }
    }, 1000);
  };

  const proceedToNext = () => {
    setNextCallCountdown(null);
    setNotes('');
    setSelectedTag('');
    setCallDuration(0);
    setIsDialed(false);
    setCallCutDetected(false);
    setActiveEscalation(null);
    setHasAttemptedBackup(false);
    setShowingBranchStaffPicker(false);
    setInitialFailedOutcome(null);
    hasNavigatedToDialer.current = false;
    callDialedTimestamp.current = null;

    if (currentIndex < queue.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);

      const nextMgr = queue[nextIdx];
      if (nextMgr) {
        backgroundManager.sendNotification(`अगला कॉल: ${nextMgr.branchName}`, {
          body: `${nextMgr.targetPosition}: ${nextMgr.targetName} (${nextMgr.targetPhone})`,
        });

        if (handsFreeEnabled && !isPaused) {
          startPrepCountdown(nextMgr.targetPhone);
        }
      }
    } else {
      setIsFinished(true);
      if (settings.soundEffects) {
        playAudioFeedback('finish');
      }
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  };

  // User selects an alternate staff member from the branch staff list
  const handleSelectBackupStaff = (staff: RegionalEmployee) => {
    setActiveEscalation(staff);
    setHasAttemptedBackup(true);
    setShowingBranchStaffPicker(false);
    setIsDialed(false);
    setCallDuration(0);
    setCallCutDetected(false);
    hasNavigatedToDialer.current = false;
    callDialedTimestamp.current = null;

    // Immediately start dialing the chosen 2nd officer
    if (handsFreeEnabled && !isPaused) {
      startPrepCountdown(staff.phone);
    } else {
      triggerPhoneCall(staff.phone);
    }
  };

  // User decides not to call backup staff and skips to next branch
  const handleSkipToNextBranch = () => {
    if (!currentManager) return;
    setShowingBranchStaffPicker(false);
    const outcome = initialFailedOutcome || 'not_answered';
    const tagsToSave = selectedTag ? [selectedTag] : [];
    const notePrefix = `[1st Call Unanswered: ${currentManager.targetName} (Alternate Staff Skipped)] `;

    onRecordCall(
      currentManager.branchId,
      outcome,
      notePrefix + notes.trim(),
      callDuration,
      tagsToSave,
      currentManager.targetName
    );

    if (settings.autoNextDelaySeconds > 0 && currentIndex < queue.length - 1) {
      setNextCallCountdown(settings.autoNextDelaySeconds);
    } else {
      proceedToNext();
    }
  };

  const handleOutcome = (outcome: CallOutcome) => {
    if (!currentManager) return;

    hasNavigatedToDialer.current = false;

    // Case 1: Call Connected (बात हो गई)
    if (outcome === 'connected') {
      if (settings.soundEffects) {
        playAudioFeedback('success');
      }
      if (navigator.vibrate && settings.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      const tagsToSave = selectedTag ? [selectedTag] : [];
      const notePrefix = activeEscalation
        ? `[2nd Call Connected: ${activeEscalation.name} (${activeEscalation.position})] `
        : '';
      const contactedPerson = activeEscalation ? activeEscalation.name : currentManager.targetName;

      onRecordCall(
        currentManager.branchId,
        'connected',
        notePrefix + notes.trim(),
        callDuration,
        tagsToSave,
        contactedPerson
      );

      if (settings.autoNextDelaySeconds > 0 && currentIndex < queue.length - 1) {
        setNextCallCountdown(settings.autoNextDelaySeconds);
      } else {
        proceedToNext();
      }
      return;
    }

    // Case 2: 2nd Attempt Failed
    // User Requirement: "agar second time bhi mene baat nahi hui par click kra to next branch par switch karna"
    if (activeEscalation || hasAttemptedBackup) {
      if (settings.soundEffects) {
        playAudioFeedback('pending');
      }
      if (navigator.vibrate && settings.vibrate) {
        navigator.vibrate([200]);
      }

      const tagsToSave = selectedTag ? [selectedTag] : [];
      const notePrefix = `[1st & 2nd Call Failed: ${currentManager.targetName} & ${activeEscalation?.name || 'Staff'}] `;
      const contactedPerson = `${currentManager.targetName} / ${activeEscalation?.name || 'Alternate'}`;

      onRecordCall(
        currentManager.branchId,
        outcome,
        notePrefix + notes.trim(),
        callDuration,
        tagsToSave,
        contactedPerson
      );

      if (settings.autoNextDelaySeconds > 0 && currentIndex < queue.length - 1) {
        setNextCallCountdown(settings.autoNextDelaySeconds);
      } else {
        proceedToNext();
      }
      return;
    }

    // Case 3: 1st Attempt Failed
    // User Requirement: "jab me kisi ko call krne ke baad baat nahi hui par click Karu to turant screen par uss branch ke baki sare staff ki details aa jaye or usme se me kisi ko bhi select krke phir se call kar saku"
    if (availableBranchStaff.length > 0) {
      if (settings.soundEffects) {
        playAudioFeedback('pending');
      }
      if (navigator.vibrate && settings.vibrate) {
        navigator.vibrate([150]);
      }
      setInitialFailedOutcome(outcome);
      setShowingBranchStaffPicker(true);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setNextCallCountdown(null);
    } else {
      // No alternate staff in this branch: proceed to next branch directly
      if (settings.soundEffects) {
        playAudioFeedback('pending');
      }
      if (navigator.vibrate && settings.vibrate) {
        navigator.vibrate([200]);
      }
      const tagsToSave = selectedTag ? [selectedTag] : [];
      onRecordCall(
        currentManager.branchId,
        outcome,
        notes.trim(),
        callDuration,
        tagsToSave,
        currentManager.targetName
      );

      if (settings.autoNextDelaySeconds > 0 && currentIndex < queue.length - 1) {
        setNextCallCountdown(settings.autoNextDelaySeconds);
      } else {
        proceedToNext();
      }
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const openWhatsApp = () => {
    if (!currentManager) return;
    const cleanNumber = currentManager.phone.replace(/[^0-9]/g, '');
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const text = encodeURIComponent(
      `Respected ${currentManager.name} Ji (${currentManager.branch} Branch, Sol ID: ${currentManager.solId}),\n\n${settings.whatsappTemplate}`
    );
    window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
  };

  const handleRequestNotif = async () => {
    const granted = await backgroundManager.requestNotificationPermission();
    setHasNotifPerm(granted);
  };

  // LIFECYCLE HOOKS

  // Reset or set index when opened
  useEffect(() => {
    if (isOpen) {
      const validIndex = initialIndex >= 0 && initialIndex < queue.length ? initialIndex : 0;
      setCurrentIndex(validIndex);
      setCallDuration(0);
      setPauseDuration(0);
      setIsDialed(false);
      setCallCutDetected(false);
      setNotes('');
      setSelectedTag('');
      setNextCallCountdown(null);
      setPrepCountdown(null);
      setIsPaused(false);
      setIsFinished(false);
      setActiveEscalation(null);
      hasNavigatedToDialer.current = false;
      callDialedTimestamp.current = null;

      backgroundManager.startKeepAlive();

      const firstTarget = queue[validIndex];
      if (firstTarget && (settings.handsFreeAutoDial ?? true)) {
        startPrepCountdown(firstTarget.targetPhone);
      }
    } else {
      backgroundManager.stopKeepAlive();
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    }

    return () => {
      backgroundManager.stopKeepAlive();
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
    };
  }, [isOpen, initialIndex, queue, settings.handsFreeAutoDial]);

  // When paused, pause preparation timer
  useEffect(() => {
    if (!isOpen) return;

    if (isPaused && prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
      setPrepCountdown(null);
    } else if (!isPaused && !isDialed && !isFinished && handsFreeEnabled && currentManager) {
      startPrepCountdown(currentManager.targetPhone);
    }
  }, [isPaused, isOpen, isDialed, isFinished, handsFreeEnabled, currentManager]);

  // Call-Cut / Hang-Up Detection Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleCallReturn = () => {
      if (
        callCutDetectionEnabled &&
        hasNavigatedToDialer.current &&
        isDialed &&
        !isPaused &&
        !isFinished
      ) {
        hasNavigatedToDialer.current = false;
        const elapsedSec = Math.max(
          1,
          Math.round((Date.now() - (callDialedTimestamp.current || Date.now())) / 1000)
        );
        setCallDuration(elapsedSec);
        setCallCutDetected(true);

        if (settings.soundEffects) {
          playAudioFeedback('call_cut');
        }
        if (navigator.vibrate && settings.vibrate) {
          navigator.vibrate([150, 75, 150]);
        }
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        handleCallReturn();
      }
    };

    const handleWindowFocus = () => {
      handleCallReturn();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [
    isOpen,
    callCutDetectionEnabled,
    isDialed,
    isPaused,
    isFinished,
    settings.soundEffects,
    settings.vibrate,
  ]);

  // Handle background duration catchup
  useEffect(() => {
    if (!isOpen) return;

    const cleanup = backgroundManager.onVisibilityCatchup((elapsedSeconds) => {
      if (isDialed && !isPaused) {
        setCallDuration((prev) => prev + elapsedSeconds);
      }

      if (isPaused) {
        setPauseDuration((prev) => prev + elapsedSeconds);
      }
    });

    return cleanup;
  }, [isOpen, isDialed, isPaused]);

  // Pause duration timer
  useEffect(() => {
    if (!isOpen) return;

    if (isPaused) {
      pauseTimerRef.current = setInterval(() => {
        setPauseDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    }
    return () => {
      if (pauseTimerRef.current) clearInterval(pauseTimerRef.current);
    };
  }, [isOpen, isPaused]);

  // Call duration timer
  useEffect(() => {
    if (isOpen && isDialed && !isPaused) {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isDialed, isPaused]);

  // Countdown timer for next call auto-advance
  useEffect(() => {
    if (!isOpen) return;

    if (nextCallCountdown !== null && nextCallCountdown > 0 && !isPaused) {
      countdownRef.current = setTimeout(() => {
        setNextCallCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (nextCallCountdown === 0 && !isPaused) {
      setNextCallCountdown(null);
      proceedToNext();
    }
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [isOpen, nextCallCountdown, isPaused]);

  // Early return ONLY right before JSX rendering, after all hooks and functions
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Hidden anchor element to trigger tel: without popup blockers */}
      <a ref={hiddenDialAnchorRef} className="hidden" aria-hidden="true" />

      <div className="relative w-[96%] sm:w-full max-w-xl bg-slate-900 border-2 border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col my-auto max-h-[92dvh] sm:max-h-[94vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-4 sm:px-5 py-3 flex items-center justify-between border-b border-blue-500/30">
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  isPaused ? 'bg-amber-400' : 'bg-emerald-400'
                } opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isPaused ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              ></span>
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold bg-blue-900/80 text-blue-100 px-2.5 py-1 rounded-full border border-blue-400/40">
              {round === 1 ? 'Primary Round (शुरुआती राउंड)' : `Round ${round} (पेंडिंग री-डायल)`}
            </span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Header Pause Button */}
            {!isFinished && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-all shadow-md active:scale-95 ${
                  isPaused
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-300'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-300 animate-pulse'
                }`}
                title={isPaused ? 'कॉलिंग फिर से शुरू करें' : 'कॉलिंग पॉज़ करें'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            )}

            <span className="text-xs font-bold text-blue-100 bg-blue-950/80 px-2.5 py-1 rounded-xl border border-blue-600/40 font-mono">
              {currentIndex + 1} / {queue.length}
            </span>

            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl p-1.5 transition-colors"
              title="Close and save progress"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Line */}
        <div className="w-full bg-slate-800 h-1.5">
          <div
            className={`h-1.5 transition-all duration-300 ${
              isPaused ? 'bg-amber-400' : 'bg-emerald-500'
            }`}
            style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
          />
        </div>

        {/* Hands-Free & Multitask Status Bar */}
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
          <div className="flex items-center space-x-3">
            {/* Hands-Free Auto-Dial Toggle */}
            <button
              onClick={() => setHandsFreeEnabled(!handsFreeEnabled)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                handsFreeEnabled
                  ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="स्वतः डायल होना चालू/बंद करें"
            >
              <Zap className={`w-3.5 h-3.5 ${handsFreeEnabled ? 'text-emerald-400 fill-current' : 'text-slate-500'}`} />
              <span>ऑटो-डायल: {handsFreeEnabled ? 'चालू (ON)' : 'बंद (Manual)'}</span>
            </button>

            {/* Call-Cut Detection Badge */}
            <button
              onClick={() => setCallCutDetectionEnabled(!callCutDetectionEnabled)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                callCutDetectionEnabled
                  ? 'bg-blue-950/80 border-blue-400/50 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="कॉल समाप्त होने पर स्वतः पहचानना चालू/बंद करें"
            >
              <Activity className={`w-3.5 h-3.5 ${callCutDetectionEnabled ? 'text-blue-400 animate-pulse' : 'text-slate-500'}`} />
              <span>कॉल-कट डिटेक्शन: {callCutDetectionEnabled ? 'चालू' : 'बंद'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {!hasNotifPerm ? (
              <button
                onClick={handleRequestNotif}
                className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-200 rounded-lg text-[10px] font-bold flex items-center space-x-1"
              >
                <Bell className="w-3 h-3 text-blue-400" />
                <span>बैकग्राउंड अलर्ट</span>
              </button>
            ) : (
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3" />
                <span className="hidden xs:inline">बैकग्राउंड एक्टिव</span>
              </span>
            )}
          </div>
        </div>

        {/* Main Body */}
        {!isFinished && currentManager ? (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
            {/* Dedicated Paused State View */}
            {isPaused && (
              <div className="bg-gradient-to-br from-amber-950/90 via-slate-900 to-amber-950/70 border-2 border-amber-500 rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-2xl">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-500/60 text-amber-400 flex items-center justify-center shadow-lg">
                  <Pause className="w-8 h-8 fill-current" />
                </div>

                <div>
                  <h3 className="text-2xl font-black text-amber-200">
                    ⏸️ कॉलिंग पॉज़ है (Calling is Paused)
                  </h3>
                  <div className="text-xs text-amber-300/90 font-mono mt-1.5">
                    पॉज़ का समय (Break Time):{' '}
                    <strong className="text-white text-base bg-amber-900/50 px-2 py-0.5 rounded-lg border border-amber-600/40">
                      {formatTimer(pauseDuration)}
                    </strong>
                  </div>
                  <p className="text-xs text-slate-300 mt-2.5 max-w-md mx-auto leading-relaxed">
                    आप बेझिझक ब्रेक ले सकते हैं। आपका पूरा प्रोग्रेस सुरक्षित है। जब भी तैयार हों, नीचे दिए गए हरे बटन को दबाकर तुरंत यहीं से ऑटो-कॉलिंग शुरू करें।
                  </p>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 inline-block text-left shadow-inner">
                  <span className="text-slate-400">वर्तमान शाखा:</span> ब्रांच{' '}
                  <strong className="text-white">
                    {currentIndex + 1} of {queue.length}
                  </strong>{' '}
                  • <strong className="text-emerald-400">{currentManager.branch}</strong> (
                  {currentManager.targetName})
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsPaused(false)}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-2xl text-sm sm:text-base flex items-center justify-center space-x-2.5 shadow-xl shadow-emerald-950/60 transition-transform active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>▶️ कॉलिंग फिर से शुरू करें (RESUME CALLING)</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs transition-colors"
                  >
                    डैशबोर्ड पर जाएं (प्रगति सुरक्षित है)
                  </button>
                </div>
              </div>
            )}

            {/* Preparation Countdown Banner: Hands-Free Auto-Dialing */}
            {!isDialed && prepCountdown !== null && !isPaused && handsFreeEnabled && (
              <div className="bg-gradient-to-r from-emerald-900/90 via-blue-900/90 to-emerald-900/90 border-2 border-emerald-400 rounded-2xl p-3.5 shadow-xl animate-fade-in text-white space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-black text-sm text-emerald-200">
                      ⚡ स्वतः डायल हो रहा है ({prepCountdown}s)...
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsPaused(true)}
                      className="text-[11px] font-bold text-amber-300 bg-black/40 hover:bg-black/60 px-2.5 py-1 rounded-lg border border-amber-400/40 flex items-center space-x-1"
                    >
                      <Pause className="w-3 h-3 fill-current" />
                      <span>रोकें (Pause)</span>
                    </button>
                    <button
                      onClick={() => triggerPhoneCall(currentManager.targetPhone)}
                      className="text-[11px] font-black text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3 py-1 rounded-lg shadow flex items-center space-x-1"
                    >
                      <Phone className="w-3 h-3 fill-current" />
                      <span>अभी तुरंत डायल करें</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar for auto-dial preparation */}
                <div className="w-full bg-slate-950/70 h-2 rounded-full overflow-hidden border border-emerald-500/40">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-green-300 h-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${((settings.autoDialPrepSeconds ?? 2) - prepCountdown + 1) * 50}%`,
                    }}
                  />
                </div>

                <div className="text-[11px] text-emerald-100 flex items-center justify-between">
                  <span>
                    अधिकारी: <strong>{currentManager.targetName}</strong> ({currentManager.targetPosition})
                  </span>
                  <span className="font-mono font-bold text-xs bg-emerald-950 px-2 py-0.5 rounded border border-emerald-400/40">
                    +91 {currentManager.targetPhone}
                  </span>
                </div>
              </div>
            )}

            {/* Countdown Overlay Banner for Next Call (Between Calls) */}
            {nextCallCountdown !== null && !isPaused && (
              <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-5 h-5" />
                  <span className="font-bold text-sm">
                    अगला कॉल {nextCallCountdown} सेकंड में स्वतः शुरू होगा...
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsPaused(true)}
                    className="px-3 py-1 text-xs bg-black/40 hover:bg-black/60 rounded-xl font-bold flex items-center space-x-1"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>पॉज़ करें</span>
                  </button>
                  <button
                    onClick={proceedToNext}
                    className="px-3 py-1 text-xs bg-white text-slate-900 rounded-xl font-black hover:bg-slate-100 flex items-center space-x-1 shadow-sm"
                  >
                    <span>अभी शुरू करें</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* CALL-CUT DETECTED BANNER */}
            {callCutDetected && isDialed && !isPaused && (
              <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-2xl animate-fade-in text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-md flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <div className="font-black text-sm sm:text-base text-emerald-200 flex items-center space-x-1.5">
                      <span>📞 कॉल समाप्त हुआ (Call Ended)</span>
                    </div>
                    <div className="text-xs text-emerald-100 mt-0.5">
                      कॉल अवधि: <strong className="text-white font-mono">{formatTimer(callDuration)}</strong> • कृपया नीचे कॉल का परिणाम दर्ज करें
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Requirement: When "बात नहीं हुई" is clicked, show other staff of this branch to pick from */}
            {showingBranchStaffPicker ? (
              <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xl animate-fade-in text-white">
                {/* Alert Header */}
                <div className="bg-gradient-to-r from-amber-950/90 via-rose-950/80 to-amber-950/90 border border-amber-500/50 rounded-2xl p-3.5 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shrink-0">
                    ⚠️
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase font-extrabold tracking-wider text-amber-300">
                      पहला प्रयास: बात नहीं हुई (Call Unanswered)
                    </div>
                    <div className="text-sm sm:text-base font-black text-white mt-0.5 truncate">
                      {currentManager.targetName} ({currentManager.targetPosition})
                    </div>
                    <div className="text-xs text-amber-200/90 mt-1">
                      नीचे <strong>{currentManager.branchName}</strong> शाखा के अन्य स्टाफ की सूची है। किसी को भी चुनकर तुरंत कॉल करें:
                    </div>
                  </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-white flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>शाखा के अन्य उपलब्ध स्टाफ सदस्य ({availableBranchStaff.length}):</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    (SOL: {currentManager.solId})
                  </span>
                </div>

                {/* Staff List */}
                <div className="max-h-[46vh] overflow-y-auto space-y-2 pr-1 -mr-1">
                  {availableBranchStaff.map((staff: RegionalEmployee) => (
                    <div
                      key={staff.id || staff.ecNo}
                      className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/60 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all shadow-md"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-bold text-white text-sm">
                            {staff.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            EC: {staff.ecNo}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                            {staff.grade}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-emerald-300 flex items-center space-x-1">
                          <span>📌 {staff.position}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{staff.cadre}</span>
                        </div>

                        <div className="text-xs font-mono font-bold text-amber-300">
                          📞 +91 {staff.phone}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleSelectBackupStaff(staff)}
                          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/60 transition-transform active:scale-95"
                        >
                          <Phone className="w-3.5 h-3.5 fill-current" />
                          <span>कॉल करें (Call)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="text-[11px] text-slate-400 text-center sm:text-left">
                    ⚡ नोट: 2nd कॉल में भी बात नहीं होने पर सिस्टम <strong>स्वतः अगली शाखा पर स्विच</strong> करेगा।
                  </div>
                  <button
                    onClick={handleSkipToNextBranch}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors active:scale-95"
                  >
                    <SkipForward className="w-4 h-4 text-slate-400" />
                    <span>अगली शाखा पर जाएं (Skip to Next Branch)</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Current Officer / Branch Information Card */}
                <div
                  className={`bg-slate-800/95 border rounded-3xl p-4 sm:p-5 text-center relative shadow-inner transition-all ${
                    isPaused ? 'opacity-50 border-slate-700' : 'border-slate-700/80'
                  }`}
                >
                  <div className="inline-flex items-center justify-center px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-full text-xs font-semibold tracking-wide mb-2 flex-wrap gap-1">
                    <span>SOL ID: <strong className="ml-1 text-white">{currentManager.solId}</strong> • Branch Alpha: {currentManager.branchAlpha}</span>
                    {currentManager.areaCategory && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        currentManager.areaCategory === 'RURAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : currentManager.areaCategory === 'SEMI-URBAN'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}>
                        {currentManager.areaCategory === 'RURAL' ? '🌾 Rural' : currentManager.areaCategory === 'SEMI-URBAN' ? '🏘️ Semi-Urban' : '🏙️ Urban'}
                      </span>
                    )}
                  </div>

                  {activeEscalation ? (
                    <div className="space-y-1 my-1">
                      <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black animate-pulse">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>🔄 दूसरा प्रयास (2nd Attempt) — वैकल्पिक अधिकारी</span>
                      </div>
                      <div className="text-xs text-rose-300">
                        पहला कॉल ({currentManager.targetName}) अनुत्तरित रहा
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                        {activeEscalation.name}
                      </h2>
                      <div className="text-sm font-bold text-emerald-400">
                        📍 {currentManager.branchName} Branch
                      </div>
                      <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 rounded-full text-xs font-bold mt-1">
                        <span>📌 {activeEscalation.position}</span>
                        <span>• {activeEscalation.grade} ({activeEscalation.cadre})</span>
                      </div>
                      <div className="pt-1.5">
                        <button
                          onClick={() => setShowingBranchStaffPicker(true)}
                          className="text-xs text-blue-300 hover:text-white underline font-semibold inline-flex items-center space-x-1"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>शाखा का कोई अन्य स्टाफ चुनें ↺</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {currentManager.targetName}
                      </h2>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">
                        📍 {currentManager.branchName} Branch
                      </div>

                      {/* Target Position Badge */}
                      <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 rounded-full text-xs font-bold mt-2">
                        <span>📌 {currentManager.targetPosition}</span>
                        {currentManager.targetGrade && <span>• {currentManager.targetGrade}</span>}
                      </div>

                      {/* Fallback to Branch Head Notice */}
                      {currentManager.isFallbackToBM && (
                        <div className="mt-2.5 mx-auto max-w-md px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-200 rounded-xl text-xs font-bold">
                          ⚡ ऑटो फॉलबैक: इस शाखा में यह पद नहीं है, इसलिए शाखा प्रबंधक (BM) को कॉल किया जा रहा है
                        </div>
                      )}

                      {/* Alternative Staff Available Notice */}
                      {availableBranchStaff.length > 0 && (
                        <div className="mt-2.5">
                          <button
                            onClick={() => {
                              setInitialFailedOutcome('not_answered');
                              setShowingBranchStaffPicker(true);
                            }}
                            className="px-3.5 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-indigo-400" />
                            <span>शाखा के अन्य स्टाफ देखें ({availableBranchStaff.length})</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Phone Dial Section */}
                  <div className="mt-4 pt-4 border-t border-slate-700/80 flex flex-col items-center">
                    {currentManager.isOnLeave && (
                      <div className="mb-3 px-3 py-1 bg-amber-950/80 border border-amber-500/50 rounded-xl text-amber-300 text-xs font-bold">
                        🏖️ यह अधिकारी वर्तमान में छुट्टी पर हैं
                      </div>
                    )}

                    <div className="text-2xl sm:text-3xl font-mono font-black tracking-wider text-amber-300">
                      +91 {activeEscalation ? activeEscalation.phone : currentManager.targetPhone}
                    </div>

                    {isDialed && (
                      <div className="mt-2 inline-flex items-center space-x-2 px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>कॉल समय (Call Duration): {formatTimer(callDuration)}</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center space-x-3">
                      <button
                        onClick={() =>
                          triggerPhoneCall(
                            activeEscalation ? activeEscalation.phone : currentManager.targetPhone
                          )
                        }
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-950/50 flex items-center space-x-2 transition-transform active:scale-95"
                      >
                        <Phone className="w-5 h-5" />
                        <span>{isDialed ? 'फिर से डायल करें (Re-dial)' : 'अभी डायल करें (Dial Now)'}</span>
                      </button>

                      <button
                        onClick={openWhatsApp}
                        className="p-2.5 bg-emerald-800/40 hover:bg-emerald-700/60 border border-emerald-600/40 text-emerald-300 rounded-2xl transition-colors"
                        title="Send WhatsApp Follow-up message"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Prominent Pause / Break Button */}
                <div className="pt-0.5">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2.5 shadow-lg transition-all active:scale-95 ${
                      isPaused
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-slate-950 ring-4 ring-emerald-500/30'
                        : 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 ring-4 ring-amber-500/20'
                    }`}
                  >
                    {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                    <span>
                      {isPaused
                        ? '▶️ कॉलिंग फिर से शुरू करें (RESUME CALLING)'
                        : '⏸️ थोड़ी देर के लिए रोकें / ब्रेक लें (PAUSE CALLING)'}
                    </span>
                  </button>
                </div>

                {/* Calling Outcome Decision Area */}
                <div className="space-y-3 pt-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>कॉल परिणाम चुनें (Call Outcome)</span>
                    <span className="text-slate-400 text-[11px] font-normal">
                      (सही विकल्प पर क्लिक करें)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Baat Ho Gayi Button */}
                    <button
                      onClick={() => handleOutcome('connected')}
                      className="group relative p-4 bg-gradient-to-br from-emerald-900/80 via-emerald-800/90 to-emerald-900 border-2 border-emerald-400 hover:border-emerald-300 rounded-2xl text-left shadow-xl transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform">
                          <CheckCircle2 className="w-7 h-7 text-slate-950" />
                        </div>
                        <div>
                          <div className="text-lg font-black text-white leading-tight">
                            {activeEscalation ? '2nd कॉल: बात हो गई ✅' : 'बात हो गई ✅'}
                          </div>
                          <div className="text-xs text-emerald-200 mt-0.5 font-medium">
                            {activeEscalation ? 'वैकल्पिक अधिकारी से बात सफल' : 'कॉल कनेक्टेड व चर्चा पूर्ण'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-emerald-300 font-semibold">
                        → पूरा मार्क होगा और अगला कॉल स्वतः शुरू होगा
                      </div>
                    </button>

                    {/* 2. Baat Nahi Hui Button */}
                    <button
                      onClick={() => handleOutcome('not_answered')}
                      className="group relative p-4 bg-gradient-to-br from-rose-950/80 via-rose-900/90 to-rose-950 border-2 border-rose-500 hover:border-rose-400 rounded-2xl text-left shadow-xl transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-105 transition-transform">
                          <PhoneOff className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-lg font-black text-white leading-tight">
                            {activeEscalation ? '2nd कॉल: बात नहीं हुई ❌' : 'बात नहीं हुई ❌'}
                          </div>
                          <div className="text-xs text-rose-200 mt-0.5 font-medium">
                            {activeEscalation ? 'दूसरा प्रयास भी अनुत्तरित' : 'No Answer / Cut / Unreachable'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-rose-300 font-semibold">
                        {activeEscalation
                          ? '→ दूसरे प्रयास में भी बात नहीं हुई: स्वतः अगली शाखा पर स्विच होगा'
                          : availableBranchStaff.length > 0
                          ? `→ शाखा के अन्य उपलब्ध स्टाफ (${availableBranchStaff.length}) की सूची खुलेगी`
                          : '→ पेंडिंग लिस्ट में जाएगा और अगली शाखा पर बढ़ेंगे'}
                      </div>
                    </button>
                  </div>

                  {/* Secondary Options: Busy / Switched Off / Skip */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => handleOutcome('busy')}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-amber-500/50 hover:border-amber-400 text-amber-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>व्यस्त (Busy)</span>
                    </button>
                    <button
                      onClick={() => handleOutcome('switched_off')}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-orange-500/50 hover:border-orange-400 text-orange-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                      <span>बंद / Unreachable</span>
                    </button>
                    <button
                      onClick={() => handleOutcome('skipped')}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                      <span>छोड़ें (Skip)</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Quick Discussion Topic Tags & Notes */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs text-slate-400 font-medium">
                Quick Discussion Tag (वैकल्पिक):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks/Notes (उदा. टारगेट 50 लाख पर सहमति, शाम 4 बजे कॉल)..."
                className="w-full mt-2 px-3.5 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        ) : (
          /* Finished State / Round Summary View */
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">
                {round === 1 ? 'प्राथमिक कॉलिंग पूरी हुई!' : `री-डायल राउंड ${round} पूरा हुआ!`}
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                आपने इस राउंड के सभी {queue.length} अधिकारियों को कॉल कर लिया है।
              </p>
            </div>

            {pendingCount > 0 ? (
              <div className="bg-amber-950/40 border border-amber-600/40 rounded-3xl p-5 text-left space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-amber-200">
                      {pendingCount} शाखाएं पेंडिंग हैं (जिनसे बात नहीं हुई)
                    </h4>
                    <p className="text-xs text-amber-300/80">
                      अब आप इन पेंडिंग कॉल्स को भी इसी तरह स्वतः 1-बाय-1 री-डायल कर सकते हैं।
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  {onStartPendingRound && (
                    <button
                      onClick={() => {
                        onStartPendingRound();
                      }}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-2xl shadow-lg flex items-center justify-center space-x-2 transition-transform active:scale-95"
                    >
                      <RotateCcw className="w-5 h-5 text-slate-950" />
                      <span>पेंडिंग री-डायल राउंड शुरू करें ({pendingCount} कॉल्स)</span>
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-sm"
                  >
                    बाद में करेंगे (डैशबोर्ड देखें)
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-5 text-center space-y-2">
                <ShieldCheck className="w-9 h-9 text-emerald-400 mx-auto" />
                <h4 className="text-lg font-bold text-emerald-200">
                  शानदार! सभी अधिकारियों से बात पूरी हो चुकी है 🎉
                </h4>
                <p className="text-xs text-emerald-300/80">
                  आज का टारगेट 100% पूरा हो गया है। आप आज की रिपोर्ट कॉपी या डाउनलोड कर सकते हैं।
                </p>
                <div className="pt-2">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm shadow-md"
                  >
                    डैशबोर्ड और रिपोर्ट देखें
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
