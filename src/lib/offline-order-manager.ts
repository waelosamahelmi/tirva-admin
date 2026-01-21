import { mobileApi } from './mobile-api-client';

export interface OfflineOrder {
  id: string;
  orderData: any;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface OfflineOrderUpdate {
  id: string;
  orderId: string;
  updates: any;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export class OfflineOrderManager {
  private static instance: OfflineOrderManager;
  private orders: Map<string, OfflineOrder> = new Map();
  private updates: Map<string, OfflineOrderUpdate> = new Map();
  private isProcessing: boolean = false;
  private maxRetries: number = 3;

  // Event handlers
  public onOrderQueued: (order: OfflineOrder) => void = () => {};
  public onOrderSynced: (order: OfflineOrder) => void = () => {};
  public onOrderFailed: (order: OfflineOrder) => void = () => {};
  public onSyncStarted: () => void = () => {};
  public onSyncCompleted: (results: { synced: number; failed: number }) => void = () => {};

  private constructor() {
    this.loadFromStorage();
    this.setupAutoSync();
  }

  static getInstance(): OfflineOrderManager {
    if (!OfflineOrderManager.instance) {
      OfflineOrderManager.instance = new OfflineOrderManager();
    }
    return OfflineOrderManager.instance;
  }

  private loadFromStorage() {
    try {
      // Load pending orders
      const ordersData = localStorage.getItem('offline_orders');
      if (ordersData) {
        const parsed = JSON.parse(ordersData);
        for (const [id, orderData] of Object.entries(parsed)) {
          this.orders.set(id, {
            ...orderData as OfflineOrder,
            timestamp: new Date((orderData as any).timestamp)
          });
        }
      }

      // Load pending updates
      const updatesData = localStorage.getItem('offline_order_updates');
      if (updatesData) {
        const parsed = JSON.parse(updatesData);
        for (const [id, updateData] of Object.entries(parsed)) {
          this.updates.set(id, {
            ...updateData as OfflineOrderUpdate,
            timestamp: new Date((updateData as any).timestamp)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
      // Clear corrupted data
      localStorage.removeItem('offline_orders');
      localStorage.removeItem('offline_order_updates');
    }
  }

  private saveToStorage() {
    try {
      // Save orders
      const ordersData = Object.fromEntries(this.orders);
      localStorage.setItem('offline_orders', JSON.stringify(ordersData));

      // Save updates
      const updatesData = Object.fromEntries(this.updates);
      localStorage.setItem('offline_order_updates', JSON.stringify(updatesData));
    } catch (error) {
      console.error('Failed to save offline data:', error);
    }
  }

  private setupAutoSync() {
    // Auto-sync when coming back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        setTimeout(() => this.syncAll(), 1000); // Delay to ensure connection is stable
      });
    }

    // Periodic sync attempt (every 5 minutes)
    setInterval(() => {
      if (mobileApi.getNetworkStatus() && this.hasPendingItems()) {
        this.syncAll();
      }
    }, 5 * 60 * 1000);
  }

  // Queue new order for offline processing
  async queueOrder(orderData: any): Promise<string> {
    const orderId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineOrder: OfflineOrder = {
      id: orderId,
      orderData,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    };

    this.orders.set(orderId, offlineOrder);
    this.saveToStorage();
    this.onOrderQueued(offlineOrder);

    // Try to sync immediately if online
    if (mobileApi.getNetworkStatus()) {
      setTimeout(() => this.syncOrder(orderId), 100);
    }

    return orderId;
  }

  // Queue order update for offline processing
  async queueOrderUpdate(orderId: string, updates: any): Promise<string> {
    const updateId = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineUpdate: OfflineOrderUpdate = {
      id: updateId,
      orderId,
      updates,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    };

    this.updates.set(updateId, offlineUpdate);
    this.saveToStorage();

    // Try to sync immediately if online
    if (mobileApi.getNetworkStatus()) {
      setTimeout(() => this.syncUpdate(updateId), 100);
    }

    return updateId;
  }

  // Sync specific order
  private async syncOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order || order.status === 'syncing' || order.status === 'synced') {
      return false;
    }

    if (order.retryCount >= this.maxRetries) {
      order.status = 'failed';
      order.lastError = 'Max retries exceeded';
      this.saveToStorage();
      this.onOrderFailed(order);
      return false;
    }

    try {
      order.status = 'syncing';
      order.retryCount++;
      this.saveToStorage();

      const result = await mobileApi.createOrder(order.orderData);
      
      if (result.success) {
        order.status = 'synced';
        this.saveToStorage();
        this.onOrderSynced(order);
        
        // Remove from queue after successful sync
        setTimeout(() => {
          this.orders.delete(orderId);
          this.saveToStorage();
        }, 5000); // Keep for 5 seconds for UI feedback
        
        return true;
      } else {
        order.status = 'pending';
        order.lastError = result.error || 'Unknown error';
        this.saveToStorage();
        return false;
      }
    } catch (error) {
      order.status = 'pending';
      order.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.saveToStorage();
      return false;
    }
  }

  // Sync specific update
  private async syncUpdate(updateId: string): Promise<boolean> {
    const update = this.updates.get(updateId);
    if (!update || update.status === 'syncing' || update.status === 'synced') {
      return false;
    }

    if (update.retryCount >= this.maxRetries) {
      update.status = 'failed';
      update.lastError = 'Max retries exceeded';
      this.saveToStorage();
      return false;
    }

    try {
      update.status = 'syncing';
      update.retryCount++;
      this.saveToStorage();

      const result = await mobileApi.updateOrder(update.orderId, update.updates);
      
      if (result.success) {
        update.status = 'synced';
        this.saveToStorage();
        
        // Remove from queue after successful sync
        setTimeout(() => {
          this.updates.delete(updateId);
          this.saveToStorage();
        }, 5000);
        
        return true;
      } else {
        update.status = 'pending';
        update.lastError = result.error || 'Unknown error';
        this.saveToStorage();
        return false;
      }
    } catch (error) {
      update.status = 'pending';
      update.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.saveToStorage();
      return false;
    }
  }

  // Sync all pending items
  async syncAll(): Promise<{ synced: number; failed: number }> {
    if (this.isProcessing || !mobileApi.getNetworkStatus()) {
      return { synced: 0, failed: 0 };
    }

    this.isProcessing = true;
    this.onSyncStarted();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // Sync orders first
      for (const [orderId] of this.orders) {
        const success = await this.syncOrder(orderId);
        if (success) {
          syncedCount++;
        } else {
          const order = this.orders.get(orderId);
          if (order?.status === 'failed') {
            failedCount++;
          }
        }
        
        // Small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Then sync updates
      for (const [updateId] of this.updates) {
        const success = await this.syncUpdate(updateId);
        if (success) {
          syncedCount++;
        } else {
          const update = this.updates.get(updateId);
          if (update?.status === 'failed') {
            failedCount++;
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } finally {
      this.isProcessing = false;
      const results = { synced: syncedCount, failed: failedCount };
      this.onSyncCompleted(results);
      return results;
    }
  }

  // Get pending items
  getPendingOrders(): OfflineOrder[] {
    return Array.from(this.orders.values()).filter(order => 
      order.status === 'pending' || order.status === 'syncing'
    );
  }

  getPendingUpdates(): OfflineOrderUpdate[] {
    return Array.from(this.updates.values()).filter(update => 
      update.status === 'pending' || update.status === 'syncing'
    );
  }

  getFailedOrders(): OfflineOrder[] {
    return Array.from(this.orders.values()).filter(order => order.status === 'failed');
  }

  getFailedUpdates(): OfflineOrderUpdate[] {
    return Array.from(this.updates.values()).filter(update => update.status === 'failed');
  }

  // Utility methods
  hasPendingItems(): boolean {
    return this.orders.size > 0 || this.updates.size > 0;
  }

  getPendingCount(): number {
    return this.getPendingOrders().length + this.getPendingUpdates().length;
  }

  getFailedCount(): number {
    return this.getFailedOrders().length + this.getFailedUpdates().length;
  }

  // Manual retry for failed items
  async retryFailed(): Promise<{ synced: number; failed: number }> {
    // Reset retry count for failed items
    for (const [, order] of this.orders) {
      if (order.status === 'failed') {
        order.status = 'pending';
        order.retryCount = 0;
        order.lastError = undefined;
      }
    }

    for (const [, update] of this.updates) {
      if (update.status === 'failed') {
        update.status = 'pending';
        update.retryCount = 0;
        update.lastError = undefined;
      }
    }

    this.saveToStorage();
    return await this.syncAll();
  }

  // Clear all offline data (use with caution)
  clearAll(): void {
    this.orders.clear();
    this.updates.clear();
    this.saveToStorage();
  }

  // Remove specific items
  removeOrder(orderId: string): void {
    this.orders.delete(orderId);
    this.saveToStorage();
  }

  removeUpdate(updateId: string): void {
    this.updates.delete(updateId);
    this.saveToStorage();
  }
}

// Create singleton instance
export const offlineOrderManager = OfflineOrderManager.getInstance();



