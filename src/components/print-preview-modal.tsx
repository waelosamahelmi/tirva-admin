import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Eye, 
  Printer, 
  Send, 
  Settings, 
  FileText, 
  Scissors,
  QrCode,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { PrinterDevice, PrinterConnectionManager, ReceiptData, ESCPOSFormatter } from '@/lib/printer';
import { useToast } from '@/hooks/use-toast';

interface PrintPreviewModalProps {
  printerManager: PrinterConnectionManager;
  receiptData: ReceiptData;
  children: React.ReactNode;
  onPrintSuccess?: () => void;
  autoSelectPrinter?: boolean;
}

export function PrintPreviewModal({ 
  printerManager, 
  receiptData, 
  children,
  onPrintSuccess,
  autoSelectPrinter = true
}: PrintPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [connectedPrinters, setConnectedPrinters] = useState<PrinterDevice[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewLines, setPreviewLines] = useState<string[]>([]);
  
  // Print options
  const [printOptions, setPrintOptions] = useState({
    copies: 1,
    cutPaper: true,
    includeQR: true,
    paperWidth: 80
  });

  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const printers = printerManager.getConnectedPrinters();
    setConnectedPrinters(printers);

    // Auto-select default printer or first available
    if (autoSelectPrinter && printers.length > 0) {
      const defaultPrinter = printers.find(p => {
        const settings = localStorage.getItem(`printer_settings_${p.id}`);
        if (settings) {
          try {
            const parsed = JSON.parse(settings);
            return parsed.defaultPrinter;
          } catch {
            return false;
          }
        }
        return false;
      });

      setSelectedPrinterId(defaultPrinter?.id || printers[0].id);
    }
  }, [isOpen, printerManager, autoSelectPrinter]);

  useEffect(() => {
    // Generate preview when receipt data or options change
    generatePreview();
  }, [receiptData, printOptions]);

  const generatePreview = async () => {
    try {
      const capabilities = {
        paperWidth: printOptions.paperWidth,
        supportsImages: true,
        supportsCLahting: printOptions.cutPaper,
        supportsQR: printOptions.includeQR,
        supportsBarcode: true,
        maxLineLength: printOptions.paperWidth === 58 ? 32 : printOptions.paperWidth === 80 ? 48 : 56
      };

      // Generate text preview (simplified representation)
      const lines = generateTextPreview(receiptData, capabilities);
      setPreviewLines(lines);

    } catch (error) {
      console.error('Failed to generate preview:', error);
      setPreviewLines(['Error generating preview']);
    }
  };

  const generateTextPreview = (receipt: ReceiptData, capabilities: any): string[] => {
    const lines: string[] = [];
    const lineWidth = capabilities.maxLineLength;

    // Helper function to center text
    const centerText = (text: string) => {
      const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
      return ' '.repeat(padding) + text;
    };

    // Helper function to justify text
    const justifyText = (left: string, right: string) => {
      const totalUsed = left.length + right.length;
      const spacesNeeded = Math.max(1, lineWidth - totalUsed);
      return left + ' '.repeat(spacesNeeded) + right;
    };

    // Header
    if (receipt.header.text) {
      lines.push('');
      if (receipt.header.alignment === 'center') {
        lines.push(centerText(receipt.header.text.toUpperCase()));
      } else {
        lines.push(receipt.header.text.toUpperCase());
      }
      lines.push('');
    }

    // Order info
    lines.push(justifyText('Order:', receipt.orderNumber));
    lines.push(justifyText('Date:', new Date(receipt.timestamp).toLocaleString()));
    lines.push('-'.repeat(lineWidth));

    // Items
    receipt.items.forEach(item => {
      const itemLine = justifyText(
        `${item.quantity}x ${item.name}`,
        `$${(item.price * item.quantity).toFixed(2)}`
      );
      lines.push(itemLine);

      // Unit price if quantity > 1
      if (item.quantity > 1) {
        lines.push(`  @ $${item.price.toFixed(2)} each`);
      }

      // Toppings
      if (item.toppings && item.toppings.length > 0) {
        item.toppings.forEach(topping => {
          lines.push(`  + ${topping}`);
        });
      }
    });

    // Total
    lines.push('-'.repeat(lineWidth));
    lines.push('');
    lines.push(centerText('** TOTAL **'));
    lines.push(centerText(`$${receipt.total.toFixed(2)}`));
    lines.push('');

    // Footer
    if (receipt.footer.text) {
      lines.push(centerText(receipt.footer.text));
      lines.push('');
    }

    // QR Code placeholder
    if (printOptions.includeQR) {
      lines.push(centerText('[QR CODE]'));
      lines.push(centerText(receipt.orderNumber));
      lines.push('');
    }

    // Cut indicator
    if (printOptions.cutPaper) {
      lines.push(centerText('✂️ - - - - - - - - - -'));
    }

    return lines;
  };

  const handlePrint = async () => {
    if (!selectedPrinterId) {
      toast({
        title: "No Printer Selected",
        description: "Please select a printer before printing",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsPrinting(true);

      const selectedPrinter = connectedPrinters.find(p => p.id === selectedPrinterId);
      if (!selectedPrinter) {
        throw new Error('Selected printer not found');
      }

      // Print the specified number of copies
      for (let i = 0; i < printOptions.copies; i++) {
        await printerManager.printReceipt(selectedPrinterId, receiptData);
        
        // Small delay between copies
        if (i < printOptions.copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast({
        title: "Print Successful",
        description: `Receipt printed successfully${printOptions.copies > 1 ? ` (${printOptions.copies} copies)` : ''}`,
      });

      onPrintSuccess?.();
      setIsOpen(false);

    } catch (error) {
      toast({
        title: "Print Failed",
        description: error instanceof Error ? error.message : 'Failed to print receipt',
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Print Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Printer Selection */}
          <div className="space-y-2">
            <Label>Select Printer</Label>
            {connectedPrinters.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                <Printer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No printers connected</p>
                <p className="text-sm">Connect a printer to print receipts</p>
              </div>
            ) : (
              <Select value={selectedPrinterId} onValueChange={setSelectedPrinterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a printer" />
                </SelectTrigger>
                <SelectContent>
                  {connectedPrinters.map(printer => (
                    <SelectItem key={printer.id} value={printer.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          printer.status === 'idle' ? 'bg-green-500' :
                          printer.status === 'printing' ? 'bg-blue-500' :
                          printer.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        {printer.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Print Options */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <h3 className="font-medium">Print Options</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Copies */}
                <div>
                  <Label className="text-sm">Copies</Label>
                  <Select 
                    value={printOptions.copies.toString()} 
                    onValueChange={(value) => setPrintOptions(prev => ({ ...prev, copies: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Paper Width */}
                <div>
                  <Label className="text-sm">Paper Width</Label>
                  <Select 
                    value={printOptions.paperWidth.toString()} 
                    onValueChange={(value) => setPrintOptions(prev => ({ ...prev, paperWidth: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58">58mm</SelectItem>
                      <SelectItem value="80">80mm</SelectItem>
                      <SelectItem value="112">112mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {/* Cut Paper */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    <Label className="text-sm">Auto Cut Paper</Label>
                  </div>
                  <Switch
                    checked={printOptions.cutPaper}
                    onCheckedChange={(checked) => setPrintOptions(prev => ({ ...prev, cutPaper: checked }))}
                  />
                </div>

                {/* Include QR Code */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    <Label className="text-sm">Include QR Code</Label>
                  </div>
                  <Switch
                    checked={printOptions.includeQR}
                    onCheckedChange={(checked) => setPrintOptions(prev => ({ ...prev, includeQR: checked }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4" />
                <h3 className="font-medium">Receipt Preview</h3>
                <Badge variant="outline" className="text-xs">
                  {printOptions.paperWidth}mm
                </Badge>
              </div>

              <div className="bg-white border rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <div className="whitespace-pre-line text-black">
                  {previewLines.join('\n')}
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>Order: {receiptData.orderNumber}</span>
                <span>Total: ${receiptData.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePrint}
              disabled={!selectedPrinterId || isPrinting || connectedPrinters.length === 0}
              className="flex-1"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Printing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Print{printOptions.copies > 1 ? ` (${printOptions.copies}x)` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Quick print button component
interface QuickPrintButtonProps {
  printerManager: PrinterConnectionManager;
  receiptData: ReceiptData;
  onPrintSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function QuickPrintButton({ 
  printerManager, 
  receiptData, 
  onPrintSuccess,
  variant = 'default',
  size = 'default',
  className
}: QuickPrintButtonProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const handleQuickPrint = async () => {
    const connectedPrinters = printerManager.getConnectedPrinters();
    
    if (connectedPrinters.length === 0) {
      toast({
        title: "No Printers Available",
        description: "Connect a printer before printing",
        variant: "destructive"
      });
      return;
    }

    // Find default printer or use first available
    const defaultPrinter = connectedPrinters.find(p => {
      const settings = localStorage.getItem(`printer_settings_${p.id}`);
      if (settings) {
        try {
          const parsed = JSON.parse(settings);
          return parsed.defaultPrinter;
        } catch {
          return false;
        }
      }
      return false;
    });

    const targetPrinter = defaultPrinter || connectedPrinters[0];

    try {
      setIsPrinting(true);
      await printerManager.printReceipt(targetPrinter.id, receiptData);
      
      toast({
        title: "Print Successful",
        description: `Receipt printed to ${targetPrinter.name}`,
      });

      onPrintSuccess?.();
    } catch (error) {
      toast({
        title: "Print Failed",
        description: error instanceof Error ? error.message : 'Failed to print receipt',
        variant: "destructive"
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleQuickPrint}
      disabled={isPrinting}
      className={className}
    >
      {isPrinting ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Printing...
        </>
      ) : (
        <>
          <Printer className="w-4 h-4 mr-2" />
          Quick Print
        </>
      )}
    </Button>
  );
}



