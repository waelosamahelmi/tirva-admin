/**
 * Modern Star Receipt Formatter
 * Based on Star Line Mode commands - VERIFIED WORKING
 * Optimized for mC-Print3 printer at 192.168.1.106:9100
 */

import { ReceiptData } from './types';

// Star Line Mode Command constants
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

/**
 * Translate payment method to Finnish
 */
function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    'card': 'Kortti',
    'credit card': 'Kortti',
    'debit card': 'Kortti',
    'cash': 'Käteinen',
    'stripe': 'Kortti',
    'online': 'Verkkomaksu',
    'cash_or_card': 'Käteinen tai kortti',
    'cash or card': 'Käteinen tai kortti'
  };
  
  return translations[method.toLowerCase()] || method;
}

export class StarModernReceipt {
  private cmd: number[] = [];
  
  // Initialize printer with Star Line Mode
  private init(): void {
    this.cmd.push(ESC, 0x40); // Initialize
    this.cmd.push(ESC, 0x1E, 0x61, 0x00); // Enable Star Line Mode
  }
  
  // Encode text with verified Finnish character mapping (0xA0-0xA5)
  private encode(text: string): number[] {
    const bytes: number[] = [];
    
    for (const char of text) {
      switch (char) {
        case 'ä': bytes.push(0xA0); break;
        case 'ö': bytes.push(0xA1); break;
        case 'å': bytes.push(0xA2); break;
        case 'Ä': bytes.push(0xA3); break;
        case 'Ö': bytes.push(0xA4); break;
        case 'Å': bytes.push(0xA5); break;
        case '€': bytes.push(0x80); break;
        default:
          bytes.push(char.charCodeAt(0));
      }
    }
    
    return bytes;
  }
  
  private text(str: string): void {
    this.cmd.push(...this.encode(str));
  }
  
  private nl(count: number = 1): void {
    for (let i = 0; i < count; i++) this.cmd.push(LF);
  }
  
  // ESC i height width - Set character size (Star Line Mode)
  private setSize(height: number, width: number): void {
    this.cmd.push(ESC, 0x69, height, width);
  }
  
  // ESC GS a n - Set alignment (0=left, 1=center, 2=right)
  private align(n: 0 | 1 | 2): void {
    this.cmd.push(ESC, GS, 0x61, n);
  }
  
  // ESC E / ESC F - Set bold emphasis
  private bold(on: boolean): void {
    this.cmd.push(ESC, on ? 0x45 : 0x46);
  }
  
  // Generate QR code using Star Method 3 (VERIFIED WORKING)
  private qrCodeBig(url: string): void {
    const urlBytes = this.encode(url);
    const len = urlBytes.length;
    
    // ESC GS y S - Star QR Method 3
    this.cmd.push(ESC, 0x1D, 0x79, 0x53);
    this.cmd.push(0x30); // Function 0 - Model
    this.cmd.push(0x02); // Model 2
    
    this.cmd.push(ESC, 0x1D, 0x79, 0x53);
    this.cmd.push(0x31); // Function 1 - Module size
    this.cmd.push(0x0A); // Size 10 (BIGGER)
    
    this.cmd.push(ESC, 0x1D, 0x79, 0x53);
    this.cmd.push(0x32); // Function 2 - Error correction
    this.cmd.push(0x31); // Level M
    
    this.cmd.push(ESC, 0x1D, 0x79, 0x44);
    this.cmd.push(0x31); // Function D1 - Store data
    this.cmd.push(0x00); // Padding
    this.cmd.push(len % 256, Math.floor(len / 256));
    this.cmd.push(...urlBytes);
    
    this.cmd.push(ESC, 0x1D, 0x79, 0x50); // Print QR
  }
  
  // ESC d n - Feed and cut
  private cut(): void {
    this.cmd.push(ESC, 0x64, 0x02);
  }
  
  /**
   * Generate complete modern receipt
   */
  public static generate(data: ReceiptData, originalOrder?: any): Uint8Array {
    const r = new StarModernReceipt();
    r.init();
    
    // ---------------------------------------
    // HEADER - Restaurant Name & Info (VERY SMALL)
    // ---------------------------------------
    r.align(1); // Center
    r.nl();
    
    // Restaurant name - 1x1 (small, no bold)
    r.setSize(1, 1);
    r.text('antonio pizzeria');
    r.nl();
    
    // Contact info - 1x1 (small)
    r.text(data.restaurantAddress || 'Pasintie 2, 45410 Utti');
    r.nl();
    r.text(data.restaurantPhone || 'Puh: +358-3-589-9089');
    r.nl();
    
    r.text('====================');
    r.nl();
    
    // ---------------------------------------
    // ORDER NUMBER & INFO (SMALL)
    // ---------------------------------------
    // Order number - 1x1 (small)
    r.setSize(1, 1);
    r.text(`#${data.orderNumber}`);
    r.nl();
    
    // Date & Time - 1x1 (small)
    const date = data.timestamp.toLocaleDateString('fi-FI');
    const time = data.timestamp.toLocaleTimeString('fi-FI', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    r.text(`${date} klo ${time}`);
    r.nl();
    
    // Order Type - 1x1 (small)
    const orderType = data.orderType === 'delivery' ? 'KOTIINKULJETUS' : 'NOUTO';
    r.text(orderType);
    r.nl();
    
    // Payment - 1x1 (small, show actual payment method from order)
    const paymentMethod = originalOrder?.payment_method || originalOrder?.paymentMethod || data.paymentMethod;
    if (paymentMethod) {
      r.text(`Maksutapa: ${paymentMethod}`);
      r.nl();
    }
    
    r.text('====================');
    r.nl();
    
    // ---------------------------------------
    // CUSTOMER INFO (if available)
    // ---------------------------------------
    if (data.customerName || data.customerPhone || data.deliveryAddress) {
      r.align(0); // Left
      
      if (data.customerName) {
        r.text('Nimi: ');
        r.bold(true);
        r.text(data.customerName);
        r.bold(false);
        r.nl();
      }
      
      if (data.customerPhone) {
        r.text('Puh: ');
        r.bold(true);
        r.text(data.customerPhone);
        r.bold(false);
        r.nl();
      }
      
      if (data.deliveryAddress) {
        r.text('Osoite:');
        r.nl();
        r.bold(true);
        data.deliveryAddress.split('\n').forEach(line => {
          r.text('  ' + line.trim());
          r.nl();
        });
        r.bold(false);
      }
      
      r.nl();
      r.align(1); // Center
      r.text('====================');
      r.nl();
    }
    
    // ---------------------------------------
    // ITEMS
    // ---------------------------------------
    r.align(0); // Left
    r.nl();
    
    for (const item of data.items) {
      // Item name - 1x1 BOLD
      r.bold(true);
      r.setSize(1, 1);
      r.text(`${item.quantity}x ${item.name}`);
      r.nl();
      r.bold(false);
      
      // Price - 1x1 NORMAL (right aligned)
      r.align(2);
      r.text(`${item.totalPrice.toFixed(2)}€`);
      r.nl();
      r.align(0);
      
      // Toppings - 1x1
      if (item.toppings && item.toppings.length > 0) {
        r.text('  Lisatteet:');
        r.nl();
        
        item.toppings.forEach((topping: { name: string; price: number }) => {
          r.text(`    + ${topping.name}`);
          if (topping.price > 0) {
            r.align(2);
            r.text(`+${topping.price.toFixed(2)}€`);
            r.align(0);
          }
          r.nl();
        });
      }
      
      // Notes
      if (item.notes) {
        const cleanNotes = item.notes
          .split(';')
          .filter(p => !p.toLowerCase().includes('size:') && !p.toLowerCase().includes('toppings:'))
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .join('; ');
          
        if (cleanNotes) {
          r.text('  Huom: ' + cleanNotes);
          r.nl();
        }
      }
      
      r.text('- - - - - - - - -'); // Shorter dashes
      r.nl();
    }
    
    // ---------------------------------------
    // SPECIAL INSTRUCTIONS
    // ---------------------------------------
    if (originalOrder?.specialInstructions || originalOrder?.special_instructions) {
      const instructions = originalOrder.specialInstructions || originalOrder.special_instructions;
      
      r.nl();
      r.align(1);
      r.text('====================');
      r.nl();
      r.align(0);
      
      // Word wrap at 32 chars
      const words = instructions.split(' ');
      let line = '';
      
      for (const word of words) {
        if ((line + ' ' + word).length > 32) {
          if (line) {
            r.text(line);
            r.nl();
          }
          line = word;
        } else {
          line = line ? line + ' ' + word : word;
        }
      }
      
      if (line) {
        r.text(line);
        r.nl();
      }
      
      r.align(1);
    }
    
    // ---------------------------------------
    // TOTALS
    // ---------------------------------------
    r.nl();
    r.align(1);
    r.text('====================');
    r.nl();
    
    r.align(0);
    r.setSize(1, 1);
    
    // Subtotals - 1x1 BOLD labels
    if (originalOrder?.subtotal) {
      r.bold(true);
      r.text('Valisumma:');
      r.bold(false);
      r.align(2);
      r.text(`${parseFloat(originalOrder.subtotal).toFixed(2)}€`);
      r.nl();
      r.align(0);
    }
    
    if (originalOrder?.deliveryFee && parseFloat(originalOrder.deliveryFee) > 0) {
      r.bold(true);
      r.text('Toimitus:');
      r.bold(false);
      r.align(2);
      r.text(`${parseFloat(originalOrder.deliveryFee).toFixed(2)}€`);
      r.nl();
      r.align(0);
    }
    
    if (originalOrder?.smallOrderFee && parseFloat(originalOrder.smallOrderFee) > 0) {
      r.bold(true);
      r.text('Pientilaus:');
      r.bold(false);
      r.align(2);
      r.text(`${parseFloat(originalOrder.smallOrderFee).toFixed(2)}€`);
      r.nl();
      r.align(0);
    }
    
    if (originalOrder?.discount && parseFloat(originalOrder.discount) > 0) {
      r.bold(true);
      r.text('Alennus:');
      r.bold(false);
      r.align(2);
      r.text(`-${parseFloat(originalOrder.discount).toFixed(2)}€`);
      r.nl();
      r.align(0);
    }
    
    r.nl();
    // Total price - 2x2 BOLD
    r.align(0);
    r.bold(true);
    r.setSize(2, 2);
    r.text('YHTEENSA:');
    r.nl();
    r.align(2);
    r.text(`${data.total.toFixed(2)}€`);
    r.nl();
    r.bold(false);
    r.setSize(1, 1);
    
    // ---------------------------------------
    // FOOTER - QR Code & Thank You
    // ---------------------------------------
    r.nl();
    r.align(1);
    r.text('====================');
    r.nl();
    
    // Smaller text for thank you
    r.text('Kiitos tilauksestasi!');
    r.nl();
    r.text('Tervetuloa uudelleen!');
    r.nl();
    
    // BIG QR Code to website
    r.qrCodeBig('https://tirvankahvila.fi');
    r.nl(2);
    
    r.text('tirvankahvila.fi');
    r.nl(3);
    
    // Cut
    r.cut();
    
    return new Uint8Array(r.cmd);
  }
}
