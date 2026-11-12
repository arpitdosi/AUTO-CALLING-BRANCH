import { BHAVNAGAR_REGIONAL_STAFF, RegionalEmployee } from '../data/bhavnagarStaff';
import { INITIAL_BRANCH_MANAGERS } from '../data/defaultManagers';
import { BranchManager } from '../types';
import { isManagerOnLeave, isManagerSkippedToday, getTodayKey } from './storage';

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
  areaCategoryFilter: 'ALL' | 'RURAL' | 'SEMI-URBAN' | 'URBAN' = 'ALL'
): CampaignCallingItem[] {
  const today = getTodayKey();
  const queue: CampaignCallingItem[] = [];

  const option = DESIGNATION_OPTIONS.find((d) => d.id === selectedDesignationId) || DESIGNATION_OPTIONS[0];

  // Filter branches by area category if not 'ALL'
  const filteredBranches = branches.filter((b) => {
    if (areaCategoryFilter === 'ALL') return true;
    return b.areaCategory === areaCategoryFilter;
  });

  filteredBranches.forEach((branch) => {
    const branchStaff = getStaffForBranch(branch.branch, branch.branchAlpha);

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
        isOnLeave: isManagerOnLeave(branch, today),
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

    if (matchingStaff.length > 0) {
      // Pick one randomly or first
      const randomIndex = Math.floor(Math.random() * matchingStaff.length);
      const chosen = matchingStaff[randomIndex];
      const alternatives = matchingStaff.filter((_, idx) => idx !== randomIndex);

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
        isOnLeave: isManagerOnLeave(branch, today),
        isSkippedToday: isManagerSkippedToday(branch, today),
      });
    } else {
      // Fallback to Branch Head automatically!
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
        targetPosition: `BRANCH HEAD (Fallback - No ${option.label.split('(')[0].trim()} posted)`,
        targetPhone: branch.phone,
        phone: branch.phone,
        targetGrade: 'BM (Fallback)',
        isFallbackToBM: true,
        alternativeStaff: [],
        branchHeadName: branch.name,
        branchHeadPhone: branch.phone,
        isOnLeave: isManagerOnLeave(branch, today),
        isSkippedToday: isManagerSkippedToday(branch, today),
      });
    }
  });

  return queue;
}
