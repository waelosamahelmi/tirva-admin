/**
 * Capacitor Thermal Printer Integration
 * Proper implementation using capacitor-thermal-printer plugin
 */

import { registerPlugin } from '@capacitor/core';

export interface ThermalPrinterPlugin {
  /**
   * Scan for available Bluetooth printers
   */
  scanBluetoothDevices(): Promise<{ devices: BluetoothDevice[] }>;

  /**
   * Connect to a Bluetooth printer
   */
  connectBluetooth(options: { address: string }): Promise<{ success: boolean }>;

  /**
   * Disconnect from Bluetooth printer
   */
  disconnectBluetooth(): Promise<{ success: boolean }>;

  /**
   * Check if Bluetooth is connected
   */
  isBluetoothConnected(): Promise<{ connected: boolean }>;

  /**
   * Print text to the connected printer
   */
  printText(options: { text: string }): Promise<{ success: boolean }>;

  /**
   * Print raw bytes to the connected printer
   */
  printRaw(options: { data: string }): Promise<{ success: boolean }>;

  /**
   * Get printer status
   */
  getStatus(): Promise<{ status: string }>;
}

export interface BluetoothDevice {
  address: string;
  name: string;
}

// Register the plugin
const ThermalPrinter = registerPlugin<ThermalPrinterPlugin>('ThermalPrinter');

export { ThermalPrinter };

/**
 * Modern Thermal Printer Service using the proper Capacitor plugin
 */
export class CapacitorThermalPrinterService {
  private connectedDevice: BluetoothDevice | null = null;
  private isScanning = false;

  // Event handlers
  public onDeviceFound: (device: BluetoothDevice) => void = () => {};
  public onDeviceConnected: (device: BluetoothDevice) => void = () => {};
  public onDeviceDisconnected: () => void = () => {};
  public onError: (error: string) => void = () => {};
  public onScanProgress: (progress: { message: string; devices: BluetoothDevice[] }) => void = () => {};

  /**
   * Scan for Bluetooth thermal printers
   */
  async scanBluetoothPrinters(): Promise<BluetoothDevice[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    console.log('🔵 Starting Bluetooth thermal printer scan...');
    this.isScanning = true;

    try {
      // Add progress indication
      this.onScanProgress({
        message: 'Checking Bluetooth permissions...',
        devices: []
      });

      // Check if running on Android and has proper permissions
      const androidBridge = (window as any).Android;
      if (androidBridge && typeof androidBridge.hasBluetoothPermission === 'function') {
        const hasPermission = await androidBridge.hasBluetoothPermission();
        if (!hasPermission) {
          throw new Error('Bluetooth permission is required for scanning. Please enable Bluetooth permissions in app settings.');
        }
      }

      // Add progress indication
      this.onScanProgress({
        message: 'Initializing Bluetooth scan...',
        devices: []
      });

      // Check if the plugin is available
      if (!ThermalPrinter) {
        throw new Error('Thermal printer plugin is not available. Make sure the capacitor-thermal-printer plugin is installed.');
      }

      console.log('🔵 Calling ThermalPrinter.scanBluetoothDevices()...');
      const result = await ThermalPrinter.scanBluetoothDevices();
      
      if (!result) {
        throw new Error('Scan returned null result');
      }

      const devices = result.devices || [];
      
      console.log(`✅ Found ${devices.length} Bluetooth devices:`, devices);
      
      // Notify about each device found
      devices.forEach(device => {
        console.log('📱 Found device:', device);
        this.onDeviceFound(device);
      });

      // Update scan progress
      this.onScanProgress({
        message: `Scan completed - ${devices.length} devices found`,
        devices
      });

      return devices;
    } catch (error: any) {
      console.error('❌ Bluetooth scan failed:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Unknown error occurred';
      
      if (error && typeof error === 'object') {
        if (error.code === 'UNIMPLEMENTED' || error.message?.includes('UNIMPLEMENTED')) {
          errorMessage = 'Thermal printer plugin is not implemented on this platform. The plugin may not be properly installed or configured.';
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.code) {
          errorMessage = `Error code: ${error.code}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      this.onError(`Bluetooth scan failed: ${errorMessage}`);
      
      // Throw a specific error that the printer context can catch
      const scanError = new Error(errorMessage);
      (scanError as any).code = error?.code || 'SCAN_FAILED';
      throw scanError;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Connect to a Bluetooth thermal printer
   */
  async connectToPrinter(device: BluetoothDevice): Promise<boolean> {
    console.log(`🔵 Connecting to printer: ${device.name} (${device.address})`);

    try {
      // Disconnect from any previous device
      if (this.connectedDevice) {
        console.log('🔵 Disconnecting from previous device...');
        await this.disconnect();
      }

      // Connect to the new device
      const result = await ThermalPrinter.connectBluetooth({
        address: device.address
      });

      if (result.success) {
        this.connectedDevice = device;
        console.log(`✅ Successfully connected to ${device.name}`);
        this.onDeviceConnected(device);
        return true;
      } else {
        console.log(`❌ Failed to connect to ${device.name}`);
        this.onError(`Failed to connect to ${device.name}`);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Connection error:', error);
      this.onError(`Connection failed: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Disconnect from the current printer
   */
  async disconnect(): Promise<boolean> {
    if (!this.connectedDevice) {
      return true;
    }

    console.log(`🔵 Disconnecting from ${this.connectedDevice.name}...`);

    try {
      const result = await ThermalPrinter.disconnectBluetooth();
      
      if (result.success) {
        console.log('✅ Successfully disconnected');
        this.connectedDevice = null;
        this.onDeviceDisconnected();
        return true;
      } else {
        console.log('❌ Failed to disconnect');
        this.onError('Failed to disconnect from printer');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Disconnect error:', error);
      this.onError(`Disconnect failed: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Check if a printer is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const result = await ThermalPrinter.isBluetoothConnected();
      return result.connected;
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      return false;
    }
  }

  /**
   * Print text to the connected printer
   */
  async printText(text: string): Promise<boolean> {
    if (!this.connectedDevice) {
      throw new Error('No printer connected');
    }

    console.log(`🖨️ Printing text to ${this.connectedDevice.name}...`);

    try {
      const result = await ThermalPrinter.printText({ text });
      
      if (result.success) {
        console.log('✅ Print successful');
        return true;
      } else {
        console.log('❌ Print failed');
        this.onError('Print operation failed');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Print error:', error);
      this.onError(`Print failed: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Print raw ESC/POS commands to the printer
   */
  async printRaw(data: string): Promise<boolean> {
    if (!this.connectedDevice) {
      throw new Error('No printer connected');
    }

    console.log(`🖨️ Printing raw data to ${this.connectedDevice.name}...`);

    try {
      const result = await ThermalPrinter.printRaw({ data });
      
      if (result.success) {
        console.log('✅ Raw print successful');
        return true;
      } else {
        console.log('❌ Raw print failed');
        this.onError('Raw print operation failed');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Raw print error:', error);
      this.onError(`Raw print failed: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Get printer status
   */
  async getStatus(): Promise<string> {
    try {
      const result = await ThermalPrinter.getStatus();
      return result.status;
    } catch (error: any) {
      console.error('❌ Status check failed:', error);
      this.onError(`Status check failed: ${error.message || error}`);
      return 'unknown';
    }
  }

  /**
   * Print a test receipt
   */
  async printTestReceipt(): Promise<boolean> {
    const testReceipt = this.generateTestReceipt();
    return this.printText(testReceipt);
  }

  /**
   * Print an order receipt
   */
  async printOrderReceipt(order: any): Promise<boolean> {
    const receipt = this.generateOrderReceipt(order);
    return this.printText(receipt);
  }

  /**
   * Generate test receipt with ESC/POS commands
   */
  private generateTestReceipt(): string {
    const ESC = '\x1B';
    const GS = '\x1D';
    
    return [
      ESC + '@', // Initialize printer
      ESC + 'a' + '\x01', // Center alignment
      ESC + 'E' + '\x01', // Bold on
      'RESTAURANT TEST RECEIPT\n',
      ESC + 'E' + '\x00', // Bold off
      '================================\n',
      ESC + 'a' + '\x00', // Left alignment
      '\n',
      'Item 1                    $10.99\n',
      'Item 2                     $5.50\n',
      'Item 3                     $7.25\n',
      '--------------------------------\n',
      ESC + 'E' + '\x01', // Bold on
      'TOTAL:                   $23.74\n',
      ESC + 'E' + '\x00', // Bold off
      '--------------------------------\n',
      ESC + 'a' + '\x01', // Center alignment
      'Thank you for testing!\n',
      new Date().toLocaleString() + '\n',
      '\n\n',
      GS + 'V' + '\x41' + '\x03', // Cut paper
    ].join('');
  }

  /**
   * Generate order receipt with ESC/POS commands
   */
  private generateOrderReceipt(order: any): string {
    const ESC = '\x1B';
    const GS = '\x1D';
    
    let receipt = [
      ESC + '@', // Initialize printer
      ESC + 'a' + '\x01', // Center alignment
      ESC + 'E' + '\x01', // Bold on
      'RESTAURANT ORDER\n',
      ESC + 'E' + '\x00', // Bold off
      '================================\n',
      ESC + 'a' + '\x00', // Left alignment
      `Order #: ${order.orderNumber || 'N/A'}\n`,
      `Date: ${new Date(order.createdAt || Date.now()).toLocaleString()}\n`,
      `Customer: ${order.customerName || 'Walk-in'}\n`,
      '--------------------------------\n',
    ];

    // Add items
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const name = (item.name || 'Unknown Item').substring(0, 20);
        const price = `$${(item.price || 0).toFixed(2)}`;
        const qty = `${item.quantity || 1}x`;
        
        receipt.push(`${name.padEnd(20)} ${qty} ${price.padStart(8)}\n`);
        
        // Add toppings if any
        if (item.selectedToppings && Array.isArray(item.selectedToppings)) {
          item.selectedToppings.forEach((topping: any) => {
            receipt.push(`  + ${topping.name || 'Topping'}\n`);
          });
        }
      });
    }

    receipt.push(
      '--------------------------------\n',
      ESC + 'E' + '\x01', // Bold on
      `TOTAL: $${(order.totalAmount || 0).toFixed(2)}\n`,
      ESC + 'E' + '\x00', // Bold off
      '--------------------------------\n',
      ESC + 'a' + '\x01', // Center alignment
      'Thank you for your order!\n',
      '\n\n',
      GS + 'V' + '\x41' + '\x03', // Cut paper
    );

    return receipt.join('');
  }

  /**
   * Get connected device info
   */
  getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }

  /**
   * Check if scanning is in progress
   */
  isScanningInProgress(): boolean {
    return this.isScanning;
  }
}

// Create and export singleton instance
export const capacitorThermalPrinter = new CapacitorThermalPrinterService();


