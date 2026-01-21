/**
 * Alternative Bluetooth Printer Service using @capacitor-community/bluetooth-le
 * This serves as a fallback when capacitor-thermal-printer is not available
 */

import { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';
import { registerPlugin } from '@capacitor/core';

export interface BluetoothPrinterDevice {
  address: string;
  name: string;
  deviceId?: string;
  isPaired?: boolean;
}

interface PairedDevice {
  name: string;
  address: string;
  type: number;
  bondState: number;
}

interface PairedBluetoothHelperPlugin {
  getPairedDevices(): Promise<{ devices: PairedDevice[] }>;
}

const PairedBluetoothHelper = registerPlugin<PairedBluetoothHelperPlugin>('PairedBluetoothHelper');

export class AlternativeBluetoothPrinterService {
  private isScanning = false;
  private connectedDevice: BluetoothPrinterDevice | null = null;

  // Event handlers
  public onDeviceFound: (device: BluetoothPrinterDevice) => void = () => {};
  public onDeviceConnected: (device: BluetoothPrinterDevice) => void = () => {};
  public onDeviceDisconnected: () => void = () => {};
  public onError: (error: string) => void = () => {};
  public onScanProgress: (progress: { message: string; devices: BluetoothPrinterDevice[] }) => void = () => {};

  /**
   * Initialize Bluetooth LE client
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔵 Initializing Bluetooth LE client...');
      await BleClient.initialize();
      console.log('✅ Bluetooth LE client initialized');
    } catch (error: any) {
      console.error('❌ Failed to initialize Bluetooth LE client:', error);
      throw new Error(`Bluetooth initialization failed: ${error.message || error}`);
    }
  }

  /**
   * Get paired/bonded Bluetooth devices from Android system
   */
  private async getPairedBluetoothDevices(): Promise<PairedDevice[]> {
    try {
      console.log('🔍 DEBUG: Checking if PairedBluetoothHelper plugin is available...');
      
      // Check if the plugin is available
      if (!PairedBluetoothHelper) {
        throw new Error('PairedBluetoothHelper plugin not available');
      }
      
      console.log('✅ DEBUG: PairedBluetoothHelper plugin is available, calling getPairedDevices...');
      const result = await PairedBluetoothHelper.getPairedDevices();
      console.log('📱 DEBUG: getPairedDevices result:', result);
      
      return result.devices;
    } catch (error) {
      console.error('❌ Failed to get paired devices:', error);
      throw error;
    }
  }

  /**
   * Check if device name suggests it's a printer (simplified version for paired devices)
   */
  private isPotentialPrinterByName(name: string | null): boolean {
    if (!name) return false;
    
    const printerKeywords = [
      'print', 'printer', 'thermal', 'receipt', 'pos', 'epson', 'citizen', 'star',
      'zebra', 'bixolon', 'custom', 'seiko', 'snbc', 'xprinter', 'goojprt'
    ];
    
    const normalizedName = name.toLowerCase();
    return printerKeywords.some(keyword => normalizedName.includes(keyword));
  }

  /**
   * Scan for Bluetooth devices (including printers)
   * ONLY shows paired devices from Android system or allows manual entry
   */
  async scanBluetoothPrinters(): Promise<BluetoothPrinterDevice[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    console.log('🔍 DEBUG: Getting paired devices for Z92 BluetoothPrint printer');
    this.isScanning = true;

    try {
      const foundDevices: BluetoothPrinterDevice[] = [];

      this.onScanProgress({
        message: 'Loading paired Bluetooth devices...',
        devices: []
      });

      // Get paired devices from Android system
      try {
        console.log('🔍 DEBUG: Calling PairedBluetoothHelper.getPairedDevices()...');
        const pairedDevices = await this.getPairedBluetoothDevices();
        console.log('📱 DEBUG: Paired devices result:', JSON.stringify(pairedDevices, null, 2));
        
        if (pairedDevices && pairedDevices.length > 0) {
          // Show ONLY paired devices
          let bluetoothPrintFound = false;
          
          for (const device of pairedDevices) {
            console.log(`✅ Adding paired device: "${device.name}" (${device.address})`);
            
            // Check if this is the BluetoothPrint device (Z92 built-in printer)
            if (device.name && device.name.toLowerCase().includes('bluetoothprint')) {
              console.log('🎯 FOUND Z92 BUILT-IN PRINTER: BluetoothPrint');
              bluetoothPrintFound = true;
            }
            
            const printerDevice: BluetoothPrinterDevice = {
              address: device.address,
              name: device.name || 'Unknown Device',
              deviceId: device.address,
              isPaired: true
            };

            foundDevices.push(printerDevice);
            this.onDeviceFound(printerDevice);
          }

          console.log(`✅ SUCCESS: Found ${foundDevices.length} paired devices`);
          if (bluetoothPrintFound) {
            console.log('🎯 Z92 Built-in printer (BluetoothPrint) is available!');
          }
          
          this.onScanProgress({
            message: bluetoothPrintFound 
              ? `Found ${foundDevices.length} paired device(s) - BluetoothPrint (Z92) detected!`
              : `Found ${foundDevices.length} paired device(s)`,
            devices: foundDevices
          });

          this.isScanning = false;
          return foundDevices;
        } else {
          console.log('⚠️ No paired devices found from PairedBluetoothHelper');
        }
        
      } catch (error: any) {
        console.error('❌ PairedBluetoothHelper error:', {
          message: error.message,
          code: error.code,
          fullError: error
        });
        console.log('⚠️ PairedBluetoothHelper failed - trying alternative method...');
      }

      // FALLBACK: Try BLE scan to find BluetoothPrint
      console.log('🔄 FALLBACK: Attempting BLE scan to find BluetoothPrint...');
      
      try {
        await this.initialize();
        
        this.onScanProgress({
          message: 'Scanning for BluetoothPrint (Z92 printer)...',
          devices: foundDevices
        });

        let scanComplete = false;
        let bluetoothPrintFound = false;

        await BleClient.requestLEScan(
          {
            allowDuplicates: false,
          },
          (result) => {
            const device = result.device;
            const deviceName = device.name || result.localName || '';
            
            // ONLY show devices with actual names (skip "Unknown Device")
            if (!deviceName || deviceName.trim() === '') {
              return; // Skip devices without names
            }
            
            console.log(`🔍 BLE Found: "${deviceName}" (${device.deviceId})`);
            
            // Check if already added
            const exists = foundDevices.find(d => d.address === device.deviceId);
            if (!exists) {
              const printerDevice: BluetoothPrinterDevice = {
                address: device.deviceId,
                name: deviceName,
                deviceId: device.deviceId,
                isPaired: false
              };

              foundDevices.push(printerDevice);
              this.onDeviceFound(printerDevice);

              // Check if this is BluetoothPrint
              if (deviceName.toLowerCase().includes('bluetoothprint')) {
                console.log('🎯 FOUND BluetoothPrint via BLE scan!');
                bluetoothPrintFound = true;
              }

              this.onScanProgress({
                message: bluetoothPrintFound 
                  ? `Found BluetoothPrint! (${foundDevices.length} device(s) total)`
                  : `Scanning... found ${foundDevices.length} named device(s)`,
                devices: foundDevices
              });
            }
          }
        );

        // Scan for 10 seconds
        await new Promise<void>((resolve) => {
          setTimeout(async () => {
            try {
              await BleClient.stopLEScan();
              console.log(`✅ BLE scan complete - found ${foundDevices.length} devices`);
              if (bluetoothPrintFound) {
                console.log('🎯 BluetoothPrint (Z92) was found in BLE scan!');
              }
              scanComplete = true;
              resolve();
            } catch (e) {
              console.log('BLE scan stop error (non-critical):', e);
              resolve();
            }
          }, 10000);
        });

      } catch (bleError: any) {
        console.error('❌ BLE scan also failed:', bleError);
      }

      // If we found devices, return them
      if (foundDevices.length > 0) {
        this.onScanProgress({
          message: `Found ${foundDevices.length} Bluetooth device(s)`,
          devices: foundDevices
        });
        
        this.isScanning = false;
        return foundDevices;
      }

      // If no devices found at all, return empty array
      console.log('⚠️ No Bluetooth devices found via any method');
      
      this.onScanProgress({
        message: 'No Bluetooth devices found. Please ensure BluetoothPrint is paired and Bluetooth is enabled.',
        devices: foundDevices
      });

      this.isScanning = false;
      return foundDevices;

    } catch (error: any) {
      console.error('❌ Bluetooth scan failed:', error);
      this.onError(`Bluetooth scan failed: ${error.message || error}`);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Heuristic to determine if a device is potentially a printer
   */
  private isPotentialPrinter(result: ScanResult): boolean {
    const name = (result.device.name || result.localName || '').toLowerCase();
    
    // Common printer keywords
    const printerKeywords = [
      'printer', 'print', 'thermal', 'receipt', 'pos', 'epson', 'zebra', 
      'citizen', 'star', 'bixolon', 'sewoo', 'custom', 'xprinter', 'goojprt'
    ];

    return printerKeywords.some(keyword => name.includes(keyword)) || 
           name.includes('80mm') || name.includes('58mm') || // Common paper sizes
           result.device.deviceId.length > 10; // Include all devices for manual filtering
  }

  /**
   * Connect to a Bluetooth printer
   */
  async connectToPrinter(device: BluetoothPrinterDevice): Promise<boolean> {
    console.log(`🔵 Connecting to printer: ${device.name} (${device.address})`);

    try {
      if (!device.deviceId) {
        throw new Error('Device ID is required for BLE connection');
      }

      // Disconnect from any previous device
      if (this.connectedDevice) {
        console.log('🔵 Disconnecting from previous device...');
        await this.disconnect();
      }

      // Connect to the device
      await BleClient.connect(device.deviceId);
      
      this.connectedDevice = device;
      console.log(`✅ Successfully connected to ${device.name}`);
      this.onDeviceConnected(device);
      return true;
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
      if (this.connectedDevice.deviceId) {
        await BleClient.disconnect(this.connectedDevice.deviceId);
      }
      
      console.log('✅ Successfully disconnected');
      this.connectedDevice = null;
      this.onDeviceDisconnected();
      return true;
    } catch (error: any) {
      console.error('❌ Disconnect error:', error);
      this.onError(`Disconnect failed: ${error.message || error}`);
      return false;
    }
  }

  /**
   * Check if connected to a printer
   */
  async isConnected(): Promise<boolean> {
    if (!this.connectedDevice || !this.connectedDevice.deviceId) {
      return false;
    }

    try {
      // Check if the device is still connected
      const connectedDevices = await BleClient.getConnectedDevices([]);
      return connectedDevices.some(device => device.deviceId === this.connectedDevice?.deviceId);
    } catch (error) {
      console.error('❌ Error checking connection status:', error);
      return false;
    }
  }

  /**
   * Get connected device
   */
  getConnectedDevice(): BluetoothPrinterDevice | null {
    return this.connectedDevice;
  }

  /**
   * Print text (limited functionality with BLE)
   * Note: This is a basic implementation - actual printing depends on the printer's BLE characteristics
   */
  async printText(text: string): Promise<boolean> {
    if (!this.connectedDevice || !this.connectedDevice.deviceId) {
      throw new Error('No printer connected');
    }

    console.log(`🖨️ Attempting to print text to ${this.connectedDevice.name}`);
    
    try {
      // This is a simplified implementation
      // Real implementation would need to discover services and characteristics
      // and write to the appropriate characteristic for the specific printer model
      
      console.log('⚠️ BLE printing requires printer-specific implementation');
      this.onError('BLE printing is not fully implemented - use thermal printer plugin instead');
      return false;
    } catch (error: any) {
      console.error('❌ Print error:', error);
      this.onError(`Print failed: ${error.message || error}`);
      return false;
    }
  }
}


