import React from 'react';
import {
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Edit3,
  Trash2,
  Calendar,
  MapPin,
  Palmtree,
  Users,
  EyeOff,
  Eye,
  ShieldAlert,
  UserCheck,
  PhoneIncoming,
} from 'lucide-react';
import { BranchManager, CallLogEntry, CallOutcome } from '../types';
import { CampaignCallingItem } from '../utils/staffMatcher';

interface ManagerCardProps {
  manager: BranchManager;
  targetCallingItem?: CampaignCallingItem;
  selectedDesignation?: string;
  callLog?: CallLogEntry;
  onCallSingle: (manager: BranchManager, targetItem?: CampaignCallingItem) => void;
  onUpdateStatusQuick: (managerId: string, outcome: CallOutcome) => void;
  onCallbackReceived: (managerId: string) => void;
  onOpenEditStatus: (manager: BranchManager, targetItem?: CampaignCallingItem) => void;
  onEdit: (manager: BranchManager) => void;
  onDelete: (managerId: string) => void;
  onManageLeave: (manager: BranchManager) => void;
  onManageHierarchy: (manager: BranchManager) => void;
  onToggleSkipToday: (managerId: string) => void;
  isSkippedToday: boolean;
  isOnLeave: boolean;
  whatsappTemplate: string;
  density?: 'compact' | 'normal' | 'large';
}

export const ManagerCard: React.FC<ManagerCardProps> = ({
  manager,
  targetCallingItem,
  selectedDesignation = 'BRANCH_HEAD',
  callLog,
  onCallSingle,
  onUpdateStatusQuick,
  onCallbackReceived,
  onOpenEditStatus,
  onEdit,
  onDelete,
  onManageLeave,
  onManageHierarchy,
  onToggleSkipToday,
  isSkippedToday,
  isOnLeave,
  whatsappTemplate,
  density = 'normal',
}) => {
  const outcome = callLog?.outcome;

  // Determine active target info based on selected designation
  const isCustomDesignation = selectedDesignation !== 'BRANCH_HEAD' && !!targetCallingItem;
  const activeName = isCustomDesignation ? targetCallingItem.targetName : manager.name;
  const activePhone = isCustomDesignation ? targetCallingItem.targetPhone : manager.phone;
  const activeRole = isCustomDesignation
    ? targetCallingItem.targetPosition
    : 'BRANCH HEAD (शाखा प्रबंधक)';
  const isFallback = isCustomDesignation && targetCallingItem.isFallbackToBM;
  const altCount = isCustomDesignation ? targetCallingItem.alternativeStaff?.length || 0 : 0;
  const backupCount = manager.backupContacts?.length || 0;

  const getStatusBadge = () => {
    if (isOnLeave) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60 shadow-sm animate-pulse">
          <Palmtree className="w-3.5 h-3.5 text-amber-400" />
          <span>छुट्टी पर ({manager.leaveUntil})</span>
        </span>
      );
    }

    if (isSkippedToday) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-600">
          <EyeOff className="w-3 h-3 text-slate-400" />
          <span>आज छोड़ दिया (Skipped)</span>
        </span>
      );
    }

    if (!callLog || !outcome) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>कॉल बाकी (Not Called)</span>
        </span>
      );
    }

    if (outcome === 'connected') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>बात हो गई ✅</span>
        </span>
      );
    }

    if (outcome === 'not_answered') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-400 border border-rose-500/40">
          <XCircle className="w-3 h-3 text-rose-400" />
          <span>बात नहीं हुई ❌ (पेंडिंग)</span>
        </span>
      );
    }

    if (outcome === 'busy') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>व्यस्त (Busy)</span>
        </span>
      );
    }

    if (outcome === 'switched_off') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-950/80 text-orange-400 border border-orange-500/40">
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          <span>स्विच ऑफ / बंद</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        <span>छोड़ा गया (Skipped)</span>
      </span>
    );
  };

  const openWhatsApp = () => {
    const cleanNumber = activePhone.replace(/[^0-9]/g, '');
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    const text = encodeURIComponent(
      `Respected ${activeName} Ji (${manager.branch} Branch, Sol: ${manager.solId}, Position: ${activeRole}),\n\n${whatsappTemplate}`
    );
    window.open(`https://wa.me/${fullNumber}?text=${text}`, '_blank');
  };

  return (
    <div
      className={`relative bg-slate-800/90 rounded-2xl border transition-all duration-200 hover:shadow-xl flex flex-col justify-between h-full w-full overflow-hidden ${
        density === 'compact'
          ? 'p-3 text-xs'
          : density === 'large'
          ? 'p-4 sm:p-5 text-sm sm:text-base'
          : 'p-3.5 sm:p-4 text-xs sm:text-sm'
      } ${
        isOnLeave
          ? 'border-amber-500/40 bg-amber-950/10'
          : isSkippedToday
          ? 'border-slate-700 bg-slate-900/60 opacity-75'
          : outcome === 'connected'
          ? 'border-emerald-500/40 bg-emerald-950/10'
          : outcome === 'not_answered'
          ? 'border-rose-500/40 bg-rose-950/10'
          : isCustomDesignation
          ? 'border-indigo-500/40 hover:border-indigo-400'
          : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      {/* Top Section */}
      <div>
        {/* Top Sol ID, Area Category and Status */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center space-x-1 flex-wrap gap-y-1 min-w-0">
            <span className="px-1.5 sm:px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded text-[11px] sm:text-xs font-mono font-bold">
              SOL {manager.solId}
            </span>
            <span className="px-1.5 py-0.5 bg-slate-700/60 text-slate-300 rounded text-[10px] sm:text-[11px] font-mono">
              {manager.branchAlpha}
            </span>
            {manager.areaCategory && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                manager.areaCategory === 'RURAL'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : manager.areaCategory === 'SEMI-URBAN'
                  ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                  : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              }`}>
                {manager.areaCategory === 'RURAL' ? '🌾 Rural' : manager.areaCategory === 'SEMI-URBAN' ? '🏘️ Semi-Urban' : '🏙️ Urban'}
              </span>
            )}
            {altCount > 0 && (
              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold flex items-center space-x-1">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span>+{altCount}</span>
              </span>
            )}
          </div>
          <div className="shrink-0">{getStatusBadge()}</div>
        </div>

        {/* Main Info Header: Dynamically Displays Selected Designation Officer */}
        <div className="mt-1">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              {/* Prominent Target Officer Name */}
              <h4 className="text-sm sm:text-base font-black text-white leading-tight flex items-center space-x-1.5 truncate">
                <span className="truncate">{activeName}</span>
                {isCustomDesignation && !isFallback && (
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" />
                )}
              </h4>

              {/* Target Role Badge */}
              <div className="flex items-center flex-wrap gap-1 pt-0.5">
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold max-w-full truncate ${
                    isCustomDesignation
                      ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/40'
                      : 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
                  }`}
                >
                  <span className="truncate">📌 {activeRole}</span>
                  {isCustomDesignation && targetCallingItem?.targetGrade && (
                    <span className="text-indigo-300 shrink-0">• {targetCallingItem.targetGrade}</span>
                  )}
                </span>

                {isFallback && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center space-x-1 shrink-0">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span>BM (Fallback)</span>
                  </span>
                )}
              </div>

              {/* Branch Name */}
              <div className="flex items-center space-x-1 text-xs font-bold text-emerald-400 mt-1 truncate">
                <MapPin className="w-3 h-3 inline text-emerald-400 shrink-0" />
                <span className="truncate">{manager.branch} Branch</span>
                {isCustomDesignation && !isFallback && (
                  <span className="text-[10px] text-slate-400 font-normal shrink-0 truncate">
                    (BM: {manager.name})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400 shrink-0">
              <button
                onClick={() => onEdit(manager)}
                className="p-1 hover:text-blue-300 hover:bg-slate-700 rounded-lg transition-colors"
                title="Edit Manager Details"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(manager.id)}
                className="p-1 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                title="Delete Manager"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {manager.sinceWhen && (
            <div className="flex items-center space-x-1 text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
              <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">Since: {manager.sinceWhen}</span>
            </div>
          )}

          {isOnLeave && manager.leaveReason && (
            <div className="text-[10px] sm:text-[11px] text-amber-300 mt-1 italic truncate">
              कारण: {manager.leaveReason}
            </div>
          )}
        </div>

        {/* Phone Number Display for Active Target */}
        <div className="mt-2.5 py-1.5 sm:py-2 px-2.5 sm:px-3 bg-slate-900/90 rounded-xl flex items-center justify-between border border-slate-700/80 shadow-inner">
          <div className="min-w-0 pr-2">
            <span className="text-[9px] sm:text-[10px] text-slate-400 block font-semibold truncate">
              {isCustomDesignation ? `कॉल: ${activeRole}` : '1st Call (BM)'}
            </span>
            <div className="font-mono text-xs sm:text-sm font-black text-amber-300 tracking-wide truncate">
              +91 {activePhone}
            </div>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={() => onCallSingle(manager, targetCallingItem)}
              className="p-2 sm:p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md hover:shadow-emerald-900/50 transition-all active:scale-95"
              title={`Call ${activeName} (${activeRole})`}
            >
              <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={openWhatsApp}
              className="p-2 sm:p-2.5 bg-emerald-800/40 hover:bg-emerald-700/60 border border-emerald-600/40 text-emerald-300 rounded-xl transition-colors"
              title="Message on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Point 1, 2, 3 Action Bar - 3 Equal Grid Columns (Never overflows on mobile) */}
        <div className="mt-2 pt-2 border-t border-slate-700/60 grid grid-cols-3 gap-1 text-xs">
          {/* Leave button */}
          <button
            onClick={() => onManageLeave(manager)}
            className={`py-1 px-1 rounded-lg font-semibold flex items-center justify-center space-x-1 text-[10px] sm:text-[11px] transition-colors min-w-0 ${
              isOnLeave
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="छुट्टी / DND सेट करें"
          >
            <Palmtree className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{isOnLeave ? 'छुट्टी' : 'छुट्टी/DND'}</span>
          </button>

          {/* Staff hierarchy button */}
          <button
            onClick={() => onManageHierarchy(manager)}
            className={`py-1 px-1 rounded-lg font-semibold flex items-center justify-center space-x-1 text-[10px] sm:text-[11px] transition-colors min-w-0 ${
              backupCount > 0
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="शाखा स्टाफ एवं 2nd Call सेट करें"
          >
            <Users className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">स्टाफ ({backupCount})</span>
          </button>

          {/* Skip Today Toggle */}
          <button
            onClick={() => onToggleSkipToday(manager.id)}
            className={`py-1 px-1 rounded-lg font-semibold flex items-center justify-center space-x-1 text-[10px] sm:text-[11px] transition-colors min-w-0 ${
              isSkippedToday
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="आज कॉल न करें"
          >
            {isSkippedToday ? (
              <>
                <Eye className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">शामिल</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">छोड़ें</span>
              </>
            )}
          </button>
        </div>

        {/* Call Log Notes or Tags if existing */}
        {callLog && (callLog.notes || callLog.tags?.length || callLog.timestamp) && (
          <div className="mt-2 pt-1.5 border-t border-slate-700/60 text-[10px] sm:text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-mono">
                Round {callLog.round} •{' '}
                {new Date(callLog.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {callLog.tags?.[0] && (
                <span className="px-1.5 py-0.2 bg-blue-900/60 text-blue-200 border border-blue-500/30 rounded text-[9px] font-semibold truncate max-w-[120px]">
                  {callLog.tags[0]}
                </span>
              )}
            </div>
            {callLog.notes && (
              <div className="text-slate-300 italic bg-slate-900/50 p-1.5 rounded text-[10px] sm:text-[11px] line-clamp-2">
                "{callLog.notes}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Sticky Section: Uniform Height across all cards */}
      <div className="mt-2.5 pt-2 border-t border-slate-700/50 space-y-1.5">
        {/* Callback Received Action: Immediate 1-tap update */}
        {outcome && outcome !== 'connected' && (
          <button
            onClick={() => onCallbackReceived(manager.id)}
            className="w-full py-1.5 sm:py-2 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] sm:text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-950/40 transition-all active:scale-[0.98] border border-emerald-400/40 truncate"
            title="शाखा से वापस कॉल आया - तुरंत 'बात हो गई' के रूप में दर्ज करें"
          >
            <PhoneIncoming className="w-3.5 h-3.5 text-emerald-200 animate-pulse shrink-0" />
            <span className="truncate">वापस कॉल आया (बात हो गई ✅)</span>
          </button>
        )}

        {/* Quick Mark Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onUpdateStatusQuick(manager.id, 'connected')}
            className={`py-1.5 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1 transition-all min-w-0 ${
              outcome === 'connected'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-600/30 text-emerald-300'
            }`}
            title="बात हो गई (Mark Connected)"
          >
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">बात हो गई</span>
          </button>

          <button
            onClick={() => onUpdateStatusQuick(manager.id, 'not_answered')}
            className={`py-1.5 px-1.5 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center space-x-1 transition-all min-w-0 ${
              outcome === 'not_answered'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/30 text-rose-300'
            }`}
            title="बात नहीं हुई (Mark Not Answered / Pending)"
          >
            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">बात नहीं हुई</span>
          </button>
        </div>

        {/* Detailed Status & Notes Editor Button */}
        <button
          onClick={() => onOpenEditStatus(manager, targetCallingItem)}
          className="w-full py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 text-slate-300 hover:text-white text-[10px] sm:text-[11px] font-semibold flex items-center justify-center space-x-1 transition-colors min-w-0"
          title="कॉल स्थिति बदलें, नोट लिखें, या रीसेट करें"
        >
          <Edit3 className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="truncate">स्थिति / नोट बदलें (Edit Status)</span>
        </button>
      </div>
    </div>
  );
};

