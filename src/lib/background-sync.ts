// Background sync utilities for maintaining realtime connection
// when the app is backgrounded

// Extend ServiceWorkerRegistration to include sync property
declare global {
  interface ServiceWorkerRegistration {
    sync?: {
      register(tag: string): Promise<void>;
    };
  }
}

class BackgroundSyncManager {
  private isRegistered = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private wakeLock: any = null;

  constructor() {
    this.init();
  }

  private async init() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log('📱 Background Sync: Service Worker ready');
        
        // Register background sync if supported
        if ('sync' in window.ServiceWorkerRegistration.prototype && registration.sync) {
          console.log('📱 Background Sync: Registering background sync');
          await registration.sync.register('background-sync-orders');
          this.isRegistered = true;
        }
        
        // Set up periodic heartbeat to keep connection alive
        this.startHeartbeat();
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
      } catch (error) {
        console.error('📱 Background Sync: Failed to initialize:', error);
      }
    }
  }

  private startHeartbeat() {
    // Send heartbeat every 30 seconds to keep service worker alive
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
    
    console.log('📱 Background Sync: Heartbeat started');
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('📱 Background Sync: Heartbeat stopped');
    }
  }

  private sendHeartbeat() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'KEEP_ALIVE_RESPONSE') {
          console.log('📱 Background Sync: Heartbeat acknowledged');
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'KEEP_ALIVE' },
        [channel.port2]
      );
    }
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      console.log('📱 Background Sync: App went to background');
      // App is hidden - rely on service worker to maintain connection
      this.triggerBackgroundSync();
    } else {
      console.log('📱 Background Sync: App came to foreground');
      // App is visible - can use normal realtime connection
      this.startHeartbeat();
    }
  }
  public async triggerBackgroundSync() {
    if (!this.isRegistered) {
      console.warn('📱 Background Sync: Not registered, cannot trigger sync');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.sync) {
        await registration.sync.register('background-sync-orders');
        console.log('📱 Background Sync: Triggered successfully');
      }
    } catch (error) {
      console.error('📱 Background Sync: Failed to trigger:', error);
    }
  }

  public enableRealtimeBackground() {
    console.log('📱 Background Sync: Enabling realtime background mode');
    
    // Keep service worker active
    this.startHeartbeat();
    
    // Register for background sync
    this.triggerBackgroundSync();    // Enable wake lock if supported to prevent device sleep
    if ('wakeLock' in navigator) {
      const wakeLockApi = (navigator as any).wakeLock;
      wakeLockApi.request('screen').then((wakeLock: any) => {
        this.wakeLock = wakeLock;
        console.log('📱 Background Sync: Wake lock acquired');
        
        // Release wake lock when page becomes hidden
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && this.wakeLock) {
            this.wakeLock.release();
            console.log('📱 Background Sync: Wake lock released');
          }
        });
      }).catch((error: any) => {
        console.warn('📱 Background Sync: Wake lock failed:', error);
      });
    }
  }

  public destroy() {
    this.stopHeartbeat();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
}

// Create singleton instance
export const backgroundSyncManager = new BackgroundSyncManager();

// Hook to use background sync in React components
export function useBackgroundSync() {
  return {
    triggerSync: () => backgroundSyncManager.triggerBackgroundSync(),
    enableRealtimeBackground: () => backgroundSyncManager.enableRealtimeBackground(),
  };
}



