import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Building2,
  Search,
  Phone,
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Filter,
  Sparkles,
  MessageSquare,
  ChevronRight,
  UserCheck,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { BranchManager, CallOutcome, DailySession, BranchAreaCategory } from '../types';
import { RegionalEmployee } from '../data/bhavnagarStaff';
import { getStaffForBranch } from '../utils/staffMatcher';
import { playAudioFeedback } from '../utils/storage';

interface RandomBranchDialerTabProps {
  managers: BranchManager[];
  session: DailySession;
  onRecordCall: (
    branchId: string,
    outcome: CallOutcome,
    notes: string,
    durationSeconds: number,
    tags: string[],
    contactedPerson?: string
  ) => void;
  density?: 'compact' | 'normal' | 'large';
  showToast: (msg: string) => void;
}

export const RandomBranchDialerTab: React.FC<RandomBranchDialerTabProps> = ({
  managers,
  session,
  onRecordCall,
  density = 'normal',
  showToast,
}) => {
  // Navigation: null = Alphabetical Branch List, object = Branch Staff View
  const [selectedBranch, setSelectedBranch] = useState<BranchManager | null>(null);

  // Search & Filters in Alphabetical Branch List
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('ALL');
  const [areaCategoryFilter, setAreaCategoryFilter] = useState<'ALL' | 'RURAL' | 'SEMI-URBAN' | 'URBAN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'pending' | 'uncalled'>('all');

  // Calling & Escalation State
  const [activeCallingStaff, setActiveCallingStaff] = useState<RegionalEmployee | null>(null);
  const [attemptNumber, setAttemptNumber] = useState<1 | 2>(1);
  const [firstAttemptStaff, setFirstAttemptStaff] = useState<RegionalEmployee | null>(null);
  const [firstAttemptOutcome, setFirstAttemptOutcome] = useState<CallOutcome | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isDialed, setIsDialed] = useState<boolean>(false);

  // Call timer interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeCallingStaff) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCallingStaff]);

  // Alphabetical branches (A-Z)
  const alphabeticalBranches = useMemo(() => {
    return [...managers].sort((a, b) => a.branch.localeCompare(b.branch));
  }, [managers]);

  // Available initial letters for quick-jump index
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    managers.forEach((m) => {
      const firstChar = m.branch.trim().charAt(0).toUpperCase();
      if (firstChar >= 'A' && firstChar <= 'Z') {
        letters.add(firstChar);
      }
    });
    return Array.from(letters).sort();
  }, [managers]);

  // Filtered branches list
  const filteredBranches = useMemo(() => {
    return alphabeticalBranches.filter((branch) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        branch.branch.toLowerCase().includes(q) ||
        branch.solId.includes(q) ||
        branch.name.toLowerCase().includes(q) ||
        branch.phone.includes(q) ||
        (branch.areaCategory && branch.areaCategory.toLowerCase().includes(q));

      if (!matchQuery) return false;

      // Letter filter
      if (selectedLetter !== 'ALL') {
        const firstChar = branch.branch.trim().charAt(0).toUpperCase();
        if (firstChar !== selectedLetter) return false;
      }

      // Area Category filter
      if (areaCategoryFilter !== 'ALL' && branch.areaCategory !== areaCategoryFilter) {
        return false;
      }

      // Status filter
      const outcome = session.callLogs[branch.id]?.outcome;
      if (statusFilter === 'connected' && outcome !== 'connected') return false;
      if (
        statusFilter === 'pending' &&
        outcome !== 'not_answered' &&
        outcome !== 'busy' &&
        outcome !== 'switched_off'
      )
        return false;
      if (statusFilter === 'uncalled' && outcome) return false;

      return true;
    });
  }, [alphabeticalBranches, searchQuery, selectedLetter, areaCategoryFilter, statusFilter, session.callLogs]);

  // Staff members for the currently selected branch
  const currentBranchStaff = useMemo(() => {
    if (!selectedBranch) return [];

    // Get non-RO staff for this branch strictly matched by branchAlpha
    const staffList = getStaffForBranch(selectedBranch.branch, selectedBranch.branchAlpha);

    // Check if the Branch Head from `selectedBranch` is already in staffList
    const hasBranchHead = staffList.some(
      (s) =>
        s.position?.toUpperCase().includes('BRANCH HEAD') ||
        s.name.toLowerCase() === selectedBranch.name.toLowerCase() ||
        s.phone === selectedBranch.phone
    );

    // If not present, synthesize a Branch Head entry at the top so BM is always reachable
    if (!hasBranchHead && selectedBranch.name && selectedBranch.phone) {
      const synthesizedBM: RegionalEmployee = {
        id: `bm_${selectedBranch.id}`,
        ecNo: 'BM',
        name: selectedBranch.name,
        gender: 'Male',
        cadre: 'Officer',
        grade: 'Branch Head',
        position: 'BRANCH HEAD (शाखा प्रबंधक)',
        solId: selectedBranch.solId,
        branch: selectedBranch.branch,
        branchAlpha: selectedBranch.branchAlpha || '',
        category: (selectedBranch.areaCategory as BranchAreaCategory) || 'RURAL',
        isROStaff: false,
        sinceWhen: '',
        phone: selectedBranch.phone,
        altPhone: selectedBranch.altPhone,
        email: '',
      };
      return [synthesizedBM, ...staffList];
    }

    // Sort to place Branch Head and Senior Officers at the top
    return [...staffList].sort((a, b) => {
      const isA_BM = a.position?.toUpperCase().includes('BRANCH HEAD') ? -1 : 1;
      const isB_BM = b.position?.toUpperCase().includes('BRANCH HEAD') ? -1 : 1;
      return isA_BM - isB_BM;
    });
  }, [selectedBranch]);

  // Quick stats
  const branchStats = useMemo(() => {
    let connected = 0;
    let pending = 0;
    let uncalled = 0;
    managers.forEach((m) => {
      const log = session.callLogs[m.id];
      if (!log) uncalled++;
      else if (log.outcome === 'connected') connected++;
      else pending++;
    });
    return { total: managers.length, connected, pending, uncalled };
  }, [managers, session.callLogs]);

  // Format call duration MM:SS
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Open dialer and initiate call
  const handleInitiateCall = (staff: RegionalEmployee, attempt: 1 | 2) => {
    setActiveCallingStaff(staff);
    setAttemptNumber(attempt);
    setIsDialed(true);

    // Trigger phone call via standard tel URI
    window.location.href = `tel:${staff.phone}`;
  };

  // Handle call outcome
  const handleRecordOutcome = (outcome: CallOutcome) => {
    if (!selectedBranch || !activeCallingStaff) return;

    const contactedDesc = `${activeCallingStaff.name} (${activeCallingStaff.position} - ${activeCallingStaff.grade || 'Staff'})`;

    if (outcome === 'connected') {
      // Success!
      playAudioFeedback('success');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });

      const noteText =
        attemptNumber === 2 && firstAttemptStaff
          ? `[2nd Attempt Connected] पहले ${firstAttemptStaff.name} से बात नहीं हुई थी, दूसरे प्रयास में ${activeCallingStaff.name} से बात संपन्न हुई।`
          : `रैंडम कॉल: ${activeCallingStaff.name} से बात संपन्न।`;

      onRecordCall(
        selectedBranch.id,
        'connected',
        noteText,
        callDuration || 60,
        ['रैंडम कॉल', 'बात हो गई', `प्रयास: ${attemptNumber}`],
        contactedDesc
      );

      showToast(`✓ ${selectedBranch.branch}: ${activeCallingStaff.name} से बात हो गई ✅`);

      // Reset calling state and return to Alphabetical Branch List
      setActiveCallingStaff(null);
      setFirstAttemptStaff(null);
      setFirstAttemptOutcome(null);
      setAttemptNumber(1);
      setSelectedBranch(null);
      return;
    }

    // Call did NOT connect (not_answered / busy / switched_off)
    playAudioFeedback('pending');

    if (attemptNumber === 1) {
      // 1st Attempt failed -> User can pick a 2nd person from this branch!
      setFirstAttemptStaff(activeCallingStaff);
      setFirstAttemptOutcome(outcome);
      setAttemptNumber(2);
      setActiveCallingStaff(null);

      const outcomeText =
        outcome === 'not_answered'
          ? 'बात नहीं हुई'
          : outcome === 'busy'
          ? 'व्यस्त'
          : 'स्विच ऑफ';

      showToast(`⚠️ ${activeCallingStaff.name} से ${outcomeText}। अब 2nd अधिकारी चुनें।`);
    } else {
      // 2nd Attempt ALSO failed!
      // Requirement: "or agar usme bhi baat naa ho to wapas branch list aa jaye"
      const noteText = `[2 प्रयास विफल] 1st: ${firstAttemptStaff?.name || 'अधिकारी'} (${firstAttemptOutcome || 'विफल'}), 2nd: ${activeCallingStaff.name} (${outcome})`;

      onRecordCall(
        selectedBranch.id,
        outcome,
        noteText,
        0,
        ['रैंडम कॉल', '2 प्रयास विफल'],
        contactedDesc
      );

      showToast(`⚠️ ${selectedBranch.branch}: दोनों प्रयासों में बात नहीं हुई। शाखा सूची पर वापस आ गए।`);

      // Automatically navigate back to Alphabetical Branch List!
      setActiveCallingStaff(null);
      setFirstAttemptStaff(null);
      setFirstAttemptOutcome(null);
      setAttemptNumber(1);
      setSelectedBranch(null);
    }
  };

  // Skip 2nd attempt and return to branch list
  const handleSkipSecondAttempt = () => {
    if (!selectedBranch || !firstAttemptStaff) {
      setSelectedBranch(null);
      return;
    }

    const contactedDesc = `${firstAttemptStaff.name} (${firstAttemptStaff.position})`;
    onRecordCall(
      selectedBranch.id,
      firstAttemptOutcome || 'not_answered',
      `[1st Attempt: बात नहीं हुई (${firstAttemptStaff.name})] - 2nd कॉल स्किप किया गया`,
      0,
      ['रैंडम कॉल', '1 प्रयास विफल'],
      contactedDesc
    );

    showToast(`✓ ${selectedBranch.branch} शाखा: स्थिति दर्ज की गई।`);
    setSelectedBranch(null);
    setFirstAttemptStaff(null);
    setFirstAttemptOutcome(null);
    setAttemptNumber(1);
  };

  // WhatsApp helper
  const openWhatsApp = (staff: RegionalEmployee, branchName: string) => {
    const cleanNumber = staff.phone.replace(/[^0-9]/g, '');
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const text = encodeURIComponent(
      `नमस्ते ${staff.name} जी (${staff.position}, ${branchName} शाखा),\n\nरीजनल ऑफिस (RO) भावनगर से कॉल किया जा रहा है। कृपया उपलब्ध होने पर तुरंत कॉल बैक करें। धन्यवाद।`
    );
    window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
  };

  // Density classes
  const isCompact = density === 'compact';
  const isLarge = density === 'large';

  // ----------------------------------------------------------------------------------
  // VIEW 1: BRANCH STAFF & CALLING VIEW (When a branch is selected)
  // ----------------------------------------------------------------------------------
  if (selectedBranch) {
    const branchLog = session.callLogs[selectedBranch.id];
    const isFirstAttemptFailed = attemptNumber === 2 && firstAttemptStaff !== null;

    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        {/* Top Breadcrumb & Branch Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={() => {
                if (isFirstAttemptFailed) {
                  handleSkipSecondAttempt();
                } else {
                  setSelectedBranch(null);
                  setFirstAttemptStaff(null);
                  setAttemptNumber(1);
                }
              }}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>← सभी शाखाएं (Back to Branch List)</span>
            </button>

            {/* Area Category and Staff Count */}
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {selectedBranch.areaCategory === 'RURAL'
                  ? '🌾 RURAL'
                  : selectedBranch.areaCategory === 'SEMI-URBAN'
                  ? '🏘️ SEMI-URBAN'
                  : '🏙️ URBAN'}
              </span>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                SOL: {selectedBranch.solId}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                👥 {currentBranchStaff.length} स्टाफ
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-blue-400 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {selectedBranch.branch} शाखा
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                शाखा प्रबंधक: <strong className="text-slate-200">{selectedBranch.name}</strong> • फोन: {selectedBranch.phone}
              </p>
            </div>

            {/* Today's Existing Status if any */}
            {branchLog && (
              <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                <span className="text-[11px] text-slate-400">आज की स्थिति:</span>
                {branchLog.outcome === 'connected' ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>बात हो गई ✅</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-rose-400 flex items-center space-x-1">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>पेंडिंग / बात नहीं हुई ❌</span>
                  </span>
                )}
                {branchLog.contactPersonRole && (
                  <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                    ({branchLog.contactPersonRole})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Alert Banner if 1st Attempt Failed */}
          {isFirstAttemptFailed && (
            <div className="bg-gradient-to-r from-amber-950/70 via-rose-950/50 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm sm:text-base font-black text-amber-200">
                      ⚠️ पहले अधिकारी से बात नहीं हुई — दूसरा व्यक्ति चुनें (2nd Attempt)
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400/40">
                      प्रयास 2 / 2
                    </span>
                  </div>
                  <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
                    पहले <strong>{firstAttemptStaff?.name}</strong> ({firstAttemptStaff?.position}) को कॉल किया गया था।
                    कृपया नीचे से इसी शाखा के किसी अन्य अधिकारी या कर्मचारी के <strong>'📞 दूसरा कॉल करें'</strong> बटन पर क्लिक करें।
                  </p>
                  <p className="text-[11px] text-rose-300 font-semibold mt-1">
                    ⚡ नोट: यदि दूसरे अधिकारी से भी बात नहीं हुई, तो सिस्टम स्वतः वापस शाखा सूची पर स्विच कर जाएगा।
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  onClick={handleSkipSecondAttempt}
                  className="text-xs font-bold text-slate-300 hover:text-white underline decoration-slate-500 flex items-center space-x-1"
                >
                  <span>बिना 2nd कॉल किए शाखा सूची पर जाएं →</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Staff Members List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span>
                {selectedBranch.branch} शाखा के स्टाफ सदस्य ({currentBranchStaff.length})
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              {isFirstAttemptFailed ? 'दूसरा व्यक्ति चुनें ↷' : 'कॉल करने के लिए व्यक्ति चुनें ↷'}
            </span>
          </div>

          {currentBranchStaff.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                इस शाखा के लिए अलग से स्टाफ सूची उपलब्ध नहीं है।
              </p>
              <p className="text-xs text-slate-500">
                आप शाखा प्रबंधक (BM) के नंबर ({selectedBranch.phone}) पर कॉल कर सकते हैं।
              </p>
              <button
                onClick={() =>
                  handleInitiateCall(
                    {
                      id: `bm_${selectedBranch.id}`,
                      ecNo: 'BM',
                      name: selectedBranch.name,
                      gender: 'Male',
                      cadre: 'Officer',
                      grade: 'Branch Head',
                      position: 'BRANCH HEAD',
                      solId: selectedBranch.solId,
                      branch: selectedBranch.branch,
                      branchAlpha: '',
                      category: (selectedBranch.areaCategory as BranchAreaCategory) || 'RURAL',
                      isROStaff: false,
                      sinceWhen: '',
                      phone: selectedBranch.phone,
                      email: '',
                    },
                    attemptNumber
                  )
                }
                className="mt-3 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs inline-flex items-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>शाखा प्रबंधक को कॉल करें ({selectedBranch.phone})</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentBranchStaff.map((staff) => {
                const isBranchHead =
                  staff.position?.toUpperCase().includes('BRANCH HEAD') ||
                  staff.name.toLowerCase() === selectedBranch.name.toLowerCase();
                const wasFirstAttempt =
                  firstAttemptStaff &&
                  (firstAttemptStaff.id === staff.id || firstAttemptStaff.phone === staff.phone);

                return (
                  <div
                    key={staff.id || staff.ecNo || staff.phone}
                    className={`rounded-2xl border p-3.5 sm:p-4 transition-all flex flex-col justify-between gap-3 ${
                      wasFirstAttempt
                        ? 'bg-rose-950/30 border-rose-600/50 opacity-80'
                        : isBranchHead
                        ? 'bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/50 border-blue-500/50 hover:border-blue-400'
                        : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      {/* Name & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-black text-white text-sm sm:text-base">
                              {staff.name}
                            </span>
                            {isBranchHead && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40">
                                🌟 शाखा प्रबंधक (Head)
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-blue-300 mt-0.5">
                            {staff.position}
                          </div>
                        </div>

                        {/* First Attempt Tag */}
                        {wasFirstAttempt && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                            ❌ 1st प्रयास (विफल)
                          </span>
                        )}
                      </div>

                      {/* Meta Information */}
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 flex-wrap gap-y-1">
                        {staff.ecNo && (
                          <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                            EC: {staff.ecNo}
                          </span>
                        )}
                        {staff.grade && (
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-semibold">
                            {staff.grade}
                          </span>
                        )}
                        {staff.cadre && <span>{staff.cadre}</span>}
                      </div>

                      <div className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-1 pt-0.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{staff.phone}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                      {/* WhatsApp Button */}
                      <button
                        onClick={() => openWhatsApp(staff, selectedBranch.branch)}
                        className="p-2 sm:px-2.5 sm:py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
                        title="WhatsApp संदेश भेजें"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      {/* Call Button */}
                      <button
                        onClick={() => handleInitiateCall(staff, isFirstAttemptFailed ? 2 : 1)}
                        className={`flex-1 py-2 sm:py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition-transform active:scale-95 shadow-md ${
                          isFirstAttemptFailed
                            ? wasFirstAttempt
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                              : 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-amber-950/40'
                            : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-950/40'
                        }`}
                      >
                        <Phone className="w-4 h-4 fill-current" />
                        <span>
                          {isFirstAttemptFailed
                            ? wasFirstAttempt
                              ? 'पुनः कॉल करें (Re-try)'
                              : '📞 दूसरा कॉल करें (2nd Attempt)'
                            : '📞 कॉल करें (Call Now)'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ACTIVE CALL MODAL OVERLAY */}
        {activeCallingStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="relative w-full max-w-lg bg-slate-900 border-2 border-emerald-500/70 rounded-3xl shadow-2xl overflow-hidden p-5 sm:p-7 text-white space-y-5">
              {/* Top Calling Badge */}
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase flex items-center space-x-1.5 ${
                    attemptNumber === 2
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>
                    {attemptNumber === 2
                      ? '🔄 दूसरा प्रयास (2nd Attempt Call)'
                      : '🟢 पहला प्रयास (1st Call Active)'}
                  </span>
                </span>

                <div className="flex items-center space-x-1 text-slate-400 font-mono text-sm bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{formatDuration(callDuration)}</span>
                </div>
              </div>

              {/* Contact Details */}
              <div className="text-center space-y-2 py-2">
                <div className="inline-block px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300">
                  {selectedBranch.branch} शाखा (SOL: {selectedBranch.solId})
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {activeCallingStaff.name}
                </h3>
                <div className="text-sm font-semibold text-blue-300">
                  {activeCallingStaff.position} • {activeCallingStaff.grade || 'Staff'}
                </div>
                <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 flex items-center justify-center space-x-2 pt-1">
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                  <a
                    href={`tel:${activeCallingStaff.phone}`}
                    className="hover:underline tracking-wider"
                  >
                    {activeCallingStaff.phone}
                  </a>
                </div>
              </div>

              {/* Redial button if needed */}
              <div className="flex justify-center">
                <a
                  href={`tel:${activeCallingStaff.phone}`}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>फोन डायलर दोबारा खोलें</span>
                </a>
              </div>

              {/* Requirement: Prompt user for outcome */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800">
                <div className="text-center text-xs font-bold text-slate-300">
                  कॉल का परिणाम दर्ज करें (Select Call Outcome):
                </div>

                {/* Primary Connected Button */}
                <button
                  onClick={() => handleRecordOutcome('connected')}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center space-x-2 text-base transition-transform active:scale-95"
                >
                  <CheckCircle2 className="w-6 h-6 fill-current" />
                  <span>बात हो गई ✅ (Call Connected)</span>
                </button>

                {/* Unconnected Options */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleRecordOutcome('not_answered')}
                    className="py-3 px-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-md shadow-rose-950/40"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>बात नहीं हुई ❌</span>
                  </button>

                  <button
                    onClick={() => handleRecordOutcome('busy')}
                    className="py-3 px-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-md shadow-amber-950/40"
                  >
                    <Clock className="w-4 h-4" />
                    <span>व्यस्त ⏳</span>
                  </button>

                  <button
                    onClick={() => handleRecordOutcome('switched_off')}
                    className="py-3 px-2 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 shadow-md shadow-purple-950/40"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>स्विच ऑफ 📵</span>
                  </button>
                </div>

                {attemptNumber === 2 && (
                  <p className="text-[11px] text-center text-rose-300 font-semibold pt-1">
                    ↳ दूसरे प्रयास में 'बात नहीं हुई' चुनने पर सिस्टम स्वतः वापस शाखा सूची पर आ जाएगा।
                  </p>
                )}
              </div>

              {/* Close without recording */}
              <div className="text-center pt-1">
                <button
                  onClick={() => setActiveCallingStaff(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  कॉल रद्द करें (Cancel)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------------------------
  // VIEW 2: ALPHABETICAL BRANCH DIRECTORY (Default View)
  // ----------------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Hero Banner for Random / Alphabetical Branch Calling */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 border border-blue-700/50 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                A to Z Directory
              </span>
              <span className="text-xs text-blue-200">
                59 शाखाएं • 460 रीजनल स्टाफ
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <Building2 className="w-6 h-6 text-blue-400" />
              <span>वर्णमाला शाखा डायरेक्टरी कॉलिंग (Alphabetical Branch Dial)</span>
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 leading-relaxed max-w-3xl">
              यहाँ सभी 59 शाखाएं A-से-Z वर्णमाला क्रम में सूचीबद्ध हैं। जिस शाखा को कॉल करना हो, उस पर क्लिक करें — उस शाखा के सभी उपलब्ध स्टाफ की सूची दिखेगी।
              पहला कॉल न लगने पर दूसरा अधिकारी चुन सकते हैं, और दूसरे में भी बात न होने पर स्वतः वापस शाखा सूची आ जाएगी।
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 px-3.5 text-center">
              <div className="text-lg font-black text-emerald-400">{branchStats.connected}</div>
              <div className="text-[10px] text-slate-400 font-semibold">बात हो गई ✅</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 px-3.5 text-center">
              <div className="text-lg font-black text-rose-400">{branchStats.pending}</div>
              <div className="text-[10px] text-slate-400 font-semibold">पेंडिंग ❌</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 px-3.5 text-center">
              <div className="text-lg font-black text-slate-300">{branchStats.uncalled}</div>
              <div className="text-[10px] text-slate-400 font-semibold">बाकी ⚪</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alphabet Fast-Jump Bar (A, B, C, D...) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
          <span>वर्णमाला त्वरित चयन (Alphabet Quick Jump):</span>
          <span>
            {selectedLetter === 'ALL' ? 'सभी वर्णमाला' : `अक्षर: '${selectedLetter}'`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedLetter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
              selectedLetter === 'ALL'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            ALL (सभी)
          </button>
          {availableLetters.map((letter) => (
            <button
              key={letter}
              onClick={() => setSelectedLetter(letter)}
              className={`w-8 h-8 rounded-xl text-xs font-black transition-all shrink-0 flex items-center justify-center ${
                selectedLetter === letter
                  ? 'bg-blue-600 text-white shadow-md scale-105'
                  : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Area Category Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="शाखा का नाम, SOL ID, प्रबंधक या फोन सर्च करें..."
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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

          {/* Area Category Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setAreaCategoryFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                areaCategoryFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              सभी (59)
            </button>
            <button
              onClick={() => setAreaCategoryFilter('RURAL')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                areaCategoryFilter === 'RURAL'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌾 ग्रामीण (31)
            </button>
            <button
              onClick={() => setAreaCategoryFilter('SEMI-URBAN')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                areaCategoryFilter === 'SEMI-URBAN'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏘️ अर्ध-शहरी (16)
            </button>
            <button
              onClick={() => setAreaCategoryFilter('URBAN')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                areaCategoryFilter === 'URBAN'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏙️ शहरी (12)
            </button>
          </div>
        </div>

        {/* Status Filter Sub-Row */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">स्थिति:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                statusFilter === 'all'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              सभी ({filteredBranches.length})
            </button>
            <button
              onClick={() => setStatusFilter('connected')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                statusFilter === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              बात हो गई ✅
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                statusFilter === 'pending'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              पेंडिंग ❌
            </button>
            <button
              onClick={() => setStatusFilter('uncalled')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                statusFilter === 'uncalled'
                  ? 'bg-slate-800 text-slate-200'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              बाकी ⚪
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            दिखाई गई शाखाएं: {filteredBranches.length}
          </span>
        </div>
      </div>

      {/* Alphabetical Branch Cards Grid */}
      {filteredBranches.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-300">
            कोई शाखा नहीं मिली (No branch matches your filter).
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedLetter('ALL');
              setAreaCategoryFilter('ALL');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
          >
            सभी फ़िल्टर साफ़ करें (Reset Filters)
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
          {filteredBranches.map((branch, index) => {
            const branchLog = session.callLogs[branch.id];
            const isConnected = branchLog?.outcome === 'connected';
            const isPending =
              branchLog &&
              (branchLog.outcome === 'not_answered' ||
                branchLog.outcome === 'busy' ||
                branchLog.outcome === 'switched_off');
            const branchStaff = getStaffForBranch(branch.branch, branch.branchAlpha);
            const staffCount = branchStaff.length || 1;

            return (
              <div
                key={branch.id}
                onClick={() => {
                  setSelectedBranch(branch);
                  setFirstAttemptStaff(null);
                  setFirstAttemptOutcome(null);
                  setAttemptNumber(1);
                }}
                className={`group rounded-2xl border transition-all cursor-pointer p-4 flex flex-col justify-between gap-3 shadow-md hover:shadow-xl hover:scale-[1.01] ${
                  isConnected
                    ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400'
                    : isPending
                    ? 'bg-slate-900/90 border-rose-500/40 hover:border-rose-400'
                    : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-blue-500/50'
                }`}
              >
                {/* Branch Header */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {/* Letter Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                        {branch.branch.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-base font-black text-white group-hover:text-blue-300 transition-colors truncate">
                          {branch.branch}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                          <span className="font-mono">SOL: {branch.solId}</span>
                          <span>•</span>
                          <span className="text-slate-300 font-semibold">
                            {branch.areaCategory === 'RURAL'
                              ? '🌾 Rural'
                              : branch.areaCategory === 'SEMI-URBAN'
                              ? '🏘️ Semi-Urban'
                              : '🏙️ Urban'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isConnected ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>बात हो गई</span>
                        </span>
                      ) : isPending ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1">
                          <XCircle className="w-3 h-3" />
                          <span>पेंडिंग</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          बाकी
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Branch Manager Preview */}
                  <div className="pt-1 text-xs text-slate-300 flex items-center justify-between">
                    <div className="truncate">
                      <span className="text-slate-400">BM:</span>{' '}
                      <strong className="text-slate-200">{branch.name}</strong>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold shrink-0">
                      {branch.phone}
                    </span>
                  </div>

                  {/* Contacted note if logged */}
                  {branchLog?.contactPersonRole && (
                    <div className="text-[11px] text-slate-400 truncate bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800/80">
                      👤 बात हुई: <span className="text-slate-200 font-medium">{branchLog.contactPersonRole}</span>
                    </div>
                  )}
                </div>

                {/* Footer Bar: Staff count & Click prompt */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-indigo-300 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{staffCount} स्टाफ उपलब्ध</span>
                  </span>

                  <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center space-x-1">
                    <span>स्टाफ देखें एवं कॉल करें</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
