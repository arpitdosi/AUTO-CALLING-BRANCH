/**
 * Background multitask and keep-alive helper for Bank BM Call Manager.
 * Keeps browser timers and calling workflow responsive when user switches to WhatsApp/Instagram.
 */

class BackgroundManager {
  private audioCtx: AudioContext | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private wakeLockSentinel: any = null;
  private isKeepAliveRunning = false;
  private backgroundStartTime: number | null = null;
  private notificationPermission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  // Request browser notification permission for background call alerts
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      this.notificationPermission = perm;
      return perm === 'granted';
    } catch (e) {
      console.debug('Notification permission error', e);
      return false;
    }
  }

  public get hasNotificationPermission(): boolean {
    return this.notificationPermission === 'granted';
  }

  // Send native desktop/mobile notification when app is running in background
  public sendNotification(title: string, options?: NotificationOptions): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (this.notificationPermission !== 'granted') return;

    try {
      if (document.hidden) {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: false,
          silent: false,
          ...options,
        } as NotificationOptions);
      }
    } catch (e) {
      console.debug('Failed to send notification', e);
    }
  }

  // Request screen wake lock so screen does not turn off while user is calling
  public async requestWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLockSentinel) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
      }
    } catch (e) {
      console.debug('WakeLock not granted', e);
    }
  }

  public releaseWakeLock(): void {
    try {
      if (this.wakeLockSentinel) {
        this.wakeLockSentinel.release();
        this.wakeLockSentinel = null;
      }
    } catch (e) {
      // ignore
    }
  }

  // Starts silent web audio context keep-alive to prevent Android Chrome tab suspension
  public startKeepAlive(): void {
    if (this.isKeepAliveRunning) return;

    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      // Create an inaudible ultra-low oscillator (0.00001 gain) that keeps the audio pipeline running
      this.keepAliveOsc = this.audioCtx.createOscillator();
      this.keepAliveGain = this.audioCtx.createGain();

      this.keepAliveOsc.frequency.setValueAtTime(30, this.audioCtx.currentTime); // inaudible 30Hz
      this.keepAliveGain.gain.setValueAtTime(0.00001, this.audioCtx.currentTime); // virtually zero volume

      this.keepAliveOsc.connect(this.keepAliveGain);
      this.keepAliveGain.connect(this.audioCtx.destination);

      this.keepAliveOsc.start();
      this.isKeepAliveRunning = true;
      this.requestWakeLock();
    } catch (e) {
      console.debug('Background keep-alive audio start notice', e);
    }
  }

  // Stops the keep-alive pipeline
  public stopKeepAlive(): void {
    if (!this.isKeepAliveRunning) return;

    try {
      if (this.keepAliveOsc) {
        this.keepAliveOsc.stop();
        this.keepAliveOsc.disconnect();
        this.keepAliveOsc = null;
      }
      if (this.keepAliveGain) {
        this.keepAliveGain.disconnect();
        this.keepAliveGain = null;
      }
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    } catch (e) {
      console.debug('Error stopping keep-alive', e);
    } finally {
      this.isKeepAliveRunning = false;
      this.releaseWakeLock();
    }
  }

  // Setup visibility change listener with callback for elapsed background time
  public onVisibilityCatchup(onCatchup: (elapsedSeconds: number) => void): () => void {
    const handler = () => {
      if (document.hidden) {
        this.backgroundStartTime = Date.now();
      } else {
        if (this.backgroundStartTime) {
          const elapsed = Math.round((Date.now() - this.backgroundStartTime) / 1000);
          this.backgroundStartTime = null;
          if (elapsed > 0) {
            onCatchup(elapsed);
          }
        }
        // Re-acquire wake lock if returning to app
        if (this.isKeepAliveRunning) {
          this.requestWakeLock();
        }
      }
    };

    document.addEventListener('visibilitychange', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
    };
  }
}

export const backgroundManager = new BackgroundManager();
