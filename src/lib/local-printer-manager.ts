/**
 * Local Storage Printer Manager
 * Primary storage system for printer configurations using browser localStorage
 * Provides reliable, offline-first printer management
 * Now syncs with database for persistence across app updates
 */

import { PrinterDevice } from './printer/types';
import { DatabasePrinterManager } from './database-printer-manager';

export interface LocalPrinterStorage {
  printers: PrinterDevice[];
  defaultPrinterId: string | null;
  lastConnected: Record<string, string>; // deviceId -> ISO date string
  autoReconnect: boolean;
  version: string;
}

export class LocalPrinterManager {
  private static readonly STORAGE_KEY = 'restaurant_printers_v1';
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Load all printer data from localStorage
   * Also syncs with database if available
   */
  static load(): LocalPrinterStorage {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Try to load from database
        this.syncFromDatabase();
        return this.getDefaultStorage();
      }

      const data = JSON.parse(stored) as LocalPrinterStorage;
      
      // Migrate if needed
      if (!data.version || data.version !== this.CURRENT_VERSION) {
      console.log('📦 Migrating printer storage to version', this.CURRENT_VERSION);
      return this.migrate(data);
    }

    // Sync with database in background
    this.syncFromDatabase();      return data;
    } catch (error) {
      console.error('❌ Failed to load printers from localStorage:', error);
      return this.getDefaultStorage();
    }
  }

  /**
   * Sync printers from database to localStorage
   */
  static async syncFromDatabase(): Promise<void> {
    try {
      const dbPrinters = await DatabasePrinterManager.loadPrinters();
      
      if (dbPrinters.length === 0) {
        return; // No printers in database
      }

      const data = this.load();
      let hasChanges = false;

      // Add any printers from database that aren't in localStorage
      for (const dbPrinter of dbPrinters) {
        const exists = data.printers.some(p => p.id === dbPrinter.id);
        if (!exists) {
          data.printers.push(dbPrinter);
          hasChanges = true;
          console.log(`📥 Synced printer from database: ${dbPrinter.name}`);
        }
      }

      if (hasChanges) {
        this.save(data);
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync printers from database:', error);
    }
  }

  /**
   * Save printer data to localStorage
   */
  static save(data: LocalPrinterStorage): void {
    try {
      data.version = this.CURRENT_VERSION;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log(`💾 Saved ${data.printers.length} printers to localStorage`);
    } catch (error) {
      console.error('❌ Failed to save printers to localStorage:', error);
    }
  }

  /**
   * Add or update a printer
   */
  static addPrinter(printer: PrinterDevice): void {
    const data = this.load();
    
    // Check if printer already exists
    const existingIndex = data.printers.findIndex(p => p.id === printer.id);
    
    if (existingIndex >= 0) {
      // Update existing printer
      data.printers[existingIndex] = printer;
      console.log(`🔄 Updated printer: ${printer.name}`);
    } else {
      // Add new printer
      data.printers.push(printer);
      console.log(`➕ Added new printer: ${printer.name}`);
    }

    // Set as default if it's the first printer
    if (!data.defaultPrinterId && data.printers.length === 1) {
      data.defaultPrinterId = printer.id;
      console.log(`⭐ Set ${printer.name} as default printer`);
    }

    this.save(data);
    
    // Sync to database in background (don't wait for it)
    DatabasePrinterManager.syncPrinter(printer).catch(err => {
      console.warn('⚠️ Failed to sync printer to database:', err);
    });
  }

  /**
   * Remove a printer
   */
  static removePrinter(printerId: string): void {
    const data = this.load();
    
    const printerIndex = data.printers.findIndex(p => p.id === printerId);
    if (printerIndex >= 0) {
      const printer = data.printers[printerIndex];
      data.printers.splice(printerIndex, 1);
      
      // Remove from last connected
      delete data.lastConnected[printerId];
      
      // Update default if this was the default
      if (data.defaultPrinterId === printerId) {
        data.defaultPrinterId = data.printers.length > 0 ? data.printers[0].id : null;
      }
      
      console.log(`🗑️ Removed printer: ${printer.name}`);
      this.save(data);
      
      // Delete from database in background
      DatabasePrinterManager.deletePrinter(printerId).catch(err => {
        console.warn('⚠️ Failed to delete printer from database:', err);
      });
    }
  }

  /**
   * Get all printers
   */
  static getPrinters(): PrinterDevice[] {
    return this.load().printers;
  }

  /**
   * Get a specific printer by ID
   */
  static getPrinter(printerId: string): PrinterDevice | null {
    const data = this.load();
    return data.printers.find(p => p.id === printerId) || null;
  }

  /**
   * Set default printer
   */
  static setDefaultPrinter(printerId: string): void {
    const data = this.load();
    
    if (data.printers.find(p => p.id === printerId)) {
      data.defaultPrinterId = printerId;
      console.log(`⭐ Set default printer: ${printerId}`);
      this.save(data);
    }
  }

  /**
   * Get default printer
   */
  static getDefaultPrinter(): PrinterDevice | null {
    const data = this.load();
    
    if (data.defaultPrinterId) {
      return data.printers.find(p => p.id === data.defaultPrinterId) || null;
    }
    
    // Return first printer if no default set
    return data.printers.length > 0 ? data.printers[0] : null;
  }

  /**
   * Record successful connection
   */
  static recordConnection(printerId: string): void {
    const data = this.load();
    data.lastConnected[printerId] = new Date().toISOString();
    this.save(data);
    console.log(`🔌 Recorded connection: ${printerId}`);
  }

  /**
   * Get last connected printer
   */
  static getLastConnectedPrinter(): PrinterDevice | null {
    const data = this.load();
    
    // Find most recently connected printer
    let lastTime = 0;
    let lastPrinterId: string | null = null;
    
    for (const [printerId, dateStr] of Object.entries(data.lastConnected)) {
      const time = new Date(dateStr).getTime();
      if (time > lastTime) {
        lastTime = time;
        lastPrinterId = printerId;
      }
    }
    
    if (lastPrinterId) {
      return data.printers.find(p => p.id === lastPrinterId) || null;
    }
    
    return null;
  }

  /**
   * Get printers sorted by last connection time
   */
  static getPrintersByLastConnection(): PrinterDevice[] {
    const data = this.load();
    
    return data.printers.sort((a, b) => {
      const timeA = data.lastConnected[a.id] ? new Date(data.lastConnected[a.id]).getTime() : 0;
      const timeB = data.lastConnected[b.id] ? new Date(data.lastConnected[b.id]).getTime() : 0;
      return timeB - timeA; // Most recent first
    });
  }

  /**
   * Set auto-reconnect preference
   */
  static setAutoReconnect(enabled: boolean): void {
    const data = this.load();
    data.autoReconnect = enabled;
    this.save(data);
    console.log(`🔄 Auto-reconnect ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if auto-reconnect is enabled
   */
  static isAutoReconnectEnabled(): boolean {
    return this.load().autoReconnect;
  }

  /**
   * Clear all printer data
   */
  static clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🧹 Cleared all printer data');
  }

  /**
   * Export printer data for backup
   */
  static export(): string {
    const data = this.load();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import printer data from backup
   */
  static import(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData) as LocalPrinterStorage;
      
      // Validate data structure
      if (!Array.isArray(data.printers)) {
        throw new Error('Invalid data format: printers must be an array');
      }
      
      this.save(data);
      console.log(`📥 Imported ${data.printers.length} printers`);
      return true;
    } catch (error) {
      console.error('❌ Failed to import printer data:', error);
      return false;
    }
  }

  /**
   * Clear failed or stale printer data
   */
  static clearFailedConnections(): void {
    const data = this.load();
    const now = new Date();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    // Remove connections older than maxAge
    const validConnections: Record<string, string> = {};
    for (const [printerId, dateStr] of Object.entries(data.lastConnected)) {
      const connectionDate = new Date(dateStr);
      if (now.getTime() - connectionDate.getTime() < maxAge) {
        validConnections[printerId] = dateStr;
      }
    }
    
    data.lastConnected = validConnections;
    
    // Remove printers that haven't been connected recently and are marked as offline
    data.printers = data.printers.filter(printer => {
      const hasRecentConnection = validConnections[printer.id];
      const isConnected = printer.isConnected;
      
      // Keep if recently connected or currently connected
      return hasRecentConnection || isConnected;
    });
    
    this.save(data);
    console.log('🧹 Cleared stale printer connections');
  }

  /**
   * Get printer connection info for auto-reconnection
   */
  static getPrinterConnectionInfo(printerId: string): {
    address: string;
    port: number;
    name: string;
    lastConnected?: Date;
  } | null {
    const printer = this.getPrinter(printerId);
    if (!printer) return null;
    
    const data = this.load();
    const lastConnectedStr = data.lastConnected[printerId];
    
    return {
      address: printer.address,
      port: printer.port || 9100,
      name: printer.name,
      lastConnected: lastConnectedStr ? new Date(lastConnectedStr) : undefined
    };
  }

  /**
   * Get default storage structure
   */
  private static getDefaultStorage(): LocalPrinterStorage {
    return {
      printers: [],
      defaultPrinterId: null,
      lastConnected: {},
      autoReconnect: true,
      version: this.CURRENT_VERSION
    };
  }

  /**
   * Migrate old storage format to new version
   */
  private static migrate(oldData: any): LocalPrinterStorage {
    const newData = this.getDefaultStorage();
    
    // Migrate printers array if it exists
    if (Array.isArray(oldData.printers)) {
      newData.printers = oldData.printers;
    }
    
    // Migrate other fields if they exist
    if (oldData.defaultPrinterId) {
      newData.defaultPrinterId = oldData.defaultPrinterId;
    }
    
    if (oldData.lastConnected && typeof oldData.lastConnected === 'object') {
      newData.lastConnected = oldData.lastConnected;
    }
    
    if (typeof oldData.autoReconnect === 'boolean') {
      newData.autoReconnect = oldData.autoReconnect;
    }
    
    // Save migrated data
    this.save(newData);
    
    return newData;
  }

  /**
   * Get storage statistics
   */
  static getStats(): {
    totalPrinters: number;
    defaultPrinter: string | null;
    lastConnectedPrinter: string | null;
    autoReconnectEnabled: boolean;
    storageSize: number;
  } {
    const data = this.load();
    const lastConnected = this.getLastConnectedPrinter();
    
    return {
      totalPrinters: data.printers.length,
      defaultPrinter: data.defaultPrinterId,
      lastConnectedPrinter: lastConnected?.id || null,
      autoReconnectEnabled: data.autoReconnect,
      storageSize: new Blob([JSON.stringify(data)]).size
    };
  }
}



