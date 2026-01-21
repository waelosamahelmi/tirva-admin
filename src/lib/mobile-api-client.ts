// import { supabase } from './supabase-client';
import { createClient } from '@supabase/supabase-js';
import { Network } from '@capacitor/network';
import { Toast } from '@capacitor/toast';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  offline?: boolean;
}

export class MobileApiClient {
  private static instance: MobileApiClient;
  private baseUrl: string;
  private isOnline: boolean = true;
  private retryQueue: Array<() => Promise<void>> = [];  private constructor() {
    // Determine base URL based on environment
    this.baseUrl = this.getApiBaseUrl();
    this.initializeNetworkMonitoring();
  }

  private getApiBaseUrl(): string {
    // Check for cloud/production API URL first
    const cloudApiUrl = import.meta.env.VITE_API_URL;
    if (cloudApiUrl) {
      console.log('?? Using cloud API URL:', cloudApiUrl);
      return cloudApiUrl;
    }

    // Fall back to local development
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log('?? Using local development API URL');
        return 'https://tirvaadmin.fly.io/';
      } else {
        // Use the same hostname as the frontend but port 5000
        const localUrl = `http://${hostname}:5000`;
        console.log('?? Using local network API URL:', localUrl);
        return localUrl;
      }
    }
    
    // Default fallback
    console.log('?? Using default local API URL');
    return 'https://tirvaadmin.fly.io/';
  }

  static getInstance(): MobileApiClient {
    if (!MobileApiClient.instance) {
      MobileApiClient.instance = new MobileApiClient();
    }
    return MobileApiClient.instance;
  }

  private async initializeNetworkMonitoring() {
    try {
      // Monitor network status
      const status = await Network.getStatus();
      this.isOnline = status.connected;

      Network.addListener('networkStatusChange', (status) => {
        const wasOffline = !this.isOnline;
        this.isOnline = status.connected;

        if (status.connected && wasOffline) {
          this.showToast('Back online! Syncing data...', 'success');
          this.processRetryQueue();
        } else if (!status.connected) {
          this.showToast('Gone offline. Data will sync when reconnected.', 'warning');
        }
      });
    } catch (error) {
      console.warn('Network monitoring not available:', error);
      // Fallback to browser online/offline events
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.showToast('Back online! Syncing data...', 'success');
        this.processRetryQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.showToast('Gone offline. Data will sync when reconnected.', 'warning');
      });
    }
  }

  private async showToast(message: string, type: 'success' | 'warning' | 'error' = 'success') {
    try {
      await Toast.show({
        text: message,
        duration: 'short',
        position: 'bottom'
      });
    } catch (error) {
      // Fallback to console if Toast is not available
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  private async processRetryQueue() {
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const retryFn of queue) {
      try {
        await retryFn();
      } catch (error) {
        console.error('Retry failed:', error);
      }
    }
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (!this.isOnline) {
      return {
        success: false,
        error: 'No internet connection',
        offline: true
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include', // Important for sessions
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('API request failed:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Health check
  async checkConnection(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.makeRequest('/health');
  }

  // Mobile-specific status
  async getMobileStatus(): Promise<ApiResponse<any>> {
    return this.makeRequest('/api/mobile/status');
  }

  // Orders API
  async getOrders(): Promise<ApiResponse<any[]>> {
    return this.makeRequest('/api/orders');
  }

  async createOrder(orderData: any): Promise<ApiResponse<any>> {
    const result = await this.makeRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });    // If offline, queue for retry
    if (!result.success && result.offline) {
      this.retryQueue.push(async () => {
        await this.createOrder(orderData);
      });
      this.showToast('Order queued for when connection returns', 'warning');
    }

    return result;
  }

  async updateOrder(orderId: string, updates: any): Promise<ApiResponse<any>> {
    const result = await this.makeRequest(`/api/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });    if (!result.success && result.offline) {
      this.retryQueue.push(async () => {
        await this.updateOrder(orderId, updates);
      });
    }

    return result;
  }

  // Menu API
  async getMenu(): Promise<ApiResponse<any[]>> {
    return this.makeRequest('/api/menu');
  }

  // Supabase integration
  async testSupabaseConnection(): Promise<ApiResponse<any>> {
    try {
      if (!this.isOnline) {
        return {
          success: false,
          error: 'No internet connection',
          offline: true
        };
      }

      // Test Supabase connection
      const { data, error } = await supabase
        .from('orders')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: {
          status: 'connected',
          provider: 'supabase',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Supabase connection failed'
      };
    }
  }

  // Sync operations
  async syncOfflineData(): Promise<ApiResponse<any>> {
    if (!this.isOnline) {
      return {
        success: false,
        error: 'Cannot sync while offline',
        offline: true
      };
    }

    try {
      // Process retry queue
      await this.processRetryQueue();

      // Sync any locally stored data
      const localData = this.getLocalData();
      if (localData.length > 0) {
        for (const item of localData) {
          await this.syncDataItem(item);
        }
        this.clearLocalData();
      }

      return {
        success: true,
        data: { synced: localData.length }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  private getLocalData(): any[] {
    try {
      const data = localStorage.getItem('offline_data');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(data: any) {
    try {
      const existing = this.getLocalData();
      existing.push({
        ...data,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      });
      localStorage.setItem('offline_data', JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  private clearLocalData() {
    try {
      localStorage.removeItem('offline_data');
    } catch (error) {
      console.error('Failed to clear local storage:', error);
    }
  }

  private async syncDataItem(item: any): Promise<void> {
    // Implement specific sync logic based on data type
    switch (item.type) {
      case 'order':
        await this.createOrder(item.data);
        break;
      case 'order_update':
        await this.updateOrder(item.orderId, item.data);
        break;
      default:
        console.warn('Unknown data type for sync:', item.type);
    }
  }

  // Offline data storage
  storeOfflineOrder(orderData: any) {
    this.saveToLocalStorage({
      type: 'order',
      data: orderData
    });
  }

  storeOfflineOrderUpdate(orderId: string, updates: any) {
    this.saveToLocalStorage({
      type: 'order_update',
      orderId,
      data: updates
    });
  }

  // Network status
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Get base URL for external use
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Create singleton instance
export const mobileApi = MobileApiClient.getInstance();
