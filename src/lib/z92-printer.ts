/**
 * Z92 Built-in Printer Service
 * Uses Android's native printing framework for the Z92's built-in "BluetoothPrint" printer
 */

import { registerPlugin } from '@capacitor/core';

export interface Z92PrinterPlugin {
  isZ92PrinterAvailable(): Promise<{ available: boolean; message: string }>;
  printText(options: { text: string }): Promise<{ success: boolean; message: string }>;
  testPrint(): Promise<{ success: boolean; message: string }>;
}

const Z92Printer = registerPlugin<Z92PrinterPlugin>('Z92Printer');

export class Z92PrinterService {
  /**
   * Check if Z92's built-in printer is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      console.log('🖨️ Z92PrinterService: Checking printer availability...');
      console.log('🖨️ Z92PrinterService: Calling Z92Printer.isZ92PrinterAvailable()...');
      
      const result = await Z92Printer.isZ92PrinterAvailable();
      
      console.log('🖨️ Z92 Printer availability result:', result);
      console.log('🖨️ Z92 Printer available:', result.available);
      console.log('🖨️ Z92 Printer message:', result.message);
      
      return result.available;
    } catch (error) {
      console.error('❌ Failed to check Z92 printer availability:', error);
      console.error('❌ Error details:', JSON.stringify(error));
      return false;
    }
  }

  /**
   * Print text using Z92's built-in printer
   */
  async print(text: string): Promise<boolean> {
    try {
      console.log('🖨️ Printing to Z92 built-in printer...');
      const result = await Z92Printer.printText({ text });
      console.log('✅ Z92 print result:', result);
      return result.success;
    } catch (error: any) {
      console.error('❌ Z92 print failed:', error);
      throw new Error(`Print failed: ${error.message || error}`);
    }
  }

  /**
   * Test print to verify printer is working
   */
  async testPrint(): Promise<boolean> {
    try {
      console.log('🧪 Sending test print to Z92...');
      const result = await Z92Printer.testPrint();
      console.log('✅ Z92 test print result:', result);
      return result.success;
    } catch (error: any) {
      console.error('❌ Z92 test print failed:', error);
      throw new Error(`Test print failed: ${error.message || error}`);
    }
  }

  /**
   * Format order receipt for printing
   */
  formatOrderReceipt(order: any): string {
    const lines: string[] = [];
    
    lines.push('================================');
    lines.push('       ORDER RECEIPT');
    lines.push('================================');
    lines.push(`Order #${order.id || order.number || 'N/A'}`);
    lines.push(`Date: ${new Date().toLocaleString()}`);
    
    // Expected delivery time
    if (order.estimatedDeliveryTime || order.estimated_delivery_time) {
      const deliveryTime = new Date(order.estimatedDeliveryTime || order.estimated_delivery_time);
      lines.push(`Expected Delivery:`);
      lines.push(`${deliveryTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
    }
    
    lines.push('--------------------------------');
    
    if (order.items && Array.isArray(order.items)) {
      lines.push('ITEMS:');
      order.items.forEach((item: any) => {
        lines.push(`${item.quantity}x ${item.name}`);
        if (item.price) {
          lines.push(`   $${item.price.toFixed(2)}`);
        }
      });
      lines.push('--------------------------------');
    }
    
    if (order.total) {
      lines.push(`TOTAL: $${order.total.toFixed(2)}`);
    }
    
    lines.push('================================');
    lines.push('     Thank you!');
    lines.push('================================');
    lines.push('');
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Print an order receipt
   */
  async printOrder(order: any): Promise<boolean> {
    try {
      const receipt = this.formatOrderReceipt(order);
      return await this.print(receipt);
    } catch (error) {
      console.error('❌ Failed to print order:', error);
      throw error;
    }
  }
}

export default Z92Printer;



