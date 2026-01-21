export class NotificationSoundManager {
  private static instance: NotificationSoundManager;
  private audio: HTMLAudioElement | null = null;
  private currentInterval: NodeJS.Timeout | null = null;
  private isPlaying = false;

  static getInstance(): NotificationSoundManager {
    if (!NotificationSoundManager.instance) {
      NotificationSoundManager.instance = new NotificationSoundManager();
    }
    return NotificationSoundManager.instance;
  }

  private async playNotificationSound(): Promise<void> {
    try {
      console.log('🔔 Playing notification sound (alert.mp3)');
      
      // Try to use Android native notification with alert.mp3
      if ((window as any).PrinterBridge?.playNotificationSound) {
        console.log('✅ Using Android PrinterBridge for alert.mp3');
        await (window as any).PrinterBridge.playNotificationSound();
        return;
      }

      // Fallback to HTML5 Audio
      console.log('⚠️ PrinterBridge not available, using HTML5 Audio fallback');
      if (!this.audio) {
        this.audio = new Audio('/alert.mp3');
        this.audio.volume = 1.0;
      }
      
      this.audio.currentTime = 0;
      await this.audio.play();
      
    } catch (error) {
      console.error('❌ Could not play notification sound:', error);
    }
  }

  private playNotificationSequence(): void {
    // Play the alert.mp3 notification sound
    this.playNotificationSound();
  }

  startNotificationSound(): void {
    if (this.isPlaying) {
      return; // Already playing
    }

    this.isPlaying = true;
      // Play immediately
    this.playNotificationSequence();
    
    // Repeat every 2 seconds for more urgency
    this.currentInterval = setInterval(() => {
      if (this.isPlaying) {
        this.playNotificationSequence();
      }
    }, 2000);

    console.log('Notification sound started');
  }

  stopNotificationSound(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;
    
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }

    console.log('Notification sound stopped');
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  // Clean up resources
  destroy(): void {
    this.stopNotificationSound();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }
}



