import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

export interface DirectPrintPlugin {
  /**
   * Check if print service is available
   */
  isAvailable(): Promise<{ available: boolean; message: string }>;

  /**
   * Print text using LocalPrintService
   */
  printText(options: { text: string; jobName?: string; silentPrint?: boolean }): Promise<{ 
    success: boolean; 
    message: string; 
    jobId?: string;
    state?: number;
  }>;

  /**
   * Test print
   */
  testPrint(): Promise<{ success: boolean; message: string; jobId?: string }>;
}

const DirectPrint = registerPlugin<DirectPrintPlugin>('DirectPrint', {
  web: undefined // No web implementation
});

/**
 * Direct Print Service using Android Print Framework
 * Works with LocalPrintService on Z92 and other print services
 */
export class DirectPrintService {
  private static instance: DirectPrintService;

  private constructor() {}

  static getInstance(): DirectPrintService {
    if (!DirectPrintService.instance) {
      DirectPrintService.instance = new DirectPrintService();
    }
    return DirectPrintService.instance;
  }

  /**
   * Check if print service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if running on Android
      if (Capacitor.getPlatform() !== 'android') {
        console.log('[DirectPrint] Not running on Android platform');
        return false;
      }

      // Check if plugin is available
      if (!Capacitor.isPluginAvailable('DirectPrint')) {
        console.error('[DirectPrint] Plugin not available! Check MainActivity registration.');
        console.error('[DirectPrint] Make sure DirectPrintPlugin is registered in MainActivity.java');
        return false;
      }

      console.log('[DirectPrint] Plugin is available, checking service...');
      const result = await DirectPrint.isAvailable();
      console.log('[DirectPrint] Availability result:', result);
      return result.available;
    } catch (error) {
      console.error('[DirectPrint] Availability check failed:', error);
      console.error('[DirectPrint] Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  /**
   * Print text content
   */
  async printText(text: string, jobName: string = 'Print Job', silentPrint: boolean = false): Promise<boolean> {
    try {
      console.log('[DirectPrint] Printing:', jobName);
      console.log('[DirectPrint] Content length:', text.length);
      console.log('[DirectPrint] Silent print:', silentPrint);
      
      const result = await DirectPrint.printText({ text, jobName, silentPrint });
      
      console.log('[DirectPrint] Print result:', result);
      return result.success;
    } catch (error) {
      console.error('[DirectPrint] Print failed:', error);
      throw error;
    }
  }

  /**
   * Test print
   */
  async testPrint(): Promise<boolean> {
    try {
      // Check platform first
      if (Capacitor.getPlatform() !== 'android') {
        throw new Error('DirectPrint only works on Android devices');
      }

      // Check if plugin is available
      if (!Capacitor.isPluginAvailable('DirectPrint')) {
        throw new Error('DirectPrint plugin not implemented. Check MainActivity.java registration.');
      }

      console.log('[DirectPrint] Running test print...');
      const result = await DirectPrint.testPrint();
      console.log('[DirectPrint] Test print result:', result);
      return result.success;
    } catch (error) {
      console.error('[DirectPrint] Test print failed:', error);
      throw error;
    }
  }

  /**
   * Format order for printing in Finnish with proper thermal receipt layout
   */
  formatOrderReceipt(order: any): string {
    const lines: string[] = [];
    const lineWidth = 28; // Reduced for better margins (was 32)
    
    // Helper function to center text
    const centerText = (text: string) => {
      const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
      return ' '.repeat(padding) + text;
    };
    
    // Helper function to align text left and right
    const alignText = (left: string, right: string) => {
      const maxLeft = lineWidth - right.length - 1;
      const truncatedLeft = left.length > maxLeft ? left.substring(0, maxLeft - 2) + '..' : left;
      const padding = lineWidth - truncatedLeft.length - right.length;
      return truncatedLeft + ' '.repeat(Math.max(1, padding)) + right;
    };
    
    // Restaurant header - Large and centered
    lines.push(centerText('================'));
    lines.push(centerText('Tirvan Kahvila'));
    lines.push(centerText('================'));
    
    // Order number and date - Smaller text
    lines.push('<small>');
    lines.push(`Tilaus: #${order.orderNumber || order.id || 'N/A'}`);
    const orderDate = order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at) : new Date();
    lines.push(`${orderDate.toLocaleDateString('fi-FI')} ${orderDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`);
    
    // Expected delivery time
    if (order.estimatedDeliveryTime || order.estimated_delivery_time) {
      const deliveryTime = new Date(order.estimatedDeliveryTime || order.estimated_delivery_time);
      lines.push(`Arvioitu toimitusaika:`);
      lines.push(`${deliveryTime.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`);
    }
    lines.push('</small>');
    
    lines.push('================');
    
    // Customer info - Check multiple possible field names
    const customerName = order.customerName || order.customer_name || order.name;
    const customerPhone = order.customerPhone || order.customer_phone || order.phone;
    const customerEmail = order.customerEmail || order.customer_email || order.email;
    const deliveryAddress = order.deliveryAddress || order.delivery_address || order.address;
    
    if (customerName || customerPhone || customerEmail) {
      lines.push('<small>');
      lines.push('ASIAKASTIEDOT');
      lines.push('--------------------------');
      
      if (customerName) {
        lines.push(`Nimi: ${customerName}`);
      }
      if (customerPhone) {
        lines.push(`Puh: ${customerPhone}`);
      }
      if (customerEmail) {
        lines.push(`Email: ${customerEmail}`);
      }
      if (deliveryAddress) {
        lines.push(`Osoite:`);
        // Split long address lines
        const addressLines = deliveryAddress.split('\n');
        addressLines.forEach((line: string) => {
          if (line.length > lineWidth) {
            // Wrap long lines
            const words = line.split(' ');
            let currentLine = '';
            words.forEach((word: string) => {
              if ((currentLine + ' ' + word).length > lineWidth) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = currentLine ? currentLine + ' ' + word : word;
              }
            });
            if (currentLine) lines.push(currentLine);
          } else {
            lines.push(line);
          }
        });
      }
      lines.push('--------------------------');
      lines.push('</small>');
    }
    
    // Order type and payment
    const orderType = order.orderType === 'delivery' ? 'KOTIINKULJETUS' : 'NOUTO';
    lines.push(`Tyyppi: ${orderType}`);
    if (order.paymentMethod) {
      // Check if order has payment method name already
      let paymentText = '';
      
      if (order.paymentMethodName) {
        // Use the name from the order if available
        paymentText = order.paymentMethodName;
      } else if (order.restaurant_settings?.payment_methods || order.restaurantSettings?.payment_methods) {
        // Extract payment methods from the joined restaurant_settings
        const paymentMethods = order.restaurant_settings?.payment_methods || order.restaurantSettings?.payment_methods;
        const method = paymentMethods.find((pm: any) => pm.id === order.paymentMethod);
        if (method) {
          paymentText = method.nameFi || method.nameEn || method.name || order.paymentMethod.toUpperCase();
        } else {
          // Fallback to basic mapping for standard methods
          const paymentMap: { [key: string]: string } = {
            'card': 'KORTTI',
            'cash': 'KÄTEINEN',
            'online': 'VERKKOMAKSU'
          };
          paymentText = paymentMap[order.paymentMethod.toLowerCase()] || order.paymentMethod.toUpperCase();
        }
      } else if (order.paymentMethods && Array.isArray(order.paymentMethods)) {
        // Try to find the payment method in the settings array (legacy)
        const method = order.paymentMethods.find((pm: any) => pm.id === order.paymentMethod);
        if (method) {
          paymentText = method.nameFi || method.nameEn || method.name || order.paymentMethod.toUpperCase();
        } else {
          // Fallback to basic mapping for standard methods
          const paymentMap: { [key: string]: string } = {
            'card': 'KORTTI',
            'cash': 'KÄTEINEN',
            'online': 'VERKKOMAKSU'
          };
          paymentText = paymentMap[order.paymentMethod.toLowerCase()] || order.paymentMethod.toUpperCase();
        }
      } else {
        // Fallback to basic mapping for standard methods
        const paymentMap: { [key: string]: string } = {
          'card': 'KORTTI',
          'cash': 'KÄTEINEN',
          'online': 'VERKKOMAKSU'
        };
        paymentText = paymentMap[order.paymentMethod.toLowerCase()] || order.paymentMethod.toUpperCase();
      }
      
      lines.push(`Maksutapa: ${paymentText}`);
    }
    
    // Items section
    lines.push('================');
    lines.push(centerText('TUOTTEET'));
    lines.push('================');    
    // Process items - Check multiple possible field names
    const orderItems = order.items || order.orderItems || order.order_items || [];
    
    if (orderItems && orderItems.length > 0) {
      orderItems.forEach((item: any, index: number) => {
        if (index > 0) lines.push('-');
        
        // Get item name from various possible sources
        const menuItem = item.menuItems || item.menu_items || item.menuItem || item.menu_item;
        const itemName = item.name || menuItem?.name || 'Unknown Item';
        
        // Get quantity
        const quantity = item.quantity || 1;
        
        // Get price - check multiple sources
        const itemPrice = item.totalPrice || item.total_price || 
                         (item.price * quantity) || 
                         (menuItem?.price * quantity) || 0;
        
        // Item name with quantity and price
        const itemLine = `${quantity}x ${itemName}`;
        const priceText = `${itemPrice.toFixed(2)}€`;
        lines.push(alignText(itemLine, priceText));
        
        // Toppings/additions - Check multiple sources
        const toppings = item.toppings || 
                        item.selectedToppings || 
                        item.selected_toppings || 
                        (item.specialInstructions || item.special_instructions || '')
                          .split(';')
                          .filter((s: string) => s.trim().toLowerCase().startsWith('toppings:'))
                          .map((s: string) => s.replace(/^toppings:/i, '').trim())
                          .flatMap((s: string) => s.split(',').map((t: string) => ({ name: t.trim(), price: 0 })));
        
        if (toppings && toppings.length > 0) {
          lines.push('  Lisataytteet:');
          toppings.forEach((topping: any) => {
            const toppingName = typeof topping === 'string' ? topping : (topping.name || topping.toppingName || topping.topping_name);
            const toppingPrice = typeof topping === 'object' && (topping.price > 0 || topping.additionalPrice > 0)
              ? (topping.price || topping.additionalPrice || 0)
              : 0;
            
            if (toppingPrice > 0) {
              const toppingPriceText = `+${toppingPrice.toFixed(2)}€`;
              lines.push(alignText(`  + ${toppingName}`, toppingPriceText));
            } else {
              lines.push(`  + ${toppingName}`);
            }
          });
        }
        
        // Special instructions for this item
        const itemNotes = item.notes || item.specialInstructions || item.special_instructions;
        if (itemNotes) {
          // Filter out size and topping info that's already displayed
          const cleanedNotes = itemNotes
            .split(';')
            .filter((part: string) => 
              !part.trim().toLowerCase().startsWith('size:') &&
              !part.trim().toLowerCase().startsWith('toppings:')
            )
            .map((part: string) => part.trim())
            .filter((part: string) => part.length > 0)
            .join('; ');
            
          if (cleanedNotes) {
            lines.push(`  Huom: ${cleanedNotes}`);
          }
        }
      });
    } else {
      lines.push('Ei tuotteita');
    }
    
    // Order-level special instructions
    const orderInstructions = order.specialInstructions || order.special_instructions;
    if (orderInstructions) {
      lines.push('================');
      lines.push('ERIKOISOHJEET');
      lines.push('--------------------------');
      // Wrap long instructions
      const words = orderInstructions.split(' ');
      let currentLine = '';
      words.forEach((word: string) => {
        if ((currentLine + ' ' + word).length > lineWidth) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      });
      if (currentLine) lines.push(currentLine);
      lines.push('--------------------------');
    }
    
    // Totals section
    lines.push('================');
    lines.push(centerText('YHTEENVETO'));
    lines.push('================');
    
    // Calculate or retrieve total from multiple possible sources
    let total = 0;
    let totalWasCalculated = false; // Track if we calculated or got from database
    
    // Method 1: Check direct total fields (these already include delivery fee and discount)
    if (order.total) {
      total = parseFloat(order.total);
    } else if (order.totalAmount || order.total_amount) {
      total = parseFloat(order.totalAmount || order.total_amount);
    } else if (order.totalPrice || order.total_price) {
      total = parseFloat(order.totalPrice || order.total_price);
    } else {
      // Method 2: Calculate from items if no total field exists
      console.log('?? No total field found, calculating from items...');
      totalWasCalculated = true;
      if (orderItems && orderItems.length > 0) {
        orderItems.forEach((item: any) => {
          const menuItem = item.menuItems || item.menu_items || item.menuItem || item.menu_item;
          const quantity = item.quantity || 1;
          const itemPrice = item.totalPrice || item.total_price || 
                           (item.price * quantity) || 
                           (menuItem?.price * quantity) || 0;
          total += parseFloat(itemPrice);
        });
        console.log(`? Calculated total from items: ${total}€`);
      }
    }
    
    // Show subtotal if different from total
    const subtotal = order.subtotal ? parseFloat(order.subtotal) : null;
    const deliveryFee = order.deliveryFee || order.delivery_fee ? parseFloat(order.deliveryFee || order.delivery_fee) : null;
    const discount = order.discount ? parseFloat(order.discount) : null;
    
    if (subtotal && (deliveryFee || discount)) {
      lines.push(alignText('Valisumma:', `${subtotal.toFixed(2)}€`));
    }
    
    if (deliveryFee && deliveryFee > 0) {
      lines.push(alignText('Toimitusmaksu:', `${deliveryFee.toFixed(2)}€`));
      // Only add delivery fee if we calculated total from items (not from database)
      if (totalWasCalculated) {
        total += deliveryFee;
      }
    }
    
    if (discount && discount > 0) {
      lines.push(alignText('Alennus:', `-${discount.toFixed(2)}€`));
      // Only subtract discount if we calculated total from items (not from database)
      if (totalWasCalculated) {
        total -= discount;
      }
    }
    
    lines.push('================');
    lines.push(alignText('YHTEENSA:', `${total.toFixed(2)}€`));
    lines.push('================');
    
    // Footer
    lines.push(centerText('Kiitos tilauksestasi!'));
    lines.push(centerText('Tervetuloa uudelleen!'));
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Print order receipt
   */
  async printOrder(order: any, silentPrint: boolean = true): Promise<boolean> {
    // Fetch payment methods from restaurant settings if not already in order
    if (!order.restaurant_settings?.payment_methods && !order.restaurantSettings?.payment_methods && !order.paymentMethods) {
      try {
        const { supabase } = await import('./supabase-client');
        const { data: settings } = await supabase
          .from('restaurant_settings')
          .select('payment_methods')
          .limit(1)
          .single();
        
        if (settings?.payment_methods) {
          order.restaurant_settings = { payment_methods: settings.payment_methods };
        }
      } catch (error) {
        console.warn('[DirectPrint] Could not fetch payment methods:', error);
        // Continue with printing even if fetch fails
      }
    }
    
    const receiptText = this.formatOrderReceipt(order);
    // Orders should auto-print with silentPrint=true to skip dialog
    return this.printText(receiptText, `Order #${order.id}`, silentPrint);
  }
}

export const directPrint = DirectPrintService.getInstance();
