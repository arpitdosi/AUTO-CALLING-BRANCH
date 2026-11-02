export interface StaffContact {
  id: string;
  name: string;
  designation: string; // e.g. 'Assistant Manager (ABM)', 'Cash Officer', 'Operational In-Charge', 'Second Officer'
  phone: string;
  priorityOrder: 1 | 2 | 3; // 1 = 1st Call, 2 = 2nd Call if BM unanswered/leave, 3 = 3rd Backup
  notes?: string;
}

export interface BranchManager {
  id: string;
  name: string;
  branch: string;
  solId: string;
  branchAlpha: string;
  sinceWhen: string;
  phone: string;
  altPhone?: string;
  region?: string;
  zone?: string;
  // Point 1: Leave / Out of office DND block
  leaveUntil?: string; // ISO YYYY-MM-DD: manager will not be dialed until this date
  leaveReason?: string; // e.g. 'Sick Leave', 'Training at RO', 'Annual Leave', 'Out of Station'
  // Point 3: Skip for today
  skipTodayDate?: string; // YYYY-MM-DD when this branch was excluded
  // Point 2: Staff Contacts Hierarchy
  backupContacts?: StaffContact[];
}

export type CallOutcome = 
  | 'pending_call'    // Not called yet in current session
  | 'connected'       // Baat ho gayi
  | 'not_answered'    // Baat nahi hui (No answer)
  | 'busy'            // Busy / Call cut
  | 'switched_off'    // Switched off / Unreachable
  | 'skipped'         // Skipped intentionally
  | 'on_leave';       // Officer on leave / DND

export interface CallLogEntry {
  id: string;
  managerId: string;
  managerName: string;
  branch: string;
  solId: string;
  phone: string;
  contactPersonRole?: string; // 'Primary BM' or name/designation of backup staff called
  timestamp: number;
  outcome: CallOutcome;
  round: number; // 1 = first attempt round, 2 = first pending re-dial, etc.
  notes?: string;
  callDurationSeconds?: number;
  tags?: string[];
}

export interface DailySession {
  date: string; // YYYY-MM-DD
  startedAt: number;
  lastUpdatedAt: number;
  activeRound: number; // 1 = primary, 2 = pending retry round 1, etc.
  callLogs: Record<string, CallLogEntry>; // managerId -> latest CallLogEntry
  callHistory: CallLogEntry[]; // complete event timeline
  skippedTodayIds?: string[]; // IDs of branches intentionally excluded for today
}

export interface DialingSettings {
  autoOpenDialer: boolean;
  autoNextDelaySeconds: number; // seconds to wait after marking "Baat Ho Gayi" before dialing next (0 = prompt, 3 = default)
  soundEffects: boolean;
  vibrate: boolean;
  whatsappTemplate: string;
  autoEscalateToBackup: boolean; // whether to suggest calling 2nd officer if BM is unanswered
  handsFreeAutoDial: boolean; // Automatically trigger phone dialer without manual click
  detectCallCut: boolean; // Automatically detect when user cuts the call and returns
  autoDialPrepSeconds: number; // Brief preparation countdown before launching phone call (default 2s)
}
