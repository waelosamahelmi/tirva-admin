import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Calendar,
  User,
  Phone,
  MapPin,
  Hash,
  Truck,
  Store
} from 'lucide-react';
import { ReceiptData } from '@/lib/printer/types';
import { useLanguage } from '@/lib/language-context';

interface ReceiptPreviewModalProps {
  receiptData: ReceiptData;
  originalOrder?: any; // Add original order data for additional details
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptPreviewModal({ receiptData, originalOrder, isOpen, onClose }: ReceiptPreviewModalProps) {
  const { language } = useLanguage();
  const [previewLines, setPreviewLines] = useState<string[]>([]);

  // Admin translation function with Arabic support
  const adminT = (fi: string, en: string, ar: string) => {
    if (language === "fi") return fi;
    if (language === "en") return en;
    if (language === "ar") return ar;
    return fi;
  };

  useEffect(() => {
    if (receiptData) {
      generatePreview();
    }
  }, [receiptData]);

  const generatePreview = () => {
    const lines: string[] = [];
    const lineWidth = 48; // Standard thermal printer width

    // Helper function to center text
    const centerText = (text: string) => {
      const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    // Helper function to align text left and right
    const alignText = (left: string, right: string) => {
      const maxLeft = lineWidth - right.length - 1;
      const truncatedLeft = left.length > maxLeft ? left.substring(0, maxLeft - 3) + '...' : left;
      const padding = lineWidth - truncatedLeft.length - right.length;
      return truncatedLeft + ' '.repeat(Math.max(1, padding)) + right;
    };

    // Helper function to simulate bold text (uppercase and markers)
    const makeBold = (text: string) => `**${text.toUpperCase()}**`;
    
    // Helper function to simulate underlined text
    const makeUnderlined = (text: string) => `__${text.toUpperCase()}__`;

    // Restaurant header - Enhanced formatting like ESC/POS
    lines.push(centerText(makeBold("Tirvan Kahvila")));
    lines.push('='.repeat(lineWidth));
    lines.push('');
    
    // Order info - Enhanced formatting
    lines.push(makeBold(`TILAUS #: ${receiptData.orderNumber}`));
    if (receiptData.timestamp) {
      lines.push(`${receiptData.timestamp.toLocaleDateString('fi-FI')} ${receiptData.timestamp.toLocaleTimeString('fi-FI')}`);
    }
    lines.push('');
    lines.push('='.repeat(lineWidth));
    lines.push('');

    // Customer info - Enhanced formatting
    if (receiptData.customerName || receiptData.customerPhone || receiptData.customerEmail) {
      lines.push(makeUnderlined("ASIAKASTIEDOT"));
      lines.push('-'.repeat(lineWidth));
      lines.push('');
      
      if (receiptData.customerName) {
        lines.push(makeBold(`Nimi: ${receiptData.customerName}`));
      }
      if (receiptData.customerPhone) {
        lines.push(makeBold(`Puh: ${receiptData.customerPhone}`));
      }
      if (receiptData.customerEmail) {
        const emailLine = `Email: ${receiptData.customerEmail}`;
        if (emailLine.length > 48) {
          lines.push(makeBold(emailLine.substring(0, 48)));
          lines.push(emailLine.substring(48));
        } else {
          lines.push(makeBold(emailLine));
        }
      }
      if (receiptData.deliveryAddress) {
        lines.push(makeBold(`Osoite:`));
        const addressLines = receiptData.deliveryAddress.split('\n');
        addressLines.forEach(line => {
          lines.push(line.trim());
        });
      }
      lines.push('');
      lines.push('-'.repeat(lineWidth));
      lines.push('');
    }

    // Order type and payment - Enhanced formatting
    const orderTypeText = receiptData.orderType === 'delivery' 
      ? 'KOTIINKULJETUS'
      : 'NOUTO';
    lines.push(makeBold(`Tyyppi: ${orderTypeText}`));
    
    if (receiptData.paymentMethod) {
      lines.push(makeBold(`Maksutapa: ${receiptData.paymentMethod.toUpperCase()}`));
    }
    lines.push('');
    lines.push('');

    // Items section - Enhanced formatting
    lines.push('='.repeat(lineWidth));
    lines.push(centerText(makeUnderlined("TUOTTEET")));
    lines.push('='.repeat(lineWidth));
    lines.push('');

    receiptData.items.forEach(item => {
      // Extract size information from multiple sources
      let displayName = item.name;
      let itemSize = 'normal';
      
      // Method 1: Check if item name already contains size in parentheses or as prefix
      const sizeInNameMatch = item.name.match(/^(.+?)\s*\(([^)]+)\)$/) || 
                             item.name.match(/^(perhe|family|large|iso)\s+(.+)$/i);
      
      if (sizeInNameMatch) {
        if (item.name.match(/^(.+?)\s*\(([^)]+)\)$/)) {
          // Size in parentheses: "Bolognese (perhe)"
          displayName = sizeInNameMatch[1].trim();
          itemSize = sizeInNameMatch[2].trim();
        } else {
          // Size as prefix: "perhe Bolognese"
          itemSize = sizeInNameMatch[1].trim();
          displayName = sizeInNameMatch[2].trim();
        }
      } else if (item.notes) {
        // Method 2: Extract size from notes/special instructions
        const sizeMatch = item.notes.match(/Size:\s*([^;]+)/i);
        if (sizeMatch) {
          itemSize = sizeMatch[1].trim();
          // Add size to display name if not already there
          if (itemSize && itemSize !== 'normal' && itemSize !== 'regular') {
            displayName = `${displayName} (${itemSize})`;
          }
        }
      } else if (originalOrder) {
        // Method 3: Check original order item data for size information
        const originalItems = originalOrder.orderItems || originalOrder.order_items || originalOrder.items || [];
        const matchingOriginalItem = originalItems.find((oi: any) => 
          (oi.menuItems?.name || oi.menu_items?.name || oi.name) === item.name.replace(/\s*\([^)]+\)$/, '')
        );
        
        if (matchingOriginalItem) {
          const specialInstructions = matchingOriginalItem.specialInstructions || 
                                    matchingOriginalItem.special_instructions || '';
          const sizeMatch = specialInstructions.match(/Size:\s*([^;]+)/i);
          if (sizeMatch) {
            itemSize = sizeMatch[1].trim();
            if (itemSize && itemSize !== 'normal' && itemSize !== 'regular') {
              displayName = `${displayName} (${itemSize})`;
            }
          }
        }
      }

      // Item separator with visual enhancement
      lines.push('-'.repeat(lineWidth));
      
      // Item name and quantity with size - Enhanced formatting (bold simulation)
      const itemLine = makeBold(`${item.quantity}x ${displayName}`);
      const priceLine = makeBold(`${item.totalPrice.toFixed(2)}`);
      lines.push(alignText(itemLine, priceLine));

      // Toppings/additions with size-adjusted pricing and conditional pricing logic
      if (item.toppings && item.toppings.length > 0) {
        lines.push('');
        lines.push(makeBold('  Lisätäytteet:'));
        
        // Check for conditional pricing or legacy "Your Choice Pizza" (product ID 93)
        const originalItems = originalOrder ? (originalOrder.orderItems || originalOrder.order_items || originalOrder.items || []) : [];
        const matchingOriginalItem = originalItems.find((oi: any) => 
          (oi.menuItems?.name || oi.menu_items?.name || oi.name) === item.name.replace(/\s*\([^)]+\)$/, '')
        );
        
        // Check for conditional pricing
        const menuItemData = matchingOriginalItem ? 
          (matchingOriginalItem.menuItems || matchingOriginalItem.menu_items || matchingOriginalItem.menuItem || {}) : {};
        const hasConditionalPricing = menuItemData.hasConditionalPricing || menuItemData.has_conditional_pricing || false;
        const includedToppingsCount = menuItemData.includedToppingsCount || menuItemData.included_toppings_count || 0;
        
        // Legacy support: Check if this is "Your Choice Pizza" (product ID 93)
        const isYourChoicePizza = matchingOriginalItem && 
                 (matchingOriginalItem.menuItemId === 93 || 
                  matchingOriginalItem.menu_item_id === 93 ||
                  matchingOriginalItem.menuItems?.id === 93 ||
                  matchingOriginalItem.menu_items?.id === 93);
        
        // Determine number of free toppings
        const freeToppingCount = hasConditionalPricing ? includedToppingsCount : (isYourChoicePizza ? 4 : 0);
        
        // Count how many paid toppings have been made free so far
        let freeCount = 0;
        
        item.toppings.forEach((topping, index) => {
          let adjustedPrice = topping.price;
          
          // Apply conditional pricing or legacy "first 4 free" logic
          // Only paid toppings (price > 0) count toward the free limit
          if (freeToppingCount > 0 && topping.price > 0 && freeCount < freeToppingCount) {
            adjustedPrice = 0; // Make this paid topping free
            freeCount++; // Count this as one of the free toppings
          } else {
            // Apply size-based pricing adjustments for paid toppings
            if (itemSize === "perhe" || itemSize === "family") {
              adjustedPrice = topping.price * 2; // Double price for family size
            } else if ((itemSize === "large" || itemSize === "iso") && Math.abs(topping.price - 1.00) < 0.01) {
              adjustedPrice = 2.00; // 1.00 toppings become 2.00 for large
            }
          }
          
          const toppingLine = `    + ${topping.name}`;
          let toppingPrice = '';
          
          if (freeToppingCount > 0 && topping.price > 0 && freeCount <= freeToppingCount && adjustedPrice === 0) {
            toppingPrice = 'ILMAINEN'; // Free in Finnish
          } else if (adjustedPrice > 0) {
            toppingPrice = `+${adjustedPrice.toFixed(2)}`;
          }
          
          if (toppingPrice) {
            lines.push(alignText(toppingLine, makeBold(toppingPrice)));
          } else {
            lines.push(toppingLine);
          }
        });
      }

      // Special instructions (excluding size info already shown)
      if (item.notes) {
        const cleanedNotes = item.notes
          .split(';')
          .filter(part => !part.trim().toLowerCase().startsWith('size:'))
          .filter(part => !part.trim().toLowerCase().startsWith('toppings:'))
          .map(part => part.trim())
          .filter(part => part.length > 0)
          .join('; ');
          
        if (cleanedNotes) {
          lines.push('');
          lines.push(makeBold(`  Huom: ${cleanedNotes}`));
        }
      }
      
      lines.push('');
    });

    // Order-level Special Instructions with enhanced formatting
    if (originalOrder?.specialInstructions || originalOrder?.special_instructions) {
      const instructions = originalOrder.specialInstructions || originalOrder.special_instructions;
      lines.push('');
      lines.push('='.repeat(lineWidth));
      lines.push(makeUnderlined('TILAUKSEN ERIKOISOHJEET'));
      lines.push('-'.repeat(lineWidth));
      lines.push('');
      
      // Split long instructions into multiple lines
      const words = instructions.split(' ');
      let currentLine = '';
      
      words.forEach((word: string) => {
        if ((currentLine + ' ' + word).length > 48) {
          if (currentLine) {
            lines.push(makeBold(currentLine));
            currentLine = word;
          } else {
            lines.push(makeBold(word.substring(0, 48)));
          }
        } else {
          currentLine = currentLine ? currentLine + ' ' + word : word;
        }
      });
      
      if (currentLine) {
        lines.push(makeBold(currentLine));
      }
      
      lines.push('');
      lines.push('-'.repeat(lineWidth));
      lines.push('');
    }

    // Totals with enhanced formatting
    const subtotal = originalOrder?.subtotal ? parseFloat(originalOrder.subtotal) : null;
    const deliveryFee = originalOrder?.deliveryFee ? parseFloat(originalOrder.deliveryFee) : null;
    const discount = originalOrder?.discount ? parseFloat(originalOrder.discount) : null;

    lines.push('');
    lines.push('='.repeat(lineWidth));
    lines.push(centerText(makeUnderlined('YHTEENVETO')));
    lines.push('='.repeat(lineWidth));
    lines.push('');

    // Show subtotal if it's different from total (i.e., there are additional fees)
    if (subtotal && (deliveryFee || discount)) {
      lines.push(alignText(makeBold('Välisumma:'), makeBold(`${subtotal.toFixed(2)}`)));
    }

    // Show delivery fee
    if (deliveryFee && deliveryFee > 0) {
      lines.push(alignText(makeBold('Toimitusmaksu:'), makeBold(`${deliveryFee.toFixed(2)}`)));
    }

    // Show discount
    if (discount && discount > 0) {
      lines.push(alignText(makeBold('Alennus:'), makeBold(`-${discount.toFixed(2)}`)));
    }

    lines.push('');
    lines.push('='.repeat(lineWidth));
    lines.push(alignText(makeBold('YHTEENSÄ:'), makeBold(`${receiptData.total.toFixed(2)}`)));
    lines.push('='.repeat(lineWidth));

    // Footer with enhanced thank you message
    lines.push('');
    lines.push('');
    lines.push('='.repeat(lineWidth));
    lines.push(centerText(makeBold('Kiitos tilauksestasi!')));
    lines.push(centerText(makeBold('Tervetuloa uudelleen!')));
    lines.push('='.repeat(lineWidth));
    lines.push('');

    setPreviewLines(lines);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>{adminT("Kuitin esikatselu", "Receipt Preview", "معاينة الإيصال")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Receipt Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {adminT("Tulostusnäkymä", "Print Preview", "معاينة الطباعة")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white text-black p-4 font-mono text-sm border-2 border-dashed border-gray-300 rounded-lg max-h-96 overflow-y-auto">
                <ScrollArea className="h-full">
                  {previewLines.map((line, index) => (
                    <div key={index} className="whitespace-pre">
                      {line || '\u00A0'} {/* Non-breaking space for empty lines */}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center space-x-2">
                <Hash className="w-4 h-4" />
                <span>{adminT("Tilauksen yhteenveto", "Order Summary", "ملخص الطلب")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{adminT("Tilausnumero", "Order Number", "رقم الطلب")}:</span>
                <span className="font-mono">#{receiptData.orderNumber}</span>
              </div>
              {receiptData.customerName && (
                <div className="flex justify-between">
                  <span>{adminT("Asiakas", "Customer", "العميل")}:</span>
                  <span>{receiptData.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{adminT("Tuotteiden määrä", "Items Count", "عدد المنتجات")}:</span>
                <span>{receiptData.items.length}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>{adminT("Kokonaissumma", "Total Amount", "المبلغ الإجمالي")}:</span>
                <span>{receiptData.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}



