/**
 * Simple Bluetooth Printer Service
 * Clean implementation focusing on actual printing to ESC/POS thermal printers
 */

import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

export interface SimplePrinter {
  id: string;
  name: string;
  address: string;
  rssi?: number;
}

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

export class SimpleBluetoothPrinter {
  private connectedDevice: BleDevice | null = null;
  private writeCharacteristic: string | null = null;
  
  // Common ESC/POS printer service UUIDs
  private readonly PRINTER_SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer service
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Another common service
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // Generic printer service
  ];

  /**
   * Initialize BLE
   */
  async initialize(): Promise<void> {
    try {
      if (!Capacitor.isNativePlatform()) {
        throw new Error('Bluetooth only works on native platforms');
      }
      
      console.log('🔵 Initializing BLE...');
      await BleClient.initialize();
      console.log('✅ BLE initialized');
    } catch (error: any) {
      console.error('❌ BLE initialization failed:', error);
      throw error;
    }
  }

  /**
   * Scan for nearby Bluetooth printers
   */
  async scanForPrinters(onDeviceFound: (printer: SimplePrinter) => void): Promise<void> {
    try {
      console.log('🔍 Starting Bluetooth scan...');
      
      const foundDevices = new Map<string, SimplePrinter>();

      await BleClient.requestLEScan({}, (result) => {
        // Only process devices with names (printers usually have names)
        if (result.device.name && result.device.name.length > 0) {
          const deviceId = result.device.deviceId;
          
          if (!foundDevices.has(deviceId)) {
            const printer: SimplePrinter = {
              id: deviceId,
              name: result.device.name,
              address: deviceId,
              rssi: result.rssi
            };
            
            foundDevices.set(deviceId, printer);
            console.log(`📱 Found device: ${printer.name} (${deviceId})`);
            onDeviceFound(printer);
          }
        }
      });

      // Scan for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 10000));
      await BleClient.stopLEScan();
      
      console.log(`✅ Scan complete - found ${foundDevices.size} devices`);
    } catch (error: any) {
      console.error('❌ Scan failed:', error);
      throw error;
    }
  }

  /**
   * Connect to a printer
   */
  async connect(deviceId: string): Promise<boolean> {
    try {
      console.log(`🔵 Connecting to device: ${deviceId}`);
      
      // Disconnect from any previous device
      if (this.connectedDevice) {
        await this.disconnect();
      }

      // Connect to the device
      await BleClient.connect(deviceId, () => {
        console.log('🔌 Device disconnected unexpectedly');
        this.connectedDevice = null;
        this.writeCharacteristic = null;
      });
      
      console.log('✅ Connected! Discovering services...');

      // Get all services
      const services = await BleClient.getServices(deviceId);
      console.log(`📋 Found ${services.length} services`);

      // Find the printer service and write characteristic
      for (const service of services) {
        console.log(`🔍 Service: ${service.uuid}`);
        
        for (const characteristic of service.characteristics) {
          console.log(`  📝 Characteristic: ${characteristic.uuid}`);
          
          // Look for writable characteristic (for sending print data)
          if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
            this.writeCharacteristic = characteristic.uuid;
            console.log(`✅ Found write characteristic: ${characteristic.uuid}`);
            break;
          }
        }
        
        if (this.writeCharacteristic) break;
      }

      if (!this.writeCharacteristic) {
        throw new Error('Could not find write characteristic for printer');
      }

      this.connectedDevice = { deviceId } as BleDevice;
      console.log('✅ Printer ready for printing!');
      return true;

    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      this.connectedDevice = null;
      this.writeCharacteristic = null;
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await BleClient.disconnect(this.connectedDevice.deviceId);
        console.log('✅ Disconnected from printer');
      } catch (error) {
        console.error('❌ Disconnect error:', error);
      }
      this.connectedDevice = null;
      this.writeCharacteristic = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectedDevice !== null && this.writeCharacteristic !== null;
  }

  /**
   * Send raw data to printer
   */
  private async sendRaw(data: string): Promise<void> {
    if (!this.connectedDevice || !this.writeCharacteristic) {
      throw new Error('Printer not connected');
    }

    try {
      // Convert string to bytes
      const bytes = new TextEncoder().encode(data);
      const dataView = new DataView(bytes.buffer);

      // Send data
      await BleClient.write(
        this.connectedDevice.deviceId,
        this.writeCharacteristic.split('-')[0], // Service UUID (simplified)
        this.writeCharacteristic,
        dataView
      );
    } catch (error: any) {
      console.error('❌ Failed to send data:', error);
      throw error;
    }
  }

  /**
   * Print text
   */
  async printText(text: string): Promise<void> {
    console.log('🖨️ Printing text...');
    
    let escPosData = '';
    
    // Initialize printer
    escPosData += `${ESC}@`; // Initialize
    
    // Center align
    escPosData += `${ESC}a\x01`;
    
    // Add text
    escPosData += text;
    
    // Feed paper and cut
    escPosData += '\n\n\n';
    escPosData += `${GS}V\x00`; // Cut paper
    
    await this.sendRaw(escPosData);
    console.log('✅ Print job sent');
  }

  /**
   * Print test receipt
   */
  async printTestReceipt(): Promise<void> {
    const testReceipt = 
      '================================\n' +
      '       TEST RECEIPT\n' +
      '================================\n' +
      `Date: ${new Date().toLocaleString()}\n` +
      'Bluetooth Thermal Printer\n' +
      '================================\n' +
      'This is a test print\n' +
      'If you can see this,\n' +
      'the printer is working!\n' +
      '================================\n';

    await this.printText(testReceipt);
  }

  /**
   * Print order receipt
   */
  async printOrder(order: any): Promise<void> {
    let receipt = '';
    
    receipt += '================================\n';
    receipt += '     ORDER RECEIPT\n';
    receipt += '================================\n';
    receipt += `Order #${order.id || order.number || 'N/A'}\n`;
    receipt += `Date: ${new Date().toLocaleString()}\n`;
    receipt += '--------------------------------\n';
    
    if (order.items && Array.isArray(order.items)) {
      receipt += 'ITEMS:\n';
      order.items.forEach((item: any) => {
        receipt += `${item.quantity}x ${item.name}\n`;
        if (item.price) {
          receipt += `   $${item.price.toFixed(2)}\n`;
        }
      });
      receipt += '--------------------------------\n';
    }
    
    if (order.total) {
      receipt += `TOTAL: $${order.total.toFixed(2)}\n`;
    }
    
    receipt += '================================\n';
    receipt += '    Thank you!\n';
    receipt += '================================\n';

    await this.printText(receipt);
  }
}

export default SimpleBluetoothPrinter;



