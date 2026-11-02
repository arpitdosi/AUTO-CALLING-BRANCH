import { BHAVNAGAR_REGIONAL_STAFF, RegionalEmployee } from '../data/bhavnagarStaff';
import { BranchManager } from '../types';
import { isManagerOnLeave, isManagerSkippedToday, getTodayKey } from './storage';

export interface CampaignCallingItem {
  id: string;
  branchId: string;
  branchName: string;
  branch: string;
  solId: string;
  branchAlpha: string;
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

export function getStaffForBranch(branchName: string): RegionalEmployee[] {
  const normTarget = normalizeBranchName(branchName);
  if (!normTarget) return [];

  return BHAVNAGAR_REGIONAL_STAFF.filter((staff) => {
    const normStaffBranch = normalizeBranchName(staff.branch);
    return (
      normStaffBranch === normTarget ||
      normStaffBranch.includes(normTarget) ||
      normTarget.includes(normStaffBranch)
    );
  });
}

/**
 * Builds the designation-wise calling list for all branches:
 * 1. Matches staff with target designation in each branch.
 * 2. If > 1 staff of that designation: picks 1 (randomly or first), keeps other as alternative.
 * 3. If NO staff with that designation: automatically falls back to Branch Head (Branch Manager).
 */
export function buildDesignationCallingQueue(
  selectedDesignationId: string,
  branches: BranchManager[]
): CampaignCallingItem[] {
  const today = getTodayKey();
  const queue: CampaignCallingItem[] = [];

  const option = DESIGNATION_OPTIONS.find((d) => d.id === selectedDesignationId) || DESIGNATION_OPTIONS[0];

  branches.forEach((branch) => {
    const branchStaff = getStaffForBranch(branch.branch);

    // If calling Branch Heads specifically
    if (option.id === 'ALL_BM') {
      queue.push({
        id: `bm_${branch.id}`,
        branchId: branch.id,
        branchName: branch.branch,
        branch: branch.branch,
        solId: branch.solId,
        branchAlpha: branch.branchAlpha,
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

    // Filter staff for this designation
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
