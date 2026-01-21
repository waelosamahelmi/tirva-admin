// PWA Service for managing service worker and notifications
export class PWAService {
  private static instance: PWAService;
  private swRegistration: ServiceWorkerRegistration | null = null;

  static getInstance(): PWAService {
    if (!PWAService.instance) {
      PWAService.instance = new PWAService();
    }
    return PWAService.instance;
  }

  async init(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        
        // Enable push notifications
        await this.requestNotificationPermission();
        
        // Handle app updates
        this.swRegistration.addEventListener('updatefound', () => {
          const newWorker = this.swRegistration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New update available
                this.showUpdatePrompt();
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else {
      console.log('Notification permission denied');
      return false;
    }
  }

  async showNotification(title: string, options: NotificationOptions): Promise<void> {
    if (this.swRegistration && Notification.permission === 'granted') {
      // Enhanced notification options for loud, persistent notifications
      const enhancedOptions: NotificationOptions = {
        ...options,
        requireInteraction: true,
        tag: 'order-notification-' + Date.now(),
        badge: '/generated-icon.png',
        icon: '/generated-icon.png',
        data: {
          timestamp: Date.now(),
          ...options.data
        }
      };

      await this.swRegistration.showNotification(title, enhancedOptions);
      
      // Also play sound for immediate attention
      this.playNotificationSound();
    }
  }

  private playNotificationSound(): void {
    // Create multiple audio instances for loud notification
    const frequencies = [800, 1000, 1200];
    frequencies.forEach((freq, index) => {
      setTimeout(() => {
        this.playBeep(freq, 200);
      }, index * 300);
    });
  }

  private playBeep(frequency: number, duration: number): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  private showUpdatePrompt(): void {
    if (confirm('A new version of the app is available. Would you like to update?')) {
      window.location.reload();
    }
  }

  async installApp(): Promise<void> {
    // For PWA installation prompt
    const event = (window as any).deferredPrompt;
    if (event) {
      event.prompt();
      const { outcome } = await event.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      (window as any).deferredPrompt = null;
    }
  }

  // Persistent login management
  saveAuthToken(token: string): void {
    localStorage.setItem('tirva_auth_token', token);
    localStorage.setItem('tirva_auth_timestamp', Date.now().toString());
  }

  getAuthToken(): string | null {
    const token = localStorage.getItem('tirva_auth_token');
    const timestamp = localStorage.getItem('tirva_auth_timestamp');
    
    if (token && timestamp) {
      const tokenAge = Date.now() - parseInt(timestamp);
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (tokenAge < maxAge) {
        return token;
      } else {
        this.clearAuthToken();
      }
    }
    
    return null;
  }

  clearAuthToken(): void {
    localStorage.removeItem('tirva_auth_token');
    localStorage.removeItem('tirva_auth_timestamp');
  }

  // Background sync for offline support
  async scheduleBackgroundSync(tag: string): Promise<void> {
    if (this.swRegistration && 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await (this.swRegistration as any).sync.register(tag);
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }
}

// Initialize PWA service
export const pwaService = PWAService.getInstance();

// Handle PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
});

// Initialize when DOM is loaded
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    pwaService.init();
  });
}


