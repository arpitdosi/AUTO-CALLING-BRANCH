import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { BHAVNAGAR_REGIONAL_STAFF, RegionalEmployee } from '../data/bhavnagarStaff';
import { BranchManager, StaffLeaveEntry } from '../types';
import { getStaffLeaveEntry, getStaffLeaveKey, getTodayKey, isStaffOnLeave } from '../utils/storage';
import {
  StaffWhatsAppModal,
  WHATSAPP_QUICK_TEMPLATES,
  buildWhatsAppLink,
} from './StaffWhatsAppModal';

interface DirectWhatsAppTabProps {
  managers: BranchManager[];
  staffLeaves: Record<string, StaffLeaveEntry>;
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
  density = 'normal',
  showToast,
}) => {
  const today = getTodayKey();

  // Message composer state
  const [messageBody, setMessageBody] = useState<string>(WHATSAPP_QUICK_TEMPLATES[0].text);
  const [includeGreeting, setIncludeGreeting] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranchAlpha, setSelectedBranchAlpha] = useState<string>('ALL');
  const [areaCategoryFilter, setAreaCategoryFilter] = useState<'ALL' | 'RURAL' | 'SEMI-URBAN' | 'URBAN'>('ALL');
  const [designationFilter, setDesignationFilter] = useState<string>('ALL');
  const [hideOnLeave, setHideOnLeave] = useState<boolean>(false);
  const [sentFilter, setSentFilter] = useState<'all' | 'sent' | 'unsent'>('all');

  // Tracking sent WhatsApp messages today
  const [sentMap, setSentMap] = useState<Record<string, number>>(() => loadTodaySentMap(today));

  // Modal for customizing message for a single staff member
  const [modalStaff, setModalStaff] = useState<RegionalEmployee | null>(null);

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

  const markStaffSent = (staff: RegionalEmployee) => {
    const key = getStaffLeaveKey(staff);
    const updated = { ...sentMap, [key]: Date.now() };
    setSentMap(updated);
    saveTodaySentMap(today, updated);
    showToast(`💬 ${staff.name} (${staff.branch}) के लिए WhatsApp खोला गया!`);
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
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-600/40 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 uppercase tracking-wider">
                Direct WhatsApp Hub
              </span>
              <span className="text-xs text-emerald-200">
                {allBranchStaff.length} शाखा स्टाफ • 🚫 RO स्टाफ बाहर
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-emerald-400" />
              <span>डायरेक्ट WhatsApp संदेश (Direct Staff WhatsApp)</span>
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-3xl">
              यहाँ एक बार संदेश लिखें या टेम्पलेट चुनें और नीचे किसी भी स्टाफ पर <strong>'💬 भेजें'</strong> दबाकर सीधे उनके WhatsApp पर मैसेज भेजें।
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

        {/* Common Message Composer Box */}
        <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>कॉमन संदेश टेम्पलेट (1 क्लिक में सभी के लिए तैयार):</span>
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

          {/* Template Chips */}
          <div className="flex flex-wrap gap-1.5">
            {WHATSAPP_QUICK_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setMessageBody(tpl.text)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                  messageBody === tpl.text
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500/50 hover:text-white'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <textarea
            rows={2}
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="यहाँ अपना WhatsApp संदेश लिखें जो किसी भी स्टाफ को 1 क्लिक में भेजा जा सके..."
            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-y"
          />
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
            const directWaHref = buildWhatsAppLink(staff, messageBody, includeGreeting);

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

                {/* Action Row: Edit Custom & Direct 1-Tap WhatsApp Send */}
                <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setModalStaff(staff)}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition-colors"
                    title="संदेश एडिट करके भेजें"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>एडिट</span>
                  </button>

                  <a
                    href={directWaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markStaffSent(staff)}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950/40 transition-transform active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>💬 WhatsApp भेजें</span>
                  </a>
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
        leaveEntry={modalStaff ? getStaffLeaveEntry(modalStaff, staffLeaves, today) : null}
        onMarkSent={markStaffSent}
      />
    </div>
  );
};
