import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Target,
  Plus,
  CheckCircle2,
  Search,
  Phone,
  Users,
  Sparkles,
  Trash2,
  Building2,
  UserCheck,
} from 'lucide-react';
import { RegionalEmployee } from '../data/bhavnagarStaff';
import { BranchRoleAssignment, CustomWorkRole, BranchAreaCategory } from '../types';
import { getStaffForBranch } from '../utils/staffMatcher';
import { getStaffLeaveKey } from '../utils/storage';

export interface MarkWorkTargetBranch {
  branchName: string;
  branchAlpha: string;
  solId: string;
  areaCategory?: 'RURAL' | 'SEMI-URBAN' | 'URBAN';
  branchHeadName?: string;
  branchHeadPhone?: string;
}

interface MarkWorkRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: MarkWorkTargetBranch | null;
  highlightStaff?: {
    ecNo?: string;
    name: string;
    phone: string;
    position?: string;
  } | null;
  initialRoleId?: string;
  workRoles: CustomWorkRole[];
  assignments: BranchRoleAssignment[];
  onToggleAssignment: (
    roleId: string,
    branch: MarkWorkTargetBranch,
    staff: RegionalEmployee
  ) => void;
  onAddCustomRole: (name: string) => CustomWorkRole | null;
  onDeleteCustomRole?: (roleId: string) => void;
}

export const MarkWorkRoleModal: React.FC<MarkWorkRoleModalProps> = ({
  isOpen,
  onClose,
  branch,
  highlightStaff,
  initialRoleId,
  workRoles,
  assignments,
  onToggleAssignment,
  onAddCustomRole,
  onDeleteCustomRole,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string>(
    initialRoleId || workRoles[0]?.id || 'account_opening'
  );
  const [staffSearch, setStaffSearch] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStaffSearch('');
      setShowAddRole(false);
      setNewRoleName('');
      if (initialRoleId && workRoles.some((r) => r.id === initialRoleId)) {
        setSelectedRoleId(initialRoleId);
      } else if (!workRoles.some((r) => r.id === selectedRoleId)) {
        setSelectedRoleId(workRoles[0]?.id || 'account_opening');
      }
    }
  }, [isOpen, initialRoleId, workRoles]);

  // All non-RO staff of this branch strictly matched by branchAlpha
  const branchStaffList = useMemo(() => {
    if (!branch) return [];
    const list = getStaffForBranch(branch.branchName, branch.branchAlpha);

    // Ensure Branch Head is always present in list even if missing in CSV/PDF
    const hasBM =
      !branch.branchHeadPhone ||
      list.some(
        (s) =>
          s.position?.toUpperCase().includes('BRANCH HEAD') ||
          (s.phone &&
            branch.branchHeadPhone &&
            s.phone.replace(/[^0-9]/g, '') === branch.branchHeadPhone.replace(/[^0-9]/g, ''))
      );

    let fullList = [...list];
    if (!hasBM && branch.branchHeadName && branch.branchHeadPhone) {
      const bmEntry: RegionalEmployee = {
        id: `bm_${branch.branchAlpha}`,
        ecNo: 'BM',
        name: branch.branchHeadName,
        gender: '',
        cadre: 'Officer',
        grade: 'Branch Head',
        position: 'BRANCH HEAD (शाखा प्रबंधक)',
        solId: branch.solId,
        branch: branch.branchName,
        branchAlpha: branch.branchAlpha,
        category: (branch.areaCategory as BranchAreaCategory) || 'RURAL',
        isROStaff: false,
        sinceWhen: '',
        phone: branch.branchHeadPhone,
        email: '',
      };
      fullList = [bmEntry, ...fullList];
    }

    const highlightPhone = (highlightStaff?.phone || '').replace(/[^0-9]/g, '');
    const highlightEc = (highlightStaff?.ecNo || '').trim();
    const highlightName = (highlightStaff?.name || '').trim().toLowerCase();

    const isHighlighted = (s: RegionalEmployee) => {
      if (!highlightStaff) return false;
      if (highlightEc && highlightEc.toUpperCase() !== 'BM' && s.ecNo === highlightEc) return true;
      const sp = (s.phone || '').replace(/[^0-9]/g, '');
      if (highlightPhone && sp && sp === highlightPhone) return true;
      if (highlightName && s.name.trim().toLowerCase() === highlightName) return true;
      return false;
    };

    return fullList.sort((a, b) => {
      const aH = isHighlighted(a) ? -1 : 0;
      const bH = isHighlighted(b) ? -1 : 0;
      if (aH !== bH) return aH - bH;
      const aBM = a.position?.toUpperCase().includes('BRANCH HEAD') ? -1 : 0;
      const bBM = b.position?.toUpperCase().includes('BRANCH HEAD') ? -1 : 0;
      if (aBM !== bBM) return aBM - bBM;
      return a.name.localeCompare(b.name);
    });
  }, [branch, highlightStaff]);

  // Filter staff by search query
  const filteredStaff = useMemo(() => {
    const q = staffSearch.toLowerCase().trim();
    if (!q) return branchStaffList;
    return branchStaffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.position.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.ecNo.toLowerCase().includes(q)
    );
  }, [branchStaffList, staffSearch]);

  if (!isOpen || !branch) return null;

  const targetAlpha = (branch.branchAlpha || '').trim().toUpperCase();
  const branchAssignments = assignments.filter(
    (a) => a.branchAlpha.trim().toUpperCase() === targetAlpha
  );
  const selectedRoleAssignments = branchAssignments.filter((a) => a.roleId === selectedRoleId);
  const activeRole = workRoles.find((r) => r.id === selectedRoleId);

  const isStaffMarkedForRole = (staff: RegionalEmployee, roleId: string): boolean => {
    const key = getStaffLeaveKey(staff);
    const phoneDigits = (staff.phone || '').replace(/[^0-9]/g, '');
    return branchAssignments.some((a) => {
      if (a.roleId !== roleId) return false;
      if (a.staffKey === key) return true;
      if (staff.ecNo && staff.ecNo !== 'BM' && a.ecNo === staff.ecNo) return true;
      const aPhone = (a.staffPhone || '').replace(/[^0-9]/g, '');
      if (phoneDigits && aPhone && aPhone === phoneDigits) return true;
      return false;
    });
  };

  const getStaffRoles = (staff: RegionalEmployee): CustomWorkRole[] => {
    const key = getStaffLeaveKey(staff);
    const phoneDigits = (staff.phone || '').replace(/[^0-9]/g, '');
    const roleIds = new Set(
      branchAssignments
        .filter((a) => {
          if (a.staffKey === key) return true;
          if (staff.ecNo && staff.ecNo !== 'BM' && a.ecNo === staff.ecNo) return true;
          const aPhone = (a.staffPhone || '').replace(/[^0-9]/g, '');
          if (phoneDigits && aPhone && aPhone === phoneDigits) return true;
          return false;
        })
        .map((a) => a.roleId)
    );
    return workRoles.filter((r) => roleIds.has(r.id));
  };

  const isHighlightedStaff = (staff: RegionalEmployee): boolean => {
    if (!highlightStaff) return false;
    const hEc = (highlightStaff.ecNo || '').trim();
    const hPhone = (highlightStaff.phone || '').replace(/[^0-9]/g, '');
    if (hEc && hEc.toUpperCase() !== 'BM' && staff.ecNo === hEc) return true;
    const sp = (staff.phone || '').replace(/[^0-9]/g, '');
    if (hPhone && sp && sp === hPhone) return true;
    return staff.name.trim().toLowerCase() === (highlightStaff.name || '').trim().toLowerCase();
  };

  const handleCreateRole = () => {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    const created = onAddCustomRole(trimmed);
    if (created) {
      setSelectedRoleId(created.id);
      setNewRoleName('');
      setShowAddRole(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-fuchsia-500/60 rounded-3xl shadow-2xl overflow-hidden text-white my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-800 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-black/25 rounded-xl shrink-0">
              <Target className="w-5 h-5 text-fuchsia-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-white truncate">
                🎯 कार्य के अनुसार स्टाफ मार्क करें (Branch Work Target)
              </h3>
              <p className="text-[11px] text-fuchsia-100 flex items-center space-x-1.5 truncate">
                <Building2 className="w-3 h-3 shrink-0" />
                <span>
                  {branch.branchName} शाखा (SOL: {branch.solId} • Alpha: {branch.branchAlpha})
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Step 1: Select or Create Work Role */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-fuchsia-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>चरण 1: कौन सा कार्य (Work Category) चुनें:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAddRole(!showAddRole)}
                className="px-2.5 py-1 bg-fuchsia-600/30 hover:bg-fuchsia-600/50 text-fuchsia-200 border border-fuchsia-400/50 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>नया कार्य जोड़ें</span>
              </button>
            </div>

            {/* Inline Add Custom Role Input */}
            {showAddRole && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-900 border border-fuchsia-500/40 rounded-xl">
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateRole();
                  }}
                  placeholder="नया कार्य लिखें (उदा. Gold Loan, Locker, PMJJBY, Agriculture)..."
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateRole}
                  className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-lg text-xs shrink-0"
                >
                  जोड़ें ✓
                </button>
              </div>
            )}

            {/* Work Role Chips */}
            <div className="flex flex-wrap gap-1.5">
              {workRoles.map((role) => {
                const countInBranch = branchAssignments.filter((a) => a.roleId === role.id).length;
                const isSelected = selectedRoleId === role.id;
                return (
                  <div key={role.id} className="inline-flex items-center">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-fuchsia-600 text-white border-fuchsia-300 shadow-md ring-2 ring-fuchsia-400/30'
                          : countInBranch > 0
                          ? 'bg-emerald-950/60 text-emerald-200 border-emerald-500/40 hover:border-emerald-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <span>{role.icon}</span>
                      <span>{role.shortLabel}</span>
                      {countInBranch > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                            isSelected
                              ? 'bg-white/25 text-white'
                              : 'bg-emerald-500/30 text-emerald-200'
                          }`}
                        >
                          ✓ {countInBranch}
                        </span>
                      )}
                    </button>
                    {!role.isDefault && onDeleteCustomRole && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomRole(role.id)}
                        className="ml-0.5 p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="इस कस्टम कार्य को हटाएं"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Staff in This Branch */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs font-black text-white flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>
                  चरण 2: {branch.branchName} में{' '}
                  <span className="text-fuchsia-300">
                    "{activeRole?.icon} {activeRole?.shortLabel}"
                  </span>{' '}
                  कौन संभालता है?
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                1 क्लिक में मार्क / अनमार्क करें
              </span>
            </div>

            {/* Quick search inside branch staff if > 5 staff */}
            {branchStaffList.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="शाखा के स्टाफ का नाम, पद या नंबर खोजें..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            )}

            {/* Staff List */}
            <div className="space-y-2">
              {filteredStaff.map((staff) => {
                const marked = isStaffMarkedForRole(staff, selectedRoleId);
                const highlighted = isHighlightedStaff(staff);
                const staffRoles = getStaffRoles(staff);

                return (
                  <div
                    key={staff.id || staff.ecNo || staff.phone}
                    onClick={() => onToggleAssignment(selectedRoleId, branch, staff)}
                    className={`rounded-2xl border p-3 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      marked
                        ? 'bg-emerald-950/50 border-emerald-400/70 shadow-md shadow-emerald-950/30'
                        : highlighted
                        ? 'bg-indigo-950/50 border-indigo-400/60 hover:border-fuchsia-400'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="font-black text-sm text-white">{staff.name}</span>
                        {highlighted && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/50">
                            📞 वर्तमान कॉल / चयनित
                          </span>
                        )}
                        {staff.position?.toUpperCase().includes('BRANCH HEAD') && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                            BM
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-blue-300 font-semibold flex items-center flex-wrap gap-x-2">
                        <span>{staff.position}</span>
                        {staff.ecNo && <span className="text-slate-400 font-mono">EC: {staff.ecNo}</span>}
                        <span className="text-emerald-400 font-mono flex items-center space-x-0.5">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{staff.phone}</span>
                        </span>
                      </div>

                      {staffRoles.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {staffRoles.map((r) => (
                            <span
                              key={r.id}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/40"
                            >
                              {r.icon} {r.shortLabel}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAssignment(selectedRoleId, branch, staff);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 flex items-center space-x-1.5 transition-all ${
                        marked
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 hover:bg-fuchsia-600 text-slate-200 hover:text-white border border-slate-700'
                      }`}
                    >
                      {marked ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>मार्क है ✓</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>मार्क करें</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-300">
            {selectedRoleAssignments.length > 0 ? (
              <span className="text-emerald-300 font-bold">
                ✅ {activeRole?.shortLabel}:{' '}
                {selectedRoleAssignments.map((a) => a.staffName).join(', ')}
              </span>
            ) : (
              <span className="text-slate-400">
                इस शाखा में "{activeRole?.shortLabel}" के लिए अभी कोई स्टाफ मार्क नहीं है।
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs sm:text-sm shadow-lg"
          >
            ✓ सेव एवं बंद करें (Done)
          </button>
        </div>
      </div>
    </div>
  );
};
