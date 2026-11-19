import { BHAVNAGAR_REGIONAL_STAFF, RegionalEmployee } from '../data/bhavnagarStaff';
import { INITIAL_BRANCH_MANAGERS } from '../data/defaultManagers';
import { BranchManager, StaffLeaveEntry, CustomWorkRole, BranchRoleAssignment } from '../types';
import { isManagerOnLeave, isManagerSkippedToday, getTodayKey, isStaffOnLeave, getStaffLeaveKey } from './storage';

export const WORK_ROLE_PREFIX = 'WORK_ROLE:';

export interface CampaignCallingItem {
  id: string;
  branchId: string;
  branchName: string;
  branch: string;
  solId: string;
  branchAlpha: string;
  areaCategory?: 'RURAL' | 'SEMI-URBAN' | 'URBAN';
  targetName: string;
  name: string;
  targetPosition: string;
  targetPhone: string;
  phone: string;
  targetGrade?: string;
  isFallbackToBM: boolean;
  isCustomWorkMarked?: boolean;
  customWorkRoleLabel?: string;
  alternativeStaff: RegionalEmployee[];
  branchHeadName: string;
  branchHeadPhone: string;
  isOnLeave: boolean;
  isSkippedToday: boolean;
}

export const AREA_CATEGORY_OPTIONS = [
  { id: 'ALL', label: 'सभी शाखाएं', subLabel: 'All 59', icon: '🌐' },
  { id: 'RURAL', label: 'ग्रामीण', subLabel: 'Rural (31)', icon: '🌾' },
  { id: 'SEMI-URBAN', label: 'अर्ध-शहरी', subLabel: 'Semi-Urban (16)', icon: '🏘️' },
  { id: 'URBAN', label: 'शहरी', subLabel: 'Urban (12)', icon: '🏙️' },
] as const;

export const DESIGNATION_OPTIONS = [
  { id: 'ALL_BM', label: '🌟 शाखा प्रबंधक (Branch Head / BM)', category: 'BRANCH HEAD' },
  { id: 'BRANCH_OPERATIONS', label: '⚡ ऑपरेशंस हेड (Branch Operations / Second Officer)', category: 'BRANCH OPERATIONS' },
  { id: 'CREDIT', label: '💳 क्रेडिट / ऋण अधिकारी (Credit Officer)', category: 'CREDIT' },
  { id: 'CASHIER', label: '💰 मुख्य रोकड़िया (Senior CSA - Cash Head)', category: 'SENIOR CUSTOMER SERVICE ASSOCIATE(CASH)' },
  { id: 'CUSTOMER_SERVICE', label: '🤝 ग्राहक सेवा (Customer Service Associate)', category: 'CUSTOMER SERVICE ASSOCIATE' },
  { id: 'JOINT_MANAGER', label: '👔 संयुक्त प्रबंधक (Joint Manager)', category: 'JOINT MANAGER' },
  { id: 'LBO_RM', label: '📈 आरएम / संबंध प्रबंधक (LBO / Relationship Manager)', category: 'LBO_RELATIONSHIP_MANAGER' },
  { id: 'TRAINEE', label: '🎓 ट्रेनी अधिकारी (Trainee Officer)', category: 'TRAINEE' },
] as const;

export function normalizeBranchName(name: string): string {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/^(BHAVNAGAR|AMRELI|SIHOR),?\s*/i, '')
    .replace(/,\s*(BHAVNAGAR|AMRELI|SIHOR)/i, '')
    .replace(/BRANCH$/i, '')
    .replace(/MAIN$/i, 'MAIN')
    .replace(/[^A-Z0-9]/g, '');
}

export function getStaffForBranch(branchName: string, branchAlpha?: string): RegionalEmployee[] {
  let targetAlpha = (branchAlpha || '').trim().toUpperCase();

  // If no branchAlpha was directly passed, look it up from INITIAL_BRANCH_MANAGERS using branchName
  if (!targetAlpha && branchName) {
    const normTarget = normalizeBranchName(branchName);
    const foundMgr = INITIAL_BRANCH_MANAGERS.find(
      (m) => normalizeBranchName(m.branch) === normTarget || m.branch.toUpperCase() === branchName.trim().toUpperCase()
    );
    if (foundMgr && foundMgr.branchAlpha) {
      targetAlpha = foundMgr.branchAlpha.trim().toUpperCase();
    }
  }

  // PRIMARY CRITICAL MATCHING: Strict matching by branchAlpha so NO staff repeats across branches
  if (targetAlpha) {
    return BHAVNAGAR_REGIONAL_STAFF.filter((staff) => {
      // CRITICAL REQUIREMENT: RO staff must ALWAYS be blocked from the branch calling pipeline
      if (
        staff.isROStaff ||
        staff.category === 'RO' ||
        staff.solId === '6106' ||
        staff.branchAlpha.trim().toUpperCase() === 'ROBHAV'
      ) {
        return false;
      }
      return staff.branchAlpha.trim().toUpperCase() === targetAlpha;
    });
  }

  // Strict fallback: Exact normalized branch name only (no fuzzy substring inclusion)
  const normTarget = normalizeBranchName(branchName);
  if (!normTarget) return [];

  return BHAVNAGAR_REGIONAL_STAFF.filter((staff) => {
    if (
      staff.isROStaff ||
      staff.category === 'RO' ||
      staff.solId === '6106' ||
      staff.branchAlpha.trim().toUpperCase() === 'ROBHAV'
    ) {
      return false;
    }
    return normalizeBranchName(staff.branch) === normTarget;
  });
}

/**
 * Builds the designation-wise and area-wise calling list:
 * 1. Filters branches by Area Category (RURAL / SEMI-URBAN / URBAN / ALL).
 * 2. Matches staff with target designation in each branch using branchAlpha.
 * 3. If > 1 staff of that designation: picks 1 (randomly or first), keeps others as alternative.
 * 4. If NO staff with that designation: automatically falls back to Branch Head (Branch Manager).
 * 5. RO staff is ALWAYS excluded from the pipeline.
 */
export function buildDesignationCallingQueue(
  selectedDesignationId: string,
  branches: BranchManager[],
  areaCategoryFilter: 'ALL' | 'RURAL' | 'SEMI-URBAN' | 'URBAN' = 'ALL',
  staffLeaves: Record<string, StaffLeaveEntry> = {},
  customWorkRoles: CustomWorkRole[] = [],
  branchRoleAssignments: BranchRoleAssignment[] = [],
  onlyMarkedBranches = false
): CampaignCallingItem[] {
  const today = getTodayKey();
  const queue: CampaignCallingItem[] = [];

  const isCustomWorkMode = selectedDesignationId.startsWith(WORK_ROLE_PREFIX);
  const activeWorkRoleId = isCustomWorkMode ? selectedDesignationId.slice(WORK_ROLE_PREFIX.length) : '';
  const activeWorkRole = isCustomWorkMode
    ? customWorkRoles.find((r) => r.id === activeWorkRoleId)
    : undefined;

  const option = DESIGNATION_OPTIONS.find((d) => d.id === selectedDesignationId) || DESIGNATION_OPTIONS[0];

  // Filter branches by area category if not 'ALL'
  const filteredBranches = branches.filter((b) => {
    if (areaCategoryFilter === 'ALL') return true;
    return b.areaCategory === areaCategoryFilter;
  });

  filteredBranches.forEach((branch) => {
    const branchStaff = getStaffForBranch(branch.branch, branch.branchAlpha);
    const bmOnLeave =
      isManagerOnLeave(branch, today) ||
      isStaffOnLeave({ phone: branch.phone, id: branch.id }, staffLeaves, today);

    // Custom Work Role Mode (User-Marked Staff per Branch via Branch Alpha)
    if (isCustomWorkMode && activeWorkRoleId) {
      const targetAlpha = (branch.branchAlpha || '').trim().toUpperCase();
      const roleAssignments = branchRoleAssignments.filter(
        (a) => a.roleId === activeWorkRoleId && a.branchAlpha.trim().toUpperCase() === targetAlpha
      );

      // Convert assignments to RegionalEmployee objects (matching live staff data if available)
      const assignedStaffList: RegionalEmployee[] = roleAssignments.map((a) => {
        const matched = branchStaff.find(
          (s) =>
            getStaffLeaveKey(s) === a.staffKey ||
            (s.ecNo && a.ecNo && s.ecNo === a.ecNo) ||
            (s.phone && a.staffPhone && s.phone.replace(/[^0-9]/g, '') === a.staffPhone.replace(/[^0-9]/g, ''))
        );
        if (matched) return matched;
        return {
          id: a.staffKey,
          ecNo: a.ecNo || '',
          name: a.staffName,
          gender: '',
          cadre: 'Staff',
          grade: a.staffGrade || '',
          position: a.staffPosition || activeWorkRole?.shortLabel || 'Marked Staff',
          solId: branch.solId,
          branch: branch.branch,
          branchAlpha: branch.branchAlpha,
          category: branch.areaCategory || 'RURAL',
          isROStaff: false,
          sinceWhen: '',
          phone: a.staffPhone,
          email: '',
        };
      });

      const activeAssigned = assignedStaffList.filter((s) => !isStaffOnLeave(s, staffLeaves, today));
      const roleTitle = activeWorkRole ? `${activeWorkRole.icon} ${activeWorkRole.shortLabel}` : '🎯 मार्क कार्य';

      if (activeAssigned.length > 0) {
        const chosen = activeAssigned[0];
        const alternatives = activeAssigned.slice(1);
        queue.push({
          id: `work_${activeWorkRoleId}_${branch.id}_${chosen.ecNo || chosen.phone}`,
          branchId: branch.id,
          branchName: branch.branch,
          branch: branch.branch,
          solId: branch.solId,
          branchAlpha: branch.branchAlpha,
          areaCategory: branch.areaCategory,
          targetName: chosen.name,
          name: chosen.name,
          targetPosition: `${roleTitle} • ${chosen.position}`,
          targetPhone: chosen.phone,
          phone: chosen.phone,
          targetGrade: chosen.grade || 'Marked',
          isFallbackToBM: false,
          isCustomWorkMarked: true,
          customWorkRoleLabel: roleTitle,
          alternativeStaff: alternatives,
          branchHeadName: branch.name,
          branchHeadPhone: branch.phone,
          isOnLeave: false,
          isSkippedToday: isManagerSkippedToday(branch, today),
        });
        return;
      }

      if (assignedStaffList.length > 0) {
        // Marked staff exist for this branch, but all of them are currently on leave -> block dialing!
        const firstOnLeave = assignedStaffList[0];
        queue.push({
          id: `work_leave_${activeWorkRoleId}_${branch.id}`,
          branchId: branch.id,
          branchName: branch.branch,
          branch: branch.branch,
          solId: branch.solId,
          branchAlpha: branch.branchAlpha,
          areaCategory: branch.areaCategory,
          targetName: firstOnLeave.name,
          name: firstOnLeave.name,
          targetPosition: `${roleTitle} (छुट्टी पर - ब्लॉक)`,
          targetPhone: firstOnLeave.phone,
          phone: firstOnLeave.phone,
          targetGrade: firstOnLeave.grade || 'On Leave',
          isFallbackToBM: false,
          isCustomWorkMarked: true,
          customWorkRoleLabel: roleTitle,
          alternativeStaff: [],
          branchHeadName: branch.name,
          branchHeadPhone: branch.phone,
          isOnLeave: true,
          isSkippedToday: isManagerSkippedToday(branch, today),
        });
        return;
      }

      // No staff marked for this work role in this branch yet
      if (onlyMarkedBranches) {
        return;
      }

      // Fallback to Branch Head so user can call & ask who handles this work
      queue.push({
        id: `work_fallback_${activeWorkRoleId}_${branch.id}`,
        branchId: branch.id,
        branchName: branch.branch,
        branch: branch.branch,
        solId: branch.solId,
        branchAlpha: branch.branchAlpha,
        areaCategory: branch.areaCategory,
        targetName: branch.name,
        name: branch.name,
        targetPosition: `BRANCH HEAD (${activeWorkRole?.shortLabel || 'कार्य'} अभी मार्क नहीं)`,
        targetPhone: branch.phone,
        phone: branch.phone,
        targetGrade: 'BM (Unmarked)',
        isFallbackToBM: true,
        isCustomWorkMarked: false,
        customWorkRoleLabel: roleTitle,
        alternativeStaff: [],
        branchHeadName: branch.name,
        branchHeadPhone: branch.phone,
        isOnLeave: bmOnLeave,
        isSkippedToday: isManagerSkippedToday(branch, today),
      });
      return;
    }

    // If calling Branch Heads specifically
    if (option.id === 'ALL_BM') {
      queue.push({
        id: `bm_${branch.id}`,
        branchId: branch.id,
        branchName: branch.branch,
        branch: branch.branch,
        solId: branch.solId,
        branchAlpha: branch.branchAlpha,
        areaCategory: branch.areaCategory,
        targetName: branch.name,
        name: branch.name,
        targetPosition: 'BRANCH HEAD (शाखा प्रबंधक)',
        targetPhone: branch.phone,
        phone: branch.phone,
        targetGrade: 'BM',
        isFallbackToBM: false,
        alternativeStaff: [],
        branchHeadName: branch.name,
        branchHeadPhone: branch.phone,
        isOnLeave: bmOnLeave,
        isSkippedToday: isManagerSkippedToday(branch, today),
      });
      return;
    }

    // Filter staff for this designation (all RO staff already excluded)
    let matchingStaff: RegionalEmployee[] = [];
    if (option.id === 'CREDIT') {
      matchingStaff = branchStaff.filter(
        (s) =>
          s.position.includes('CREDIT') &&
          !s.position.includes('MONITORING') &&
          !s.position.includes('PROCESSING')
      );
    } else if (option.id === 'BRANCH_OPERATIONS') {
      matchingStaff = branchStaff.filter(
        (s) => s.position.includes('BRANCH OPERATIONS') || s.position.includes('OPERATIONS')
      );
    } else {
      matchingStaff = branchStaff.filter((s) => s.position === option.category);
    }

    // Exclude any staff currently on leave so they remain blocked from dialing
    const activeMatchingStaff = matchingStaff.filter((s) => !isStaffOnLeave(s, staffLeaves, today));

    if (activeMatchingStaff.length > 0) {
      // Pick one randomly or first
      const randomIndex = Math.floor(Math.random() * activeMatchingStaff.length);
      const chosen = activeMatchingStaff[randomIndex];
      const alternatives = activeMatchingStaff.filter((_, idx) => idx !== randomIndex);

      queue.push({
        id: `staff_${branch.id}_${chosen.ecNo}`,
        branchId: branch.id,
        branchName: branch.branch,
        branch: branch.branch,
        solId: branch.solId,
        branchAlpha: branch.branchAlpha,
        areaCategory: branch.areaCategory,
        targetName: chosen.name,
        name: chosen.name,
        targetPosition: chosen.position,
        targetPhone: chosen.phone,
        phone: chosen.phone,
        targetGrade: chosen.grade,
        isFallbackToBM: false,
        alternativeStaff: alternatives,
        branchHeadName: branch.name,
        branchHeadPhone: branch.phone,
        isOnLeave: false,
        isSkippedToday: isManagerSkippedToday(branch, today),
      });
    } else {
      // Fallback to Branch Head automatically!
      const fallbackReason =
        matchingStaff.length > 0
          ? `${option.label.split('(')[0].trim()} छुट्टी पर`
          : `No ${option.label.split('(')[0].trim()} posted`;

      queue.push({
        id: `fallback_${branch.id}`,
        branchId: branch.id,
        branchName: branch.branch,
        branch: branch.branch,
        solId: branch.solId,
        branchAlpha: branch.branchAlpha,
        areaCategory: branch.areaCategory,
        targetName: branch.name,
        name: branch.name,
        targetPosition: `BRANCH HEAD (Fallback - ${fallbackReason})`,
        targetPhone: branch.phone,
        phone: branch.phone,
        targetGrade: 'BM (Fallback)',
        isFallbackToBM: true,
        alternativeStaff: [],
        branchHeadName: branch.name,
        branchHeadPhone: branch.phone,
        isOnLeave: bmOnLeave,
        isSkippedToday: isManagerSkippedToday(branch, today),
      });
    }
  });

  return queue;
}
