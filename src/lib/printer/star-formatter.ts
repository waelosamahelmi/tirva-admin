/**
 * Star mC-Print3 / StarPRNT Formatter
 * Optimized for Star thermal printers using StarPRNT command set
 */

import { ReceiptData, ReceiptItem } from './types';

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

export interface FontSettings {
  restaurantName: { width: number; height: number };
  header: { width: number; height: number };
  orderNumber: { width: number; height: number };
  menuItems: { width: number; height: number };
  toppings: { width: number; height: number };
  totals: { width: number; height: number };
  finalTotal: { width: number; height: number };
  characterSpacing: number;
}

export class StarFormatter {
  private encoder = new TextEncoder(); // Will use ISO-8859-1 encoding
  private fontSettings: FontSettings;

  constructor(fontSettings?: Partial<FontSettings>) {
    // Default font settings
    this.fontSettings = {
      restaurantName: { width: 2, height: 2 },
      header: { width: 2, height: 2 },
      orderNumber: { width: 2, height: 3 },
      menuItems: { width: 2, height: 2 },
      toppings: { width: 1, height: 1 },
      totals: { width: 2, height: 2 },
      finalTotal: { width: 3, height: 3 },
      characterSpacing: 0,
      ...fontSettings
    };
  }

  /**
   * Format receipt data for Star printers
   */
  formatReceipt(data: ReceiptData, originalOrder?: any): Uint8Array {
    const commands: number[] = [];

    // Initialize printer
    commands.push(...this.initialize());

    // Set CP850 encoding for Finnish characters (ä, ö, å)
    commands.push(...this.setEncoding('CP850'));
    
    // Set character spacing from settings
    commands.push(...this.setCharSpacing(this.fontSettings.characterSpacing));

    // ============================================
    // RESTAURANT NAME AS TITLE
    // ============================================
    commands.push(...this.center());
    commands.push(...this.bold(true));
    commands.push(...this.textSize(this.fontSettings.restaurantName.width, this.fontSettings.restaurantName.height));
    commands.push(...this.text('pizzeria'));
    commands.push(...this.lineFeed());
    commands.push(...this.text('tirva'));
    commands.push(...this.lineFeed(2));
    commands.push(...this.bold(false));

    // ============================================
    // HEADER - RESTAURANT INFO
    // ============================================
    commands.push(...this.center());
    commands.push(...this.textSize(this.fontSettings.header.width, this.fontSettings.header.height));
    commands.push(...this.text('Pasintie 2, 45410 Utti'));
    commands.push(...this.lineFeed());
    commands.push(...this.text('+358 41 3152619'));
    commands.push(...this.lineFeed(2));
    
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed(2));

    // ============================================
    // ORDER HEADER
    // ============================================
    commands.push(...this.center());
    commands.push(...this.bold(true));
    commands.push(...this.textSize(this.fontSettings.orderNumber.width, this.fontSettings.orderNumber.height));
    commands.push(...this.text(`TILAUS #${data.orderNumber}`));
    commands.push(...this.lineFeed());
    commands.push(...this.textSize(this.fontSettings.header.width, this.fontSettings.header.height));
    commands.push(...this.bold(false));
    commands.push(...this.lineFeed());
    
    // Date and time
    commands.push(...this.text(`${data.timestamp.toLocaleDateString('fi-FI')} ${data.timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`));
    commands.push(...this.lineFeed(2));
    
    commands.push(...this.text('--------------------------------'));
    commands.push(...this.lineFeed(2));

    // ============================================
    // ORDER TYPE & PAYMENT
    // ============================================
    const orderTypeText = data.orderType === 'delivery' ? 'KOTIINKULJETUS' : 'NOUTO';
    
    commands.push(...this.center());
    commands.push(...this.bold(true));
    commands.push(...this.text(orderTypeText));
    commands.push(...this.lineFeed());
    commands.push(...this.bold(false));
    commands.push(...this.lineFeed());

    // Payment method - translated to Finnish
    if (data.paymentMethod) {
      const translatedPayment = translatePaymentMethod(data.paymentMethod);
      commands.push(...this.text(`Maksutapa: ${translatedPayment}`));
      commands.push(...this.lineFeed(2));
    }

    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed(2));

    // ============================================
    // CUSTOMER INFORMATION
    // ============================================
    if (data.customerName || data.customerPhone || data.customerEmail || data.deliveryAddress) {
      commands.push(...this.center());
      commands.push(...this.bold(true));
      commands.push(...this.underline(true));
      commands.push(...this.text('ASIAKASTIEDOT'));
      commands.push(...this.lineFeed());
      commands.push(...this.underline(false));
      commands.push(...this.bold(false));
      commands.push(...this.lineFeed());

      commands.push(...this.left());
      commands.push(...this.text('--------------------------------'));
      commands.push(...this.lineFeed(2));

      if (data.customerName) {
        commands.push(...this.bold(true));
        commands.push(...this.text('Nimi: '));
        commands.push(...this.bold(false));
        commands.push(...this.text(data.customerName));
        commands.push(...this.lineFeed(2));
      }

      if (data.customerPhone) {
        commands.push(...this.bold(true));
        commands.push(...this.text('Puh: '));
        commands.push(...this.bold(false));
        commands.push(...this.text(data.customerPhone));
        commands.push(...this.lineFeed(2));
      }

      if (data.customerEmail) {
        commands.push(...this.bold(true));
        commands.push(...this.text('Email: '));
        commands.push(...this.bold(false));
        commands.push(...this.text(data.customerEmail));
        commands.push(...this.lineFeed(2));
      }

      if (data.deliveryAddress) {
        commands.push(...this.bold(true));
        commands.push(...this.text('Osoite:'));
        commands.push(...this.lineFeed());
        commands.push(...this.bold(false));
        
        const addressLines = data.deliveryAddress.split('\n');
        addressLines.forEach(line => {
          commands.push(...this.text('  ' + line.trim()));
          commands.push(...this.lineFeed());
        });
        commands.push(...this.lineFeed());
      }

      commands.push(...this.text('--------------------------------'));
      commands.push(...this.lineFeed(2));
    }

    // ============================================
    // ITEMS SECTION
    // ============================================
    commands.push(...this.center());
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed());
    commands.push(...this.bold(true));
    commands.push(...this.underline(true));
    commands.push(...this.text('TUOTTEET'));
    commands.push(...this.lineFeed());
    commands.push(...this.underline(false));
    commands.push(...this.bold(false));
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed(2));

    commands.push(...this.left());

    if (data.items && data.items.length > 0) {
      data.items.forEach((item: ReceiptItem) => {
        // Extract size information for better display
        let displayName = item.name;
        let itemSize = 'normal';
        
        // Check if item name already contains size in parentheses
        const sizeInNameMatch = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (sizeInNameMatch) {
          displayName = sizeInNameMatch[1].trim();
          itemSize = sizeInNameMatch[2].trim();
        } else if (item.notes) {
          // Extract size from notes
          const sizeMatch = item.notes.match(/Size:\s*([^;]+)/i);
          if (sizeMatch) {
            itemSize = sizeMatch[1].trim();
            if (itemSize && itemSize !== 'normal' && itemSize !== 'regular') {
              displayName = `${displayName} (${itemSize})`;
            }
          }
        }

        // Main item line with quantity and price on same line
        const itemLine = `${item.quantity}x ${displayName}`;
        const priceLine = `${item.totalPrice.toFixed(2)}e`;
        
        commands.push(...this.bold(true));
        commands.push(...this.textSize(this.fontSettings.menuItems.width, this.fontSettings.menuItems.height));
        commands.push(...this.twoColumn(itemLine, priceLine, 48));
        commands.push(...this.textSize(this.fontSettings.header.width, this.fontSettings.header.height));
        commands.push(...this.bold(false));
        commands.push(...this.lineFeed());

        // Toppings - parse from array properly
        if (item.toppings && Array.isArray(item.toppings) && item.toppings.length > 0) {
          commands.push(...this.text('  Lisätäytteet:'));
          commands.push(...this.lineFeed());
          
          // Check for conditional pricing from originalOrder
          const originalItems = originalOrder ? (originalOrder.orderItems || originalOrder.order_items || originalOrder.items || []) : [];
          const matchingOriginalItem = originalItems.find((oi: any) => 
            (oi.menuItems?.name || oi.menu_items?.name || oi.name) === item.name.replace(/\s*\([^)]+\)$/, '')
          );
          
          const menuItemData = matchingOriginalItem ? 
            (matchingOriginalItem.menuItems || matchingOriginalItem.menu_items || matchingOriginalItem.menuItem || {}) : {};
          const hasConditionalPricing = menuItemData.hasConditionalPricing || menuItemData.has_conditional_pricing || false;
          const includedToppingsCount = menuItemData.includedToppingsCount || menuItemData.included_toppings_count || 0;
          
          // Legacy support for "Your Choice Pizza"
          const isYourChoicePizza = matchingOriginalItem && 
                   (matchingOriginalItem.menuItemId === 93 || 
                    matchingOriginalItem.menu_item_id === 93 ||
                    matchingOriginalItem.menuItems?.id === 93 ||
                    matchingOriginalItem.menu_items?.id === 93);
          
          const freeToppingCount = hasConditionalPricing ? includedToppingsCount : (isYourChoicePizza ? 4 : 0);
          let freeCount = 0;
          
          item.toppings.forEach((topping: { name: string; price: number }) => {
            let adjustedPrice = topping.price;
            
            // Apply conditional pricing
            if (freeToppingCount > 0 && topping.price > 0 && freeCount < freeToppingCount) {
              adjustedPrice = 0;
              freeCount++;
            } else {
              // Apply size-based pricing adjustments
              if (itemSize === "perhe" || itemSize === "family") {
                adjustedPrice = topping.price * 2;
              } else if ((itemSize === "large" || itemSize === "iso") && Math.abs(topping.price - 1.00) < 0.01) {
                adjustedPrice = 2.00;
              }
            }
            
            const toppingLine = `    + ${topping.name}`;
            let toppingPrice = '';
            
            if (freeToppingCount > 0 && topping.price > 0 && freeCount <= freeToppingCount && adjustedPrice === 0) {
              toppingPrice = 'ILMAINEN';
            } else if (adjustedPrice > 0) {
              toppingPrice = `+${adjustedPrice.toFixed(2)}e`;
            }
            
            if (toppingPrice) {
              commands.push(...this.twoColumn(toppingLine, toppingPrice, 48));
            } else {
              commands.push(...this.text(toppingLine));
              commands.push(...this.lineFeed());
            }
          });
          
          commands.push(...this.lineFeed());
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
            commands.push(...this.text('  Huom: '));
            commands.push(...this.text(cleanedNotes));
            commands.push(...this.lineFeed(2));
          }
        }

        commands.push(...this.text('- - - - - - - - - - - - - - - -'));
        commands.push(...this.lineFeed(2));
      });
    }

    // ============================================
    // ORDER-LEVEL SPECIAL INSTRUCTIONS
    // ============================================
    if (originalOrder?.specialInstructions || originalOrder?.special_instructions) {
      const instructions = originalOrder.specialInstructions || originalOrder.special_instructions;
      
      commands.push(...this.center());
      commands.push(...this.text('================================'));
      commands.push(...this.lineFeed());
      commands.push(...this.bold(true));
      commands.push(...this.underline(true));
      commands.push(...this.text('ERIKOISOHJEET'));
      commands.push(...this.lineFeed());
      commands.push(...this.underline(false));
      commands.push(...this.bold(false));
      commands.push(...this.text('--------------------------------'));
      commands.push(...this.lineFeed(2));
      
      commands.push(...this.left());
      commands.push(...this.bold(true));
      commands.push(...this.text('  ' + instructions));
      commands.push(...this.lineFeed());
      commands.push(...this.bold(false));
      commands.push(...this.lineFeed());
      
      commands.push(...this.text('--------------------------------'));
      commands.push(...this.lineFeed(2));
    }

    // ============================================
    // TOTALS SECTION
    // ============================================
    commands.push(...this.center());
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed());
    commands.push(...this.bold(true));
    commands.push(...this.underline(true));
    commands.push(...this.text('YHTEENVETO'));
    commands.push(...this.lineFeed());
    commands.push(...this.underline(false));
    commands.push(...this.bold(false));
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed(2));

    commands.push(...this.left());

    if (originalOrder) {
      if (originalOrder.subtotal) {
        commands.push(...this.twoColumn('Välisumma:', `${parseFloat(originalOrder.subtotal).toFixed(2)}e`, 48));
      }

      if (originalOrder.deliveryFee && parseFloat(originalOrder.deliveryFee) > 0) {
        commands.push(...this.twoColumn('Toimitusmaksu:', `${parseFloat(originalOrder.deliveryFee).toFixed(2)}e`, 48));
      }

      if (originalOrder.smallOrderFee && parseFloat(originalOrder.smallOrderFee) > 0) {
        commands.push(...this.twoColumn('Pientilauslisä:', `${parseFloat(originalOrder.smallOrderFee).toFixed(2)}e`, 48));
      }

      if (originalOrder.discount && parseFloat(originalOrder.discount) > 0) {
        commands.push(...this.twoColumn('Alennus:', `-${parseFloat(originalOrder.discount).toFixed(2)}e`, 48));
      }
      
      commands.push(...this.lineFeed());
    }

    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed());
    commands.push(...this.center());
    commands.push(...this.bold(true));
    commands.push(...this.textSize(this.fontSettings.finalTotal.width, this.fontSettings.finalTotal.height));
    commands.push(...this.text(`YHTEENSA: ${data.total.toFixed(2)}e`));
    commands.push(...this.lineFeed());
    commands.push(...this.textSize(2, 2)); // Back to normal large
    commands.push(...this.bold(false));
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed(3));

    // ============================================
    // QR CODE - Link to website
    // ============================================
    commands.push(...this.center());
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed());
    commands.push(...this.text('Skannaa QR-koodi:'));
    commands.push(...this.lineFeed(2));
    
    // Generate QR code for website
    commands.push(...this.generateQRCode('https://tirvankahvila.fi', 4));
    
    commands.push(...this.lineFeed(2));
    commands.push(...this.bold(true));
    commands.push(...this.text('tirvankahvila.fi'));
    commands.push(...this.lineFeed());
    commands.push(...this.bold(false));
    commands.push(...this.lineFeed(2));

    // ============================================
    // FOOTER
    // ============================================
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed());
    commands.push(...this.bold(true));
    commands.push(...this.textSize(2, 2));
    commands.push(...this.text('Kiitos!'));
    commands.push(...this.lineFeed());
    commands.push(...this.textSize(1, 1));
    commands.push(...this.text('Tervetuloa uudelleen!'));
    commands.push(...this.lineFeed());
    commands.push(...this.bold(false));
    commands.push(...this.text('================================'));
    commands.push(...this.lineFeed(3));

    // Cut paper (CRITICAL - stops the printer!)
    commands.push(...this.cutPaper());

    return new Uint8Array(commands);
  }

  /**
   * Initialize printer (Star command)
   */
  private initialize(): number[] {
    return [0x1B, 0x40]; // ESC @
  }

  /**
   * Set encoding to CP850 (Multilingual Latin I - supports Finnish)
   */
  private setEncoding(encoding: string): number[] {
    if (encoding === 'CP850' || encoding === 'ISO-8859-1') {
      // ESC t 16 = Code Page 850 (Multilingual Latin I - best for Finnish)
      return [0x1B, 0x74, 0x10];
    } else if (encoding === 'CP437') {
      // ESC t 0 = Code Page 437 (Nordic)
      return [0x1B, 0x74, 0x00];
    } else if (encoding === 'UTF-8') {
      // ESC GS t 32 = UTF-8 (may not work on all Star printers)
      return [0x1B, 0x1D, 0x74, 0x20];
    }
    return [];
  }

  /**
   * Set character spacing (in dots)
   */
  private setCharSpacing(dots: number): number[] {
    return [0x1B, 0x20, dots]; // ESC SP n - Set right-side character spacing
  }

  /**
   * Print bitmap image for Star printers
   */
  private printBitmap(bitmap: { width: number; height: number; data: Uint8Array }): number[] {
    const commands: number[] = [];
    const { width, height, data } = bitmap;
    
    // Star raster graphics mode
    // ESC GS ( L - Graphics data
    const bytesPerLine = Math.ceil(width / 8);
    
    // Process image line by line
    for (let y = 0; y < height; y++) {
      // Line mode raster graphics
      commands.push(0x1B, 0x58); // ESC X - Set line mode
      commands.push(bytesPerLine & 0xFF, (bytesPerLine >> 8) & 0xFF); // Width in bytes
      
      // Convert pixels to bytes for this line
      for (let x = 0; x < width; x += 8) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const px = x + bit;
          if (px < width) {
            const pixel = data[y * width + px];
            // Black pixel (0) should be 1 in the bitmap
            if (pixel < 128) {
              byte |= (1 << (7 - bit));
            }
          }
        }
        commands.push(byte);
      }
      commands.push(0x0A); // LF to advance to next line
    }
    
    return commands;
  }

  /**
   * Center align text
   */
  private center(): number[] {
    return [0x1B, 0x1D, 0x61, 0x01]; // ESC GS a 1
  }

  /**
   * Left align text
   */
  private left(): number[] {
    return [0x1B, 0x1D, 0x61, 0x00]; // ESC GS a 0
  }

  /**
   * Set bold text
   */
  private bold(enabled: boolean): number[] {
    return [0x1B, 0x45, enabled ? 0x01 : 0x00]; // ESC E n
  }

  /**
   * Set underline
   */
  private underline(enabled: boolean): number[] {
    return [0x1B, 0x2D, enabled ? 0x01 : 0x00]; // ESC - n
  }

  /**
   * Set text size (width and height magnification)
   */
  private textSize(width: number, height: number): number[] {
    const size = ((width - 1) << 4) | (height - 1);
    return [0x1B, 0x69, size & 0x07, size & 0x70]; // ESC i (Star command)
  }

  /**
   * Convert text to bytes with UTF-8 encoding
   */
  private text(str: string): number[] {
    // For CP850/CP437, use standard TextEncoder
    // The printer will handle Finnish characters correctly
    const encoded = this.encoder.encode(str);
    return Array.from(encoded);
  }

  /**
   * Line feed
   */
  private lineFeed(lines: number = 1): number[] {
    const commands: number[] = [];
    for (let i = 0; i < lines; i++) {
      commands.push(0x0A); // LF
    }
    return commands;
  }

  /**
   * Two-column formatting for item and price
   */
  private twoColumn(left: string, right: string, width: number = 48): number[] {
    const rightLen = right.length;
    const leftLen = Math.max(0, width - rightLen);
    const leftText = left.length > leftLen ? left.substring(0, leftLen - 3) + '...' : left;
    const padding = ' '.repeat(Math.max(0, width - leftText.length - rightLen));
    const line = leftText + padding + right;
    
    const commands = [...this.text(line)];
    commands.push(0x0A); // LF
    return commands;
  }

  /**
   * Generate QR code for Star printers
   */
  private generateQRCode(url: string, cellSize: number = 4): number[] {
    const commands: number[] = [];
    const urlBytes = Array.from(this.encoder.encode(url));
    const urlLength = urlBytes.length;
    
    // Star QR code command: ESC GS y S 0 model errorLevel cellSize dataLengthLow dataLengthHigh [data]
    commands.push(
      0x1B, 0x1D, 0x79, 0x53, 0x30, // QR code command header
      2, // Model 2 (recommended)
      1, // Error correction level M
      cellSize, // Cell size (1-8)
      (urlLength & 0xFF), // Data length low byte
      ((urlLength >> 8) & 0xFF) // Data length high byte
    );
    commands.push(...urlBytes);
    
    return commands;
  }

  /**
   * Cut paper (CRITICAL - stops the printer!)
   */
  private cutPaper(): number[] {
    // Star partial cut command
    return [
      0x1B, 0x64, 0x02, // Feed 2 lines before cut
      0x1B, 0x64, 0x03  // Partial cut
    ];
  }

  /**
   * Generate test receipt
   */
  generateTestReceipt(): Uint8Array {
    const commands: number[] = [];

    commands.push(...this.initialize());
    commands.push(...this.setEncoding('CP850'));
    commands.push(...this.center());
    commands.push(...this.bold(true));
    commands.push(...this.textSize(2, 2));
    commands.push(...this.text('TEST PRINT'));
    commands.push(...this.lineFeed(2));
    commands.push(...this.textSize(1, 1));
    commands.push(...this.bold(false));
    commands.push(...this.text('=============================='));
    commands.push(...this.lineFeed());
    commands.push(...this.text('Star mC-Print3 Test'));
    commands.push(...this.lineFeed());
    commands.push(...this.text('Tirvan Kahvila'));
    commands.push(...this.lineFeed(2));
    commands.push(...this.left());
    commands.push(...this.text(`Date: ${new Date().toLocaleDateString('fi-FI')}`));
    commands.push(...this.lineFeed());
    commands.push(...this.text(`Time: ${new Date().toLocaleTimeString('fi-FI')}`));
    commands.push(...this.lineFeed(2));
    commands.push(...this.text('Printer Status: OK'));
    commands.push(...this.lineFeed());
    commands.push(...this.text('UTF-8 Test: ä ö å Ä Ö Å € ñ'));
    commands.push(...this.lineFeed(3));
    commands.push(...this.cutPaper());

    return new Uint8Array(commands);
  }
}
