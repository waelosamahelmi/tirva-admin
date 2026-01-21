/**
 * Database Printer Manager
 * Syncs printer configurations with the backend database
 * Works alongside LocalPrinterManager for offline-first functionality
 */

import { PrinterDevice } from './printer/types';

export class DatabasePrinterManager {
  private static readonly API_BASE = '/api';

  /**
   * Sync printer to database
   */
  static async syncPrinter(printer: PrinterDevice): Promise<boolean> {
    try {
      // Check if we're online before attempting to sync
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('📴 Offline - skipping printer database sync');
        return false;
      }

      console.log('🔄 Syncing printer to database:', {
        id: printer.id,
        name: printer.name,
        address: printer.address,
        port: printer.port,
        printerType: printer.printerType
      });

      const response = await fetch(`${this.API_BASE}/printers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: printer.id,
          name: printer.name,
          address: printer.address,
          port: printer.port || 9100,
          printerType: printer.printerType || 'escpos',
          isActive: true,
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      console.log('📡 Database sync response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Database sync failed:', errorText);
        throw new Error(`Failed to sync printer: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Synced printer to database:', result);
      return true;
    } catch (error) {
      // Gracefully handle offline/timeout errors
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.log('⏱️ Printer database sync timed out - saved locally only');
        } else if (error.message.includes('fetch')) {
          console.log('🌐 Network error syncing printer - saved locally only');
        } else {
          console.error('❌ Failed to sync printer to database:', error.message);
        }
      } else {
        console.error('❌ Failed to sync printer to database:', error);
      }
      return false;
    }
  }

  /**
   * Load printers from database
   */
  static async loadPrinters(): Promise<PrinterDevice[]> {
    try {
      // Check if we're online before attempting to fetch
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log('📴 Offline - skipping printer database fetch');
        return [];
      }

      const response = await fetch(`${this.API_BASE}/printers`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load printers: ${response.statusText}`);
      }

      const printers = await response.json();
      return printers.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: 'network' as const,
        address: p.address,
        port: p.port,
        printerType: p.printerType,
        isConnected: false,
        status: 'offline' as const,
        metadata: {
          protocol: 'tcp',
          discoveryMethod: 'database',
          confidence: 'high' as const,
          fontSettings: p.fontSettings
        }
      }));
    } catch (error) {
      // Gracefully handle offline/timeout errors
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.log('⏱️ Printer database fetch timed out - using local storage');
        } else if (error.message.includes('fetch')) {
          console.log('🌐 Network error loading printers - using local storage');
        } else {
          console.error('❌ Failed to load printers from database:', error.message);
        }
      } else {
        console.error('❌ Failed to load printers from database:', error);
      }
      return [];
    }
  }

  /**
   * Update printer in database
   */
  static async updatePrinter(printer: PrinterDevice): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/printers/${printer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: printer.name,
          address: printer.address,
          port: printer.port || 9100,
          printerType: printer.printerType || 'escpos',
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update printer: ${response.statusText}`);
      }

      console.log(`✅ Updated printer in database: ${printer.name}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to update printer in database:', error);
      return false;
    }
  }

  /**
   * Delete printer from database
   */
  static async deletePrinter(printerId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE}/printers/${printerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete printer: ${response.statusText}`);
      }

      console.log(`✅ Deleted printer from database: ${printerId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete printer from database:', error);
      return false;
    }
  }

  /**
   * Get printer by ID from database
   */
  static async getPrinter(printerId: string): Promise<PrinterDevice | null> {
    try {
      const response = await fetch(`${this.API_BASE}/printers/${printerId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get printer: ${response.statusText}`);
      }

      const p = await response.json();
      return {
        id: p.id,
        name: p.name,
        type: 'network' as const,
        address: p.address,
        port: p.port,
        printerType: p.printerType,
        isConnected: false,
        status: 'offline' as const,
      };
    } catch (error) {
      console.error('❌ Failed to get printer from database:', error);
      return null;
    }
  }
}



