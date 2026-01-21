// Import Capacitor for native bridge access
declare global {
  interface Window {
    PrinterBridge?: {
      playNotificationSound: () => Promise<void>;
    };
  }
}

export class NotificationSoundManager {
  private static instance: NotificationSoundManager;
  private currentInterval: NodeJS.Timeout | null = null;
  private isPlaying = false;
  private audio: HTMLAudioElement | null = null;

  static getInstance(): NotificationSoundManager {
    if (!NotificationSoundManager.instance) {
      NotificationSoundManager.instance = new NotificationSoundManager();
    }
    return NotificationSoundManager.instance;
  }

  private async playNotificationSound(): Promise<void> {
    console.log('🔔 Playing alert.mp3 notification sound...');
    
    try {
      // Try native Android bridge first (best quality)
      if (window.PrinterBridge && typeof window.PrinterBridge.playNotificationSound === 'function') {
        console.log('Using PrinterBridge for alert.mp3');
        await window.PrinterBridge.playNotificationSound();
        return;
      }
    } catch (error) {
      console.warn('PrinterBridge failed, using fallback:', error);
    }
    
    // Fallback to HTML5 Audio for web/testing
    this.playFallbackSound();
  }

  private playFallbackSound(): void {
    try {
      console.log('Using HTML5 Audio fallback for alert.mp3');
      
      if (!this.audio) {
        this.audio = new Audio('/alert.mp3');
        this.audio.volume = 1.0;
      }
      
      // Reset audio to beginning
      this.audio.currentTime = 0;
      
      this.audio.play().catch(e => {
        console.warn('Audio fallback failed:', e);
      });
      
    } catch (error) {
      console.warn('All audio methods failed:', error);
    }
  }


  startNotificationSound(): void {
    if (this.isPlaying) {
      console.log('Notification sound already playing');
      return; // Already playing
    }
    
    console.log('🔔 Starting urgent notification sound with alert.mp3...');
    this.isPlaying = true;
    
    // Play immediately
    this.playNotificationSound();
    
    // Repeat every 4.5 seconds
    this.currentInterval = setInterval(() => {
      if (this.isPlaying) {
        console.log('🔔 Repeating notification sound...');
        this.playNotificationSound();
      }
    }, 4500);

    console.log('Notification sound started - will repeat every 4.5 seconds');
  }


  stopNotificationSound(): void {
    if (!this.isPlaying) {
      return;
    }

    console.log('🔕 Stopping notification sound');
    this.isPlaying = false;
    
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }

    // Stop any ongoing audio
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }

    console.log('Notification sound stopped');
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }


  // Force start sound (for user interaction)
  forceStartSound(): void {
    console.log('🔔 Force starting notification sound with user interaction...');
    this.startNotificationSound();
  }

  // Clean up resources
  destroy(): void {
    this.stopNotificationSound();
    if (this.audio) {
      this.audio = null;
    }
  }
}



