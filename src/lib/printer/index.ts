/**
 * Production-Ready Android Printer Service
 * Complete export of all printer utilities and components
 */

export { PrinterService } from './printer-service';
export { ESCPOSFormatter } from './escpos-formatter';
export {
  imageUrlToBitmap,
  generateQRCodeBitmap,
  bitmapToESCPOS,
  ICONS,
  createDecorativeLine
} from './image-utils';
export {
  type PrinterDevice,
  type PrinterCapabilities,
  type PrinterMetadata,
  type PrintJob,
  type PrintContent,
  type ReceiptData,
  type ReceiptSection,
  type ReceiptItem,
  type NetworkScanOptions,
  type ScanProgress,
  type ConnectionTestResult,
  type AndroidBridge,
  type PrinterServiceError,
  PrinterError,
  ERROR_CODES,
  PRINTER_PORTS,
  ESC_POS
} from './types';

import { PrinterService } from './printer-service';

// Re-export commonly used utilities
export const createPrinterService = () => new PrinterService();

// Utility function to check Android bridge availability
export const isAndroidBridgeAvailable = (): boolean => {
  return typeof (window as any).Android === 'object' &&
         typeof (window as any).Android.sendRawDataToPrinter === 'function';
};

// Utility function to get Android bridge
export const getAndroidBridge = (): any => {
  if (isAndroidBridgeAvailable()) {
    return (window as any).Android;
  }
  return null;
};

// Quick printer test utility
export const quickPrinterTest = async (address: string, port: number = 9100): Promise<boolean> => {
  const bridge = getAndroidBridge();
  if (bridge && typeof bridge.testPrinterConnection === 'function') {
    try {
      return await bridge.testPrinterConnection(address, port);
    } catch (error) {
      console.error('Quick printer test failed:', error);
      return false;
    }
  }
  
  // Fallback for web environment
  try {
    const response = await fetch(`http://${address}:${port}`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: AbortSignal.timeout(3000)
    });
    return true;
  } catch {
    return false;
  }
};

// Log bridge status for debugging
export const logBridgeStatus = (): void => {
  const available = isAndroidBridgeAvailable();
  console.log(`🔧 Android Bridge Status: ${available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
  
  if (available) {
    const bridge = getAndroidBridge();
    console.log('📱 Available Bridge Methods:', Object.getOwnPropertyNames(bridge));
    
    // Test bridge info if available
    if (typeof bridge.getBridgeInfo === 'function') {
      try {
        const info = bridge.getBridgeInfo();
        console.log('ℹ️ Bridge Info:', JSON.parse(info));
      } catch (error) {
        console.warn('Could not get bridge info:', error);
      }
    }
  } else {
    console.log('⚠️ Operating in web-only mode - printing functionality will be limited');
    console.log('💡 Install the Android app for full network printing capabilities');
  }
};



