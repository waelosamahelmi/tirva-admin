/**
 * Universal Order Parser
 * Handles multiple order formats and provides robust fallback mechanisms
 * Ensures every order can be printed regardless of data structure
 */

import { ReceiptData, ReceiptSection } from './printer/types';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  totalPrice: number;
  toppings?: Array<{
    name: string;
    price: number;
  }>;
  notes?: string;
}

export class UniversalOrderParser {
  /**
   * Parse any order format into standardized ReceiptData
   */
  static parseOrder(order: any): ReceiptData {
    console.log('🔍 PARSER: Processing order:', JSON.stringify(order, null, 2));
    
    // Debug the order structure first
    this.debugOrder(order);
    
    try {
      // Try different parsing strategies
      const strategies = [
        () => this.parseSupabaseOrder(order),
        () => this.parseLegacyOrder(order),
        () => this.parseMinimalOrder(order),
        () => this.parseAlternativeFormats(order)
      ];

      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`📋 PARSER: Trying strategy ${i + 1}/${strategies.length}`);
          const result = strategies[i]();
          if (result && result.items && result.items.length > 0) {
            console.log(`✅ PARSER: Strategy ${i + 1} succeeded with ${result.items.length} items`);
            return result;
          } else {
            console.log(`⚠️ PARSER: Strategy ${i + 1} returned no items`);
          }
        } catch (error) {
          console.log(`⚠️ PARSER: Strategy ${i + 1} failed:`, error);
          continue;
        }
      }

      // If all strategies fail, create fallback but with detailed logging
      console.log('🚨 PARSER: All strategies failed, creating fallback');
      console.log('🔍 PARSER: Order keys available:', Object.keys(order));
      return this.createFallbackReceipt(order);
      
    } catch (error) {
      console.error('❌ PARSER: Critical error:', error);
      return this.createEmergencyFallback(order);
    }
  }

  /**
   * Parse Supabase format with nested menu_items
   */
  private static parseSupabaseOrder(order: any): ReceiptData {
    console.log('📋 PARSER: Trying Supabase format');
    
    // Check for both camelCase (after formatSupabaseResponse) and snake_case (raw Supabase)
    const orderItems = order.orderItems || order.order_items || [];
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      console.log('❌ PARSER: No order_items/orderItems array found or empty');
      console.log('📋 PARSER: Available order keys:', Object.keys(order));
      throw new Error('No order_items found or not an array');
    }

    // Parse items - check both camelCase and snake_case versions
    const parsedItems: OrderItem[] = orderItems.map((item: any, index: number) => {
      const menuItem = item.menuItems || item.menu_items || item.menuItem || item.menu_item || item;
      
      const parsedItem: OrderItem = {
        name: menuItem.name || "Unknown Item",
        quantity: item.quantity || 1,
        price: parseFloat(item.unitPrice || menuItem.price || '0'),
        totalPrice: parseFloat(item.totalPrice || (item.quantity * menuItem.price) || '0'),
        toppings: item.toppings || []
      };
      
      return parsedItem;
    });
    
    // Calculate totals
    const subtotal = parsedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Handle delivery fee with more variations and debug logging
    const possibleDeliveryFeeFields = [
      'deliveryFee',
      'delivery_fee',
      'deliveryfee',
      'delivery',
      'shippingFee',
      'shipping_fee',
      'shipping'
    ];
    
    let deliveryFee = 0;
    for (const field of possibleDeliveryFeeFields) {
      if (order[field] !== undefined && order[field] !== null) {
        const fee = parseFloat(String(order[field]));
        if (!isNaN(fee)) {
          deliveryFee = fee;
          console.log(`📦 PARSER: Found delivery fee ${fee} from field '${field}'`);
          break;
        }
      }
    }
    
    console.log('📦 PARSER: Final delivery fee:', deliveryFee, 'Original order fields:', order);
    const total = subtotal + deliveryFee;
    
    // Create receipt data
    const receiptData: ReceiptData = {
      header: {
        text: "Tirvan Kahvila",
        alignment: 'center',
        fontSize: 'large',
        bold: true
      },
      items: parsedItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      footer: {
        text: "Thank you for your order!",
        alignment: 'center'
      },
      total: total,
      orderNumber: order.orderNumber || order.id?.toString() || "Unknown",
      timestamp: new Date(order.createdAt || Date.now()),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      orderType: order.orderType,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus
    };
    
    // Add delivery fee section if applicable
    if (deliveryFee > 0) {
      receiptData.items.push({
        name: "Delivery Fee / Toimitusmaksu",
        quantity: 1,
        price: deliveryFee,
        totalPrice: deliveryFee
      });
    }

    return receiptData;

    console.log(`📦 PARSER: Found ${orderItems.length} order items`);

    const items: OrderItem[] = orderItems.map((item: any, index: number) => {
      console.log(`📝 PARSER: Processing order item ${index + 1}:`, JSON.stringify(item, null, 2));
      
      // Handle nested menu_items structure - try multiple possible nested structures
      // Note: Supabase returns 'menu_items' (plural) as the relation name
      const menuItem = item.menu_items || item.menu_item || item.menuItems || item.menuItem || item;
      
      console.log(`📦 PARSER: Found menuItem for item ${index + 1}:`, JSON.stringify(menuItem, null, 2));
      
      const name = menuItem?.name || item.name || this.extractItemName(item, index);
      const quantity = parseInt(item.quantity || '1');
      const unitPrice = parseFloat(item.unit_price || menuItem?.price || item.price || '0');
      const totalPrice = parseFloat(item.total_price || item.totalPrice || (quantity * unitPrice).toString());

      // Parse toppings and other info from special_instructions field
      let toppings: Array<{ name: string; price: number }> = [];
      let extractedSize: string | undefined;
      let extractedNotes: string | undefined;
      
      const specialInstructions = item.special_instructions || item.specialInstructions || '';
      
      if (specialInstructions) {
        console.log(`📋 PARSER: Processing special instructions for item ${index + 1}:`, specialInstructions);
        
        // Extract toppings from the special instructions
        toppings = this.extractToppingsFromInstructions(specialInstructions);
        
        // Extract other info
        const extractedInfo = this.extractInfoFromInstructions(specialInstructions);
        extractedSize = extractedInfo.size;
        extractedNotes = extractedInfo.notes;
        
        console.log(`✅ PARSER: Extracted ${toppings.length} toppings, size: ${extractedSize || 'none'}, notes: ${extractedNotes || 'none'}`);
      }
      
      // Fallback: also check for direct toppings field (for legacy compatibility)
      if (toppings.length === 0 && item.toppings) {
        try {
          console.log(`🍕 PARSER: Fallback - processing direct toppings for item ${index + 1}:`, item.toppings);
          const rawToppings = typeof item.toppings === 'string' 
            ? JSON.parse(item.toppings) 
            : Array.isArray(item.toppings) 
              ? item.toppings 
              : [];
              
          toppings = rawToppings.map((topping: any) => {
            if (typeof topping === 'string') {
              return { name: topping, price: 0 };
            } else if (topping && typeof topping === 'object') {
              return {
                name: topping.name || String(topping),
                price: parseFloat(topping.price || '0')
              };
            }
            return { name: 'Unknown Topping', price: 0 };
          });
          console.log(`✅ PARSER: Parsed ${toppings.length} toppings from direct field`);
        } catch (error) {
          console.log(`⚠️ PARSER: Failed to parse direct toppings for item ${index + 1}:`, error);
          toppings = [];
        }
      }

      // Include size in the item name for pizzas (similar to PrinterService logic)
      let finalName = name;
      if (extractedSize && (name.toLowerCase().includes('pizza') || name.toLowerCase().includes('piza'))) {
        // Check if size is already in the name to avoid duplication
        if (!name.toLowerCase().includes(extractedSize.toLowerCase())) {
          finalName = `${extractedSize} ${name}`;
        }
      }

      const parsedItem = {
        name: finalName,
        quantity,
        price: unitPrice,
        totalPrice,
        toppings,
        notes: extractedNotes || '' // Use extracted notes instead of raw special instructions
      };

      console.log(`✅ PARSER: Successfully parsed item ${index + 1}:`, {
        originalName: name,
        finalName: parsedItem.name,
        quantity: parsedItem.quantity,
        price: parsedItem.price,
        totalPrice: parsedItem.totalPrice,
        toppingsCount: parsedItem.toppings.length,
        toppingsNames: parsedItem.toppings.map(t => t.name),
        extractedSize,
        notes: parsedItem.notes
      });
      
      return parsedItem;
    });

    console.log(`✅ PARSER: Successfully parsed ${items.length} items from Supabase format`);
    return this.createReceiptData(order, items);
  }

  /**
   * Parse legacy format with direct items array
   */
  private static parseLegacyOrder(order: any): ReceiptData {
    console.log('📋 PARSER: Trying legacy format');
    
    const orderItems = order.items || [];
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      throw new Error('No items found or not an array');
    }

    const items: OrderItem[] = orderItems.map((item: any) => {
      const name = item.name || item.title || 'Unknown Item';
      const quantity = parseInt(item.quantity || item.qty || '1');
      const unitPrice = parseFloat(item.price || item.unitPrice || '0');
      const totalPrice = parseFloat(item.totalPrice || item.total || (quantity * unitPrice).toString());

      return {
        name,
        quantity,
        price: unitPrice,
        totalPrice,
        toppings: item.toppings ? this.parseToppings(item.toppings) : [],
        notes: item.notes || item.special_instructions || ''
      };
    });

    return this.createReceiptData(order, items);
  }

  /**
   * Parse minimal order with basic data only
   */
  private static parseMinimalOrder(order: any): ReceiptData {
    console.log('📋 PARSER: Trying minimal format');
    
    // Check if we have any recognizable item data
    const possibleItems = order.products || order.cart || order.line_items || [];
    
    if (Array.isArray(possibleItems) && possibleItems.length > 0) {
      const items: OrderItem[] = possibleItems.map((item: any, index: number) => {
        const name = item.name || item.product_name || item.title || `Item ${index + 1}`;
        const quantity = parseInt(item.quantity || item.qty || item.amount || '1');
        const price = parseFloat(item.price || item.cost || item.value || '0');

        return {
          name,
          quantity,
          price,
          totalPrice: quantity * price,
          toppings: [],
          notes: ''
        };
      });

      return this.createReceiptData(order, items);
    }

    throw new Error('No recognizable item structure found');
  }

  /**
   * Parse alternative order formats
   */
  private static parseAlternativeFormats(order: any): ReceiptData {
    console.log('📋 PARSER: Trying alternative formats');
    
    // Check for various possible item array locations
    const possibleItemArrays = [
      order.orderItems,
      order.order_items,
      order.items,
      order.lineItems,
      order.line_items,
      order.products,
      order.cart,
      order.cartItems,
      order.menuItems,
      order.menu_items
    ];

    for (const itemArray of possibleItemArrays) {
      if (Array.isArray(itemArray) && itemArray.length > 0) {
        console.log(`📋 PARSER: Found items array with ${itemArray.length} items`);
        
        try {
          const items: OrderItem[] = itemArray.map((item: any, index: number) => {
            // Try to extract item information from various possible fields
            const name = this.extractItemName(item, index);
            const quantity = this.extractQuantity(item);
            const price = this.extractPrice(item);
            const totalPrice = this.extractTotalPrice(item, quantity, price);
            const toppings = this.extractToppings(item);
            const notes = this.extractNotes(item);

            console.log(`📦 PARSER: Parsed item ${index + 1}:`, { name, quantity, price, totalPrice });

            return {
              name,
              quantity,
              price,
              totalPrice,
              toppings,
              notes
            };
          });

          if (items.length > 0) {
            return this.createReceiptData(order, items);
          }
        } catch (error) {
          console.log('⚠️ PARSER: Failed to parse items from array:', error);
          continue;
        }
      }
    }

    throw new Error('No recognizable item arrays found');
  }

  /**
   * Extract item name from various possible fields
   */
  private static extractItemName(item: any, index: number): string {
    const possibleNames = [
      item.name,
      item.title,
      item.product_name,
      item.productName,
      item.item_name,
      item.itemName,
      item.menu_item?.name,
      item.menuItem?.name,
      item.menu_items?.name,
      item.menuItems?.name
    ];

    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim()) {
        return name.trim();
      }
    }

    return `Item ${index + 1}`;
  }

  /**
   * Extract quantity from various possible fields
   */
  private static extractQuantity(item: any): number {
    const possibleQuantities = [
      item.quantity,
      item.qty,
      item.amount,
      item.count,
      item.number
    ];

    for (const qty of possibleQuantities) {
      if (qty !== undefined && qty !== null) {
        const parsed = parseInt(String(qty));
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }

    return 1;
  }

  /**
   * Extract price from various possible fields
   */
  private static extractPrice(item: any): number {
    const possiblePrices = [
      item.price,
      item.unit_price,
      item.unitPrice,
      item.cost,
      item.amount,
      item.value,
      item.menu_item?.price,
      item.menuItem?.price,
      item.menu_items?.price,
      item.menuItems?.price
    ];

    for (const price of possiblePrices) {
      if (price !== undefined && price !== null) {
        const parsed = parseFloat(String(price));
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    }

    return 0;
  }

  /**
   * Extract total price from various possible fields
   */
  private static extractTotalPrice(item: any, quantity: number, unitPrice: number): number {
    const possibleTotals = [
      item.total_price,
      item.totalPrice,
      item.total,
      item.line_total,
      item.lineTotal,
      item.subtotal
    ];

    for (const total of possibleTotals) {
      if (total !== undefined && total !== null) {
        const parsed = parseFloat(String(total));
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    }

    // Calculate from quantity and unit price
    return quantity * unitPrice;
  }

  /**
   * Extract toppings from various possible fields
   */
  private static extractToppings(item: any): Array<{ name: string; price: number }> {
    console.log(`🍕 PARSER: Extracting toppings from item:`, JSON.stringify(item, null, 2));
    
    // First try direct toppings fields
    const possibleToppings = [
      item.toppings,
      item.extras,
      item.modifications,
      item.addons,
      item.add_ons,
      item.customizations
    ];

    for (const toppings of possibleToppings) {
      if (toppings) {
        try {
          console.log(`✅ PARSER: Found direct toppings field:`, toppings);
          return this.parseToppings(toppings);
        } catch {
          continue;
        }
      }
    }

    // If no direct toppings found, extract from special instructions
    const specialInstructions = item.special_instructions || item.specialInstructions || '';
    if (specialInstructions) {
      console.log(`🔍 PARSER: Extracting toppings from special instructions:`, specialInstructions);
      const extractedToppings = this.extractToppingsFromInstructions(specialInstructions);
      if (extractedToppings.length > 0) {
        console.log(`✅ PARSER: Extracted ${extractedToppings.length} toppings from instructions:`, extractedToppings);
        return extractedToppings;
      }
    }

    console.log(`❌ PARSER: No toppings found for item`);
    return [];
  }

  /**
   * Extract notes from various possible fields
   */
  private static extractNotes(item: any): string {
    console.log(`📝 PARSER: Extracting notes from item:`, JSON.stringify(item, null, 2));
    
    const possibleNotes = [
      item.notes,
      item.special_instructions,
      item.specialInstructions,
      item.instructions,
      item.comments,
      item.remarks
    ];

    for (const notes of possibleNotes) {
      if (notes && typeof notes === 'string' && notes.trim()) {
        console.log(`🔍 PARSER: Found notes field: "${notes}"`);
        
        // If this looks like structured special instructions, extract clean notes
        if (notes.includes('Toppings:') || notes.includes('Size:') || notes.includes('Special:')) {
          const cleanNotes = this.extractCleanInstructionsFromText(notes);
          console.log(`✅ PARSER: Extracted clean notes: "${cleanNotes}"`);
          return cleanNotes || '';
        } else {
          // Return as-is if it's already clean notes
          console.log(`✅ PARSER: Using notes as-is: "${notes.trim()}"`);
          return notes.trim();
        }
      }
    }

    console.log(`❌ PARSER: No notes found for item`);
    return '';
  }

  /**
   * Extract clean instructions from structured text (excluding toppings and size)
   */
  private static extractCleanInstructionsFromText(instructions: string): string | null {
    if (!instructions) return null;
    
    // Split by semicolon and filter out toppings and size sections
    const sections = instructions.split(';').map((s: string) => s.trim());
    const cleanSections: string[] = [];
    
    sections.forEach((section: string) => {
      // Skip sections that start with "Toppings:", "Size:", or are just repetitions
      if (!section.match(/^(Toppings|Size):/i) && section.length > 0) {
        // Check if this section starts with "Special:" and extract the content
        const specialMatch = section.match(/^Special:\s*(.+)$/i);
        if (specialMatch) {
          const content = specialMatch[1].trim();
          // Only add if it's not a repetition of toppings/size info
          if (!content.match(/^(Toppings|Size):/i) && !cleanSections.includes(content)) {
            cleanSections.push(content);
          }
        } else if (!section.match(/^(Toppings|Size):/i)) {
          // Add non-special sections that aren't toppings/size
          if (!cleanSections.includes(section)) {
            cleanSections.push(section);
          }
        }
      }
    });
    
    return cleanSections.length > 0 ? cleanSections.join(', ') : null;
  }

  /**
   * Extract toppings from special instructions text
   */
  private static extractToppingsFromInstructions(instructions: string): Array<{ name: string; price: number }> {
    if (!instructions) return [];
    
    const toppings: Array<{ name: string; price: number }> = [];
    
    // Look for "Toppings: " pattern
    const toppingsMatch = instructions.match(/Toppings:\s*([^;]+)/i);
    if (toppingsMatch) {
      const toppingsText = toppingsMatch[1];
      
      // Split by comma and extract each topping
      const toppingItems = toppingsText.split(',').map(t => t.trim());
      
      for (const item of toppingItems) {
        // Check if it has a price pattern like "Extra Cheese (+€1.50)"
        const priceMatch = item.match(/^(.+?)\s*\(\+€([0-9.]+)\)$/);
        if (priceMatch) {
          toppings.push({
            name: priceMatch[1].trim(),
            price: parseFloat(priceMatch[2])
          });
        } else {
          // No price pattern, just the topping name
          toppings.push({
            name: item.trim(),
            price: 0
          });
        }
      }
    }
    
    return toppings;
  }

  /**
   * Extract other info (size, special instructions) from special instructions text
   */
  private static extractInfoFromInstructions(instructions: string): { size?: string; notes?: string } {
    if (!instructions) return {};
    
    const result: { size?: string; notes?: string } = {};
    
    // Extract size
    const sizeMatch = instructions.match(/Size:\s*([^;]+)/i);
    if (sizeMatch) {
      result.size = sizeMatch[1].trim();
    }
    
    // Extract special instructions
    const specialMatch = instructions.match(/Special:\s*([^;]+)/i);
    if (specialMatch) {
      result.notes = specialMatch[1].trim();
    }
    
    return result;
  }

  /**
   * Create fallback receipt when item parsing fails
   */
  private static createFallbackReceipt(order: any): ReceiptData {
    console.log('📋 PARSER: Creating fallback receipt');
    
    const total = this.extractTotal(order);
    const orderNumber = this.extractOrderNumber(order);
    
    if (total > 0) {
      // Create a single line item representing the entire order
      const items: OrderItem[] = [{
        name: 'Order Total',
        quantity: 1,
        price: total,
        totalPrice: total,
        toppings: [],
        notes: 'Complete order (items not itemized)'
      }];

      return this.createReceiptData(order, items);
    }

    throw new Error('Cannot create fallback - no total amount found');
  }

  /**
   * Emergency fallback when everything else fails
   */
  private static createEmergencyFallback(order: any): ReceiptData {
    console.log('🚨 PARSER: Creating emergency fallback');
    
    const orderNumber = this.extractOrderNumber(order);
    const customerName = this.extractCustomerName(order);
    const total = this.extractTotal(order) || 0;

    return {
      header: {
        text: 'Tirvan Kahvila\n================\nRauhankatu 19 c, 15110 Lahti\n+358-3589-9089',
        alignment: 'center',
        bold: true
      },
      items: [{
        name: 'ORDER DETAILS NOT AVAILABLE',
        quantity: 1,
        price: total,
        totalPrice: total,
        toppings: [],
        notes: 'Please check order details manually'
      }],
      footer: {
        text: 'Kiitos tilauksestasi!\nThank you for your order!\n\nTirvan Kahvila',
        alignment: 'center'
      },
      total,
      orderNumber,
      timestamp: new Date(),
      customerName: customerName || 'Customer',
      customerPhone: order.customer_phone || order.customerPhone,
      customerEmail: order.customer_email || order.customerEmail,
      orderType: order.order_type || order.orderType,
      deliveryAddress: order.delivery_address || order.deliveryAddress,
      paymentMethod: order.payment_method || order.paymentMethod,
      paymentStatus: order.payment_status || order.paymentStatus,
      tableNumber: order.table_number || order.tableNumber
    };
  }

  /**
   * Create standardized receipt data
   */
  private static createReceiptData(order: any, items: OrderItem[]): ReceiptData {
    const total = this.extractTotal(order) || this.calculateTotalFromItems(items);
    const orderNumber = this.extractOrderNumber(order);
    const customerName = this.extractCustomerName(order);
    const timestamp = this.extractTimestamp(order);

    // Get delivery fee for receipt
    const deliveryFee = this.extractDeliveryFee(order);
    
    // If we have a delivery fee, add it to the items
    if (deliveryFee > 0) {
      items.push({
        name: 'Delivery Fee / Toimitusmaksu',
        quantity: 1,
        price: deliveryFee,
        totalPrice: deliveryFee,
        toppings: [],
        notes: ''
      });
    }

    // Extract branch information from order if available
    const branch = order.branch || order.branches || order.branch_data;
    const branchName = branch?.name || order.branchName || order.branch_name || 'Tirvan Kahvila';
    const branchAddress = branch?.address || order.branchAddress || order.branch_address || '';
    const branchCity = branch?.city || order.branchCity || order.branch_city || '';
    const branchPostalCode = branch?.postalCode || order.branchPostalCode || order.postal_code || '';
    const branchPhone = branch?.phone || order.branchPhone || order.branch_phone || '';
    const branchEmail = branch?.email || order.branchEmail || order.branch_email || '';

    return {
      header: {
        text: `${branchName}\n================\n${branchAddress ? branchAddress + '\n' : ''}${branchPostalCode ? branchPostalCode + ' ' : ''}${branchCity}${branchCity ? '\n' : ''}${branchPhone}`,
        alignment: 'center',
        bold: true
      },
      items,
      footer: {
        text: 'Kiitos tilauksestasi!\nThank you for your order!\n\n' + branchName + '\nAvoinna: Ma-Su 10:00-20:00',
        alignment: 'center'
      },
      total,
      orderNumber,
      timestamp,
      customerName: customerName || 'Guest',
      customerPhone: order.customer_phone || order.customerPhone,
      customerEmail: order.customer_email || order.customerEmail,
      orderType: order.order_type || order.orderType,
      deliveryAddress: order.delivery_address || order.deliveryAddress,
      paymentMethod: order.payment_method || order.paymentMethod,
      paymentStatus: order.payment_status || order.paymentStatus,
      tableNumber: order.table_number || order.tableNumber,
      // Branch information
      branchName,
      branchAddress: branchAddress || 'Rauhankatu 19 c',
      branchCity: branchCity || 'Lahti',
      branchPostalCode: branchPostalCode || '15110',
      branchPhone: branchPhone || '+358-3589-9089',
      branchEmail: branchEmail || ''
    };
  }

  /**
   * Extract total amount from various possible fields
   */
  private static extractTotal(order: any): number {
    const possibleFields = [
      'total_amount', 'totalAmount', 'total', 'amount', 'grand_total', 
      'final_total', 'order_total', 'sum', 'cost', 'price'
    ];

    for (const field of possibleFields) {
      if (order[field] !== undefined && order[field] !== null) {
        const value = parseFloat(order[field]);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }

    return 0;
  }

  /**
   * Extract order number from various possible fields
   */
  private static extractOrderNumber(order: any): string {
    const possibleFields = [
      'order_number', 'orderNumber', 'order_id', 'orderId', 'id', 
      'number', 'reference', 'confirmation_number', 'receipt_number'
    ];

    for (const field of possibleFields) {
      if (order[field] !== undefined && order[field] !== null) {
        return String(order[field]);
      }
    }

    return `ORDER-${Date.now()}`;
  }

  /**
   * Extract customer name from various possible fields
   */
  private static extractCustomerName(order: any): string | null {
    const possibleFields = [
      'customer_name', 'customerName', 'customer', 'name', 
      'user_name', 'userName', 'client_name', 'buyer_name'
    ];

    for (const field of possibleFields) {
      if (order[field] && typeof order[field] === 'string' && order[field].trim()) {
        return order[field].trim();
      }
    }

    return null;
  }

  /**
   * Extract timestamp from various possible fields
   */
  private static extractTimestamp(order: any): Date {
    const possibleFields = [
      'created_at', 'createdAt', 'timestamp', 'date', 'order_date', 
      'created', 'placed_at', 'order_time'
    ];

    for (const field of possibleFields) {
      if (order[field]) {
        const date = new Date(order[field]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return new Date();
  }

  /**
   * Calculate total from items when not provided in order
   */
  private static calculateTotalFromItems(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  /**
   * Parse toppings from various formats
   */
  private static parseToppings(toppings: any): Array<{ name: string; price: number }> {
    if (!toppings) return [];
    
    try {
      const rawToppings = typeof toppings === 'string' 
        ? JSON.parse(toppings) 
        : Array.isArray(toppings) 
          ? toppings 
          : [];
          
      return rawToppings.map((topping: any) => {
        if (typeof topping === 'string') {
          return { name: topping, price: 0 };
        } else if (topping && typeof topping === 'object') {
          return {
            name: topping.name || String(topping),
            price: parseFloat(topping.price || '0')
          };
        }
        return { name: 'Unknown Topping', price: 0 };
      });
    } catch {
      return [];
    }
  }

  /**
   * Validate parsed receipt data
   */
  /**
   * Extract delivery fee from various possible fields
   */
  private static extractDeliveryFee(order: any): number {
    // Return default delivery fee (3.00) if order type is delivery and no fee is found
    const isDeliveryOrder = order.orderType === 'delivery' || 
                           order.order_type === 'delivery' || 
                           order.type === 'delivery';

    const possibleFields = [
      'deliveryFee',
      'delivery_fee',
      'deliveryfee',
      'delivery',
      'shippingFee',
      'shipping_fee',
      'shipping',
      'toimitusmaksu',
      'toimituskulut'
    ];

    // First try direct fields
    for (const field of possibleFields) {
      if (order[field] !== undefined && order[field] !== null) {
        const fee = parseFloat(String(order[field]));
        if (!isNaN(fee) && fee >= 0) {
          console.log(`📦 PARSER: Found delivery fee ${fee} from field '${field}'`);
          return fee;
        }
      }
    }

    // Try nested fields
    const nestedFields = ['delivery', 'shipping', 'order'];
    const feeFields = ['fee', 'cost', 'price', 'amount'];
    
    for (const nested of nestedFields) {
      if (order[nested] && typeof order[nested] === 'object') {
        for (const feeField of feeFields) {
          const fee = parseFloat(String(order[nested][feeField]));
          if (!isNaN(fee) && fee >= 0) {
            console.log(`📦 PARSER: Found delivery fee ${fee} from nested field '${nested}.${feeField}'`);
            return fee;
          }
        }
      }
    }

    // If this is a delivery order but no fee was found, return the default fee (3.00)
    if (isDeliveryOrder) {
      console.log('📦 PARSER: No delivery fee found, using default fee 3.00 for delivery order');
      return 3.00;
    }

    return 0;
  }

  static validateReceiptData(receipt: ReceiptData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!receipt.orderNumber) {
      warnings.push('Missing order number');
    }

    if (!receipt.items || receipt.items.length === 0) {
      errors.push('No items found');
    } else {
      // Check items
      receipt.items.forEach((item, index) => {
        if (!item.name || item.name.trim() === '') {
          warnings.push(`Item ${index + 1} has no name`);
        }
        if (item.quantity <= 0) {
          warnings.push(`Item ${index + 1} has invalid quantity: ${item.quantity}`);
        }
        if (item.price < 0) {
          warnings.push(`Item ${index + 1} has negative price: ${item.price}`);
        }
      });
    }

    if (receipt.total < 0) {
      warnings.push('Negative total amount');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Debug order structure
   */
  static debugOrder(order: any): void {
    console.log('🔍 ORDER DEBUG - Full structure:');
    console.log('📋 Top-level keys:', Object.keys(order));
    
    // Check for item arrays
    const itemArrayKeys = ['order_items', 'items', 'orderItems', 'lineItems', 'products', 'cart', 'menuItems'];
    console.log('📦 Item array analysis:');
    itemArrayKeys.forEach(key => {
      const value = order[key];
      if (Array.isArray(value)) {
        console.log(`  ✅ ${key}: Array with ${value.length} items`);
        if (value.length > 0) {
          console.log(`    📝 First item keys:`, Object.keys(value[0]));
          console.log(`    📝 First item sample:`, JSON.stringify(value[0], null, 2));
        }
      } else if (value !== undefined) {
        console.log(`  ⚠️ ${key}: ${typeof value} (not array)`);
      } else {
        console.log(`  ❌ ${key}: undefined`);
      }
    });
    
    // Check total and delivery fee fields
    console.log('💰 Total amount and delivery fee analysis:');
    const totalFields = ['total_amount', 'totalAmount', 'total', 'amount', 'grand_total', 'sum'];
    const deliveryFields = ['deliveryFee', 'delivery_fee', 'deliveryfee', 'delivery', 'shippingFee', 'shipping_fee', 'shipping'];
    
    console.log('Total fields:');
    totalFields.forEach(field => {
      if (order[field] !== undefined) {
        console.log(`  ✅ ${field}: ${order[field]} (${typeof order[field]})`);
      }
    });
    
    console.log('Delivery fee fields:');
    deliveryFields.forEach(field => {
      if (order[field] !== undefined) {
        console.log(`  ✅ ${field}: ${order[field]} (${typeof order[field]})`);
      }
    });
    
    // Check order identification
    console.log('🆔 Order identification:');
    const idFields = ['order_number', 'orderNumber', 'id', 'order_id', 'orderId'];
    idFields.forEach(field => {
      if (order[field] !== undefined) {
        console.log(`  ✅ ${field}: ${order[field]}`);
      }
    });
    
    // Check customer info
    console.log('👤 Customer information:');
    const customerFields = ['customer_name', 'customerName', 'customer', 'name', 'user_name'];
    customerFields.forEach(field => {
      if (order[field] !== undefined) {
        console.log(`  ✅ ${field}: ${order[field]}`);
      }
    });
  }
}



