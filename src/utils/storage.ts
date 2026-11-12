import { BranchManager, CallLogEntry, CallOutcome, DailySession, DialingSettings } from '../types';
import { INITIAL_BRANCH_MANAGERS } from '../data/defaultManagers';

const MANAGERS_STORAGE_KEY = 'bank_bm_managers_v3';
const SESSION_PREFIX = 'bank_bm_daily_session_';
const SETTINGS_KEY = 'bank_bm_settings_v1';
export const DATA_VERSION_KEY = 'bob_data_version';
export const CURRENT_DATA_VERSION = 'v_02_11_2026';

export const DEFAULT_SETTINGS: DialingSettings = {
  autoOpenDialer: true,
  autoNextDelaySeconds: 3,
  soundEffects: true,
  vibrate: true,
  whatsappTemplate: 'Sir/Madam, following up from Regional Office regarding daily business figures and recovery targets. Please call back when available.',
  autoEscalateToBackup: true,
  handsFreeAutoDial: true,
  detectCallCut: true,
  autoDialPrepSeconds: 2,
};

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isManagerOnLeave(manager: BranchManager, today = getTodayKey()): boolean {
  if (!manager.leaveUntil) return false;
  return manager.leaveUntil >= today;
}

export function isManagerSkippedToday(manager: BranchManager, today = getTodayKey(), session?: DailySession): boolean {
  if (manager.skipTodayDate === today) return true;
  if (session?.skippedTodayIds?.includes(manager.id)) return true;
  return false;
}

export function calculateDateAfterDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function purgeAllOldData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith('bank_bm_') ||
          key.startsWith('bob_') ||
          key.includes('daily_session') ||
          key === 'bank_bm_managers_v1' ||
          key === 'bank_bm_managers_v2')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
    localStorage.setItem(MANAGERS_STORAGE_KEY, JSON.stringify(INITIAL_BRANCH_MANAGERS));
  } catch (err) {
    console.error('Failed purging old data', err);
  }
}

export function ensureDataUpdatedAndPurgeOld(): boolean {
  try {
    const existingVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (existingVersion !== CURRENT_DATA_VERSION) {
      purgeAllOldData();
      return true;
    }
  } catch (err) {
    console.error('Failed running data auto-purge', err);
  }
  return false;
}

export function loadManagers(): BranchManager[] {
  ensureDataUpdatedAndPurgeOld();
  try {
    const raw = localStorage.getItem(MANAGERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure areaCategory is present on all items
        const merged = parsed.map((m: BranchManager) => {
          const init = INITIAL_BRANCH_MANAGERS.find((im) => im.solId === m.solId || im.branchAlpha === m.branchAlpha);
          return {
            ...m,
            areaCategory: m.areaCategory || init?.areaCategory || 'RURAL',
          };
        });
        return merged;
      }
    }
  } catch (err) {
    console.warn('Failed reading managers from storage', err);
  }
  // Initialize with the 59 managers
  saveManagers(INITIAL_BRANCH_MANAGERS);
  return INITIAL_BRANCH_MANAGERS;
}

export function saveManagers(managers: BranchManager[]): void {
  try {
    localStorage.setItem(MANAGERS_STORAGE_KEY, JSON.stringify(managers));
  } catch (err) {
    console.error('Failed saving managers', err);
  }
}

export function loadTodaySession(dateKey = getTodayKey()): DailySession {
  try {
    const raw = localStorage.getItem(`${SESSION_PREFIX}${dateKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (err) {
    console.warn('Failed reading today session', err);
  }

  const newSession: DailySession = {
    date: dateKey,
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    activeRound: 1,
    callLogs: {},
    callHistory: [],
  };
  saveDailySession(newSession);
  return newSession;
}

export function saveDailySession(session: DailySession): void {
  try {
    session.lastUpdatedAt = Date.now();
    localStorage.setItem(`${SESSION_PREFIX}${session.date}`, JSON.stringify(session));
  } catch (err) {
    console.error('Failed saving daily session', err);
  }
}

export function loadSettings(): DialingSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed reading settings', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: DialingSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed saving settings', err);
  }
}

export function playAudioFeedback(type: 'dial' | 'success' | 'pending' | 'finish' | 'call_cut'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'dial') {
      // Short dual-tone beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'call_cut') {
      // Distinct pleasant double chime when call-cut is detected (660Hz -> 880Hz)
      [660, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.18);
        osc.start(ctx.currentTime + idx * 0.09);
        osc.stop(ctx.currentTime + idx * 0.09 + 0.18);
      });
    } else if (type === 'success') {
      // Cheerful chime: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    } else if (type === 'pending') {
      // Lower 2-tone note for pending/retry
      [440, 370].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.2);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.2);
      });
    } else if (type === 'finish') {
      // Celebration fanfare
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.4);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
      });
    }
  } catch (e) {
    console.debug('Audio feedback not permitted or supported yet', e);
  }
}
