/**
 * Modern ESC/POS Receipt Formatter with Graphics
 * Includes logo, QR code, proper Finnish encoding (CP850)
 * Optimized for Star mC-Print3 and ESC/POS printers
 */

import { ReceiptData, ReceiptItem } from './types';
import { 
  generateQRCodeESCPOS, 
  generateTextLogo,
  getDecorativeBorder,
  getFancySeparator,
  generateBarcodeESCPOS 
} from './receipt-graphics';

/**
 * ESC/POS Command constants
 */
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

/**
 * Translate payment method to Finnish
 */
function translatePaymentMethod(method: string): string {
  const methodLower = method.toLowerCase();
  
  const translations: Record<string, string> = {
    'card': 'Kortti',
    'credit card': 'Kortti',
    'debit card': 'Kortti',
    'cash': 'Käteinen',
    'käteinen': 'Käteinen',
    'kortti': 'Kortti',
    'stripe': 'Kortti',
    'online': 'Verkkomaksu',
    'cash_or_card': 'Käteinen tai kortti',
    'cash or card': 'Käteinen tai kortti'
  };
  
  return translations[methodLower] || method;
}

/**
 * Modern Receipt Formatter Class
 */
export class ModernReceiptFormatter {
  private commands: number[] = [];
  
  /**
   * Initialize printer
   */
  private init(): void {
    // Initialize printer
    this.commands.push(ESC, 0x40);
    // Set code page to CP850 (European)
    this.commands.push(ESC, 0x74, 0x02);
    // Set character spacing
    this.commands.push(ESC, 0x20, 0x00);
  }
  
  /**
   * Encode text with proper Finnish character support (CP850)
   */
  private encodeText(text: string): number[] {
    const bytes: number[] = [];
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      
      switch (char) {
        case 'ä': bytes.push(0x84); break;
        case 'Ä': bytes.push(0x8E); break;
        case 'ö': bytes.push(0x94); break;
        case 'Ö': bytes.push(0x99); break;
        case 'å': bytes.push(0x86); break;
        case 'Å': bytes.push(0x8F); break;
        case 'é': bytes.push(0x82); break;
        case 'È': bytes.push(0x90); break;
        case '€': bytes.push(0x65); bytes.push(0x75); bytes.push(0x72); break; // "eur" instead of €
        default:
          const code = text.charCodeAt(i);
          bytes.push(code < 128 ? code : 0x3F); // ASCII or ?
      }
    }
    
    return bytes;
  }
  
  /**
   * Add text
   */
  private text(str: string): void {
    this.commands.push(...this.encodeText(str));
  }
  
  /**
   * Add newline
   */
  private newLine(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      this.commands.push(LF);
    }
  }
  
  /**
   * Set alignment (0=left, 1=center, 2=right)
   */
  private align(alignment: number): void {
    this.commands.push(ESC, 0x61, alignment);
  }
  
  /**
   * Set text size (width: 1-8, height: 1-8)
   */
  private size(width: number, height: number): void {
    const w = Math.max(1, Math.min(8, width)) - 1;
    const h = Math.max(1, Math.min(8, height)) - 1;
    this.commands.push(GS, 0x21, (w << 4) | h);
  }
  
  /**
   * Set bold
   */
  private bold(enabled: boolean): void {
    this.commands.push(ESC, 0x45, enabled ? 0x01 : 0x00);
  }
  
  /**
   * Set underline
   */
  private underline(enabled: boolean): void {
    this.commands.push(ESC, 0x2D, enabled ? 0x01 : 0x00);
  }
  
  /**
   * Two-column text with padding
   */
  private columns(left: string, right: string, width: number = 48): void {
    const rightLen = right.length;
    const leftLen = Math.max(0, width - rightLen);
    const leftText = left.length > leftLen ? left.substring(0, leftLen - 2) + '..' : left;
    const padding = ' '.repeat(Math.max(0, width - leftText.length - rightLen));
    
    this.text(leftText + padding + right);
    this.newLine();
  }
  
  /**
   * Cut paper
   */
  private cut(): void {
    this.commands.push(GS, 0x56, 0x00); // Partial cut
  }
  
  /**
   * Generate complete modern receipt
   */
  public static generate(receiptData: ReceiptData, originalOrder?: any): Uint8Array {
    const formatter = new ModernReceiptFormatter();
    formatter.init();
    
    try {
      // ═══════════════════════════════════════
      // LOGO SECTION (Text-based)
      // ═══════════════════════════════════════
      formatter.align(1); // Center
      formatter.newLine(2);
      formatter.size(3, 3);
      formatter.bold(true);
      formatter.text('Tirvan Kahvila');
      formatter.newLine();
      formatter.bold(false);
      formatter.size(1, 1);
      formatter.newLine();
      
      // ═══════════════════════════════════════
      // RESTAURANT INFO
      // ═══════════════════════════════════════
      formatter.size(2, 2);
      formatter.text('pizzeria');
      formatter.newLine();
      formatter.size(1, 1);
      formatter.newLine();
      formatter.text('Rauhankatu 19 c');
      formatter.newLine();
      formatter.text('15110 Lahti');
      formatter.newLine();
      formatter.text('+358-3589-9089');
      formatter.newLine(2);
      
      formatter.text(getDecorativeBorder(48));
      formatter.newLine(2);
      
      // ═══════════════════════════════════════
      // ORDER NUMBER (Large and prominent)
      // ═══════════════════════════════════════
      formatter.bold(true);
      formatter.size(3, 3);
      formatter.text(`#${receiptData.orderNumber}`);
      formatter.newLine();
      formatter.bold(false);
      formatter.size(2, 2);
      formatter.newLine();
      
      // Date and time
      const date = receiptData.timestamp.toLocaleDateString('fi-FI');
      const time = receiptData.timestamp.toLocaleTimeString('fi-FI', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      formatter.text(`${date} ${time}`);
      formatter.newLine();
      formatter.size(1, 1);
      formatter.newLine();
      
      formatter.text(getFancySeparator(48));
      formatter.newLine(2);
      
      // ═══════════════════════════════════════
      // ORDER TYPE & PAYMENT
      // ═══════════════════════════════════════
      const orderTypeText = receiptData.orderType === 'delivery' 
        ? 'KOTIINKULJETUS' 
        : 'NOUTO';
      
      formatter.bold(true);
      formatter.size(2, 2);
      formatter.text(orderTypeText);
      formatter.newLine();
      formatter.size(1, 1);
      formatter.bold(false);
      formatter.newLine();
      
      if (receiptData.paymentMethod) {
        const translatedPayment = translatePaymentMethod(receiptData.paymentMethod);
        formatter.text(`Maksutapa: ${translatedPayment}`);
        formatter.newLine(2);
      }
      
      formatter.text(getDecorativeBorder(48));
      formatter.newLine(2);
      
      // ═══════════════════════════════════════
      // CUSTOMER INFORMATION
      // ═══════════════════════════════════════
      if (receiptData.customerName || receiptData.customerPhone || 
          receiptData.customerEmail || receiptData.deliveryAddress) {
        
        formatter.bold(true);
        formatter.underline(true);
        formatter.text('ASIAKASTIEDOT');
        formatter.newLine();
        formatter.underline(false);
        formatter.bold(false);
        formatter.newLine();
        formatter.align(0); // Left
        
        if (receiptData.customerName) {
          formatter.bold(true);
          formatter.text('Nimi: ');
          formatter.bold(false);
          formatter.text(receiptData.customerName);
          formatter.newLine(2);
        }
        
        if (receiptData.customerPhone) {
          formatter.bold(true);
          formatter.text('Puh: ');
          formatter.bold(false);
          formatter.text(receiptData.customerPhone);
          formatter.newLine(2);
        }
        
        if (receiptData.customerEmail) {
          formatter.bold(true);
          formatter.text('Email: ');
          formatter.bold(false);
          formatter.text(receiptData.customerEmail);
          formatter.newLine(2);
        }
        
        if (receiptData.deliveryAddress) {
          formatter.bold(true);
          formatter.text('Osoite:');
          formatter.newLine();
          formatter.bold(false);
          
          const addressLines = receiptData.deliveryAddress.split('\n');
          addressLines.forEach(line => {
            formatter.text('  ' + line.trim());
            formatter.newLine();
          });
          formatter.newLine();
        }
        
        formatter.align(1); // Center
        formatter.text(getFancySeparator(48));
        formatter.newLine(2);
      }
      
      // ═══════════════════════════════════════
      // ITEMS SECTION
      // ═══════════════════════════════════════
      formatter.bold(true);
      formatter.underline(true);
      formatter.text('TUOTTEET');
      formatter.newLine();
      formatter.underline(false);
      formatter.bold(false);
      formatter.text(getDecorativeBorder(48));
      formatter.newLine(2);
      
      formatter.align(0); // Left
      
      // Process each item
      for (const item of receiptData.items) {
        // Extract size
        let displayName = item.name;
        let itemSize = 'normal';
        
        const sizeInNameMatch = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (sizeInNameMatch) {
          displayName = sizeInNameMatch[1].trim();
          itemSize = sizeInNameMatch[2].trim();
        }
        
        // Item line (bold, large)
        const itemLine = `${item.quantity}x ${displayName}`;
        const priceLine = `${item.totalPrice.toFixed(2)}e`;
        
        formatter.bold(true);
        formatter.size(2, 2);
        formatter.columns(itemLine, priceLine, 32);
        formatter.size(1, 1);
        formatter.bold(false);
        
        // Toppings
        if (item.toppings && item.toppings.length > 0) {
          formatter.text('  Lisätäytteet:');
          formatter.newLine();
          
          // Check for conditional pricing
          const originalItems = originalOrder ? 
            (originalOrder.orderItems || originalOrder.order_items || originalOrder.items || []) : [];
          const matchingOriginalItem = originalItems.find((oi: any) => 
            (oi.menuItems?.name || oi.menu_items?.name || oi.name) === 
            item.name.replace(/\s*\([^)]+\)$/, '')
          );
          
          const menuItemData = matchingOriginalItem ? 
            (matchingOriginalItem.menuItems || matchingOriginalItem.menu_items || 
             matchingOriginalItem.menuItem || {}) : {};
          const hasConditionalPricing = menuItemData.hasConditionalPricing || 
                                       menuItemData.has_conditional_pricing || false;
          const includedToppingsCount = menuItemData.includedToppingsCount || 
                                       menuItemData.included_toppings_count || 0;
          
          const isYourChoicePizza = matchingOriginalItem && 
            (matchingOriginalItem.menuItemId === 93 || 
             matchingOriginalItem.menu_item_id === 93 ||
             matchingOriginalItem.menuItems?.id === 93 ||
             matchingOriginalItem.menu_items?.id === 93);
          
          const freeToppingCount = hasConditionalPricing ? 
            includedToppingsCount : (isYourChoicePizza ? 4 : 0);
          let freeCount = 0;
          
          item.toppings.forEach((topping: { name: string; price: number }) => {
            let adjustedPrice = topping.price;
            
            if (freeToppingCount > 0 && topping.price > 0 && freeCount < freeToppingCount) {
              adjustedPrice = 0;
              freeCount++;
            } else {
              if (itemSize === "perhe" || itemSize === "family") {
                adjustedPrice = topping.price * 2;
              } else if ((itemSize === "large" || itemSize === "iso") && 
                         Math.abs(topping.price - 1.00) < 0.01) {
                adjustedPrice = 2.00;
              }
            }
            
            const toppingLine = `    + ${topping.name}`;
            let toppingPrice = '';
            
            if (freeToppingCount > 0 && topping.price > 0 && 
                freeCount <= freeToppingCount && adjustedPrice === 0) {
              toppingPrice = 'ILMAINEN';
            } else if (adjustedPrice > 0) {
              toppingPrice = `+${adjustedPrice.toFixed(2)}e`;
            }
            
            if (toppingPrice) {
              formatter.columns(toppingLine, toppingPrice, 48);
            } else {
              formatter.text(toppingLine);
              formatter.newLine();
            }
          });
          
          formatter.newLine();
        }
        
        // Special instructions
        if (item.notes) {
          const cleanedNotes = item.notes
            .split(';')
            .filter(part => !part.trim().toLowerCase().startsWith('size:'))
            .filter(part => !part.trim().toLowerCase().startsWith('toppings:'))
            .map(part => part.trim())
            .filter(part => part.length > 0)
            .join('; ');
            
          if (cleanedNotes) {
            formatter.text('  Huom: ');
            formatter.text(cleanedNotes);
            formatter.newLine(2);
          }
        }
        
        formatter.text(getFancySeparator(48));
        formatter.newLine();
      }
      
      // ═══════════════════════════════════════
      // ORDER-LEVEL SPECIAL INSTRUCTIONS
      // ═══════════════════════════════════════
      if (originalOrder?.specialInstructions || originalOrder?.special_instructions) {
        const instructions = originalOrder.specialInstructions || 
                            originalOrder.special_instructions;
        
        formatter.newLine();
        formatter.align(1);
        formatter.bold(true);
        formatter.text('ERIKOISOHJEET');
        formatter.newLine();
        formatter.bold(false);
        formatter.align(0);
        formatter.newLine();
        
        // Word wrap
        const words = instructions.split(' ');
        let currentLine = '';
        
        words.forEach((word: string) => {
          if ((currentLine + ' ' + word).length > 46) {
            if (currentLine) {
              formatter.text('  ' + currentLine);
              formatter.newLine();
              currentLine = word;
            }
          } else {
            currentLine = currentLine ? currentLine + ' ' + word : word;
          }
        });
        
        if (currentLine) {
          formatter.text('  ' + currentLine);
          formatter.newLine();
        }
        
        formatter.newLine();
      }
      
      // ═══════════════════════════════════════
      // TOTALS SECTION
      // ═══════════════════════════════════════
      formatter.newLine();
      formatter.align(1);
      formatter.text(getDecorativeBorder(48));
      formatter.newLine();
      formatter.bold(true);
      formatter.underline(true);
      formatter.text('YHTEENVETO');
      formatter.newLine();
      formatter.underline(false);
      formatter.bold(false);
      formatter.text(getDecorativeBorder(48));
      formatter.newLine(2);
      
      formatter.align(0);
      
      if (originalOrder) {
        if (originalOrder.subtotal) {
          formatter.size(2, 2);
          formatter.columns('Välisumma:', `${parseFloat(originalOrder.subtotal).toFixed(2)}e`, 32);
          formatter.size(1, 1);
        }
        
        if (originalOrder.deliveryFee && parseFloat(originalOrder.deliveryFee) > 0) {
          formatter.size(2, 2);
          formatter.columns('Toimitusmaksu:', `${parseFloat(originalOrder.deliveryFee).toFixed(2)}e`, 32);
          formatter.size(1, 1);
        }
        
        if (originalOrder.smallOrderFee && parseFloat(originalOrder.smallOrderFee) > 0) {
          formatter.size(2, 2);
          formatter.columns('Pientilauslisä:', `${parseFloat(originalOrder.smallOrderFee).toFixed(2)}e`, 32);
          formatter.size(1, 1);
        }
        
        if (originalOrder.discount && parseFloat(originalOrder.discount) > 0) {
          formatter.size(2, 2);
          formatter.columns('Alennus:', `-${parseFloat(originalOrder.discount).toFixed(2)}e`, 32);
          formatter.size(1, 1);
        }
      }
      
      formatter.newLine();
      formatter.align(1);
      formatter.text(getDecorativeBorder(48));
      formatter.newLine();
      formatter.bold(true);
      formatter.size(4, 4);
      formatter.text(`${receiptData.total.toFixed(2)}e`);
      formatter.newLine();
      formatter.size(1, 1);
      formatter.bold(false);
      formatter.text(getDecorativeBorder(48));
      formatter.newLine(2);
      
      // ═══════════════════════════════════════
      // QR CODE (Link to website)
      // ═══════════════════════════════════════
      formatter.align(1);
      formatter.text('Skannaa QR-koodi:');
      formatter.newLine(2);
      
      // Generate QR code for website
      const qrCommands = generateQRCodeESCPOS('https://tirvankahvila.fi', 6);
      formatter.commands.push(...qrCommands);
      
      formatter.newLine(2);
      formatter.text('tirvankahvila.fi');
      formatter.newLine(3);
      
      // ═══════════════════════════════════════
      // FOOTER
      // ═══════════════════════════════════════
      formatter.text(getDecorativeBorder(48));
      formatter.newLine();
      formatter.bold(true);
      formatter.size(2, 2);
      formatter.text('Kiitos!');
      formatter.newLine();
      formatter.size(1, 1);
      formatter.bold(false);
      formatter.text('Tervetuloa uudelleen!');
      formatter.newLine();
      formatter.text(getDecorativeBorder(48));
      formatter.newLine(4);
      
      // Cut paper
      formatter.cut();
      
      return new Uint8Array(formatter.commands);
      
    } catch (error) {
      console.error('Error generating modern receipt:', error);
      throw error;
    }
  }
}



