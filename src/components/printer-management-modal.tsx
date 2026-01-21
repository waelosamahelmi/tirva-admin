import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrinter } from '@/lib/printer-context';
import { useToast } from '@/hooks/use-toast';
import { 
  Wifi, 
  Printer, 
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Plus,
  Power,
  Loader2,
  Smartphone,
  Cloud
} from 'lucide-react';
import { PrinterDevice } from '@/lib/printer/types';
import { useAndroid } from '@/lib/android-context';
import { PrinterFontSettings } from '@/components/printer-font-settings';
import { CloudPRNTManagement } from '@/components/cloudprnt-management';
import { usePrinterSettings, useUpdatePrinterSettings, PrinterMode } from '@/hooks/use-printer-settings';

interface PrinterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterManagementModal({ isOpen, onClose }: PrinterManagementModalProps) {
  const { toast } = useToast();
  const { isAndroid } = useAndroid();
  
  const {
    printers,
    activePrinter,
    isConnecting,
    addManualPrinter,
    removePrinter,
    connectToPrinter,
    disconnectFromPrinter,
    testPrint,
  } = usePrinter();
  
  const [manualIp, setManualIp] = useState('192.168.1.233');
  const [manualPort, setManualPort] = useState('9100');
  const [manualName, setManualName] = useState('');
  const [manualPrinterType, setManualPrinterType] = useState<'star' | 'escpos'>('star');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null);
  const [isAddingManualPrinter, setIsAddingManualPrinter] = useState(false);
  const [expandedPrinterId, setExpandedPrinterId] = useState<string | null>(null);
  
  // Get printer settings from Supabase
  const { data: printerSettings } = usePrinterSettings();
  const updateSettings = useUpdatePrinterSettings();
  
  // Local state for immediate UI updates
  const [localActiveTab, setLocalActiveTab] = useState<string>('direct');
  
  // Sync local state with Supabase data
  useEffect(() => {
    if (printerSettings?.printer_mode) {
      setLocalActiveTab(printerSettings.printer_mode);
    }
  }, [printerSettings]);
  
  const handleTabChange = (value: string) => {
    if (value === 'direct' || value === 'network' || value === 'cloudprnt') {
      // Update UI immediately
      setLocalActiveTab(value);
      // Save to database in background
      updateSettings.mutate({ printer_mode: value });
    }
  };

  const handleAddManualPrinter = async () => {
    if (!manualIp.trim()) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IP address",
        variant: "destructive",
      });
      return;
    }

    setIsAddingManualPrinter(true);
    
    try {
      console.log(`🔄 Adding manual printer: ${manualIp.trim()}:${parseInt(manualPort) || 9100}`);
      
      await addManualPrinter(
        manualIp.trim(),
        parseInt(manualPort) || 9100,
        manualName.trim() || undefined,
        manualPrinterType
      );
      
      // Reset form
      setManualIp('192.168.1.233');
      setManualPort('9100');
      setManualName('');
      
      toast({
        title: "Printer Added",
        description: "Manual printer has been added successfully",
      });
    } catch (error: any) {
      console.error('Failed to add manual printer:', error);
      toast({
        title: "Failed to Add Printer",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAddingManualPrinter(false);
    }
  };

  const handleConnectPrinter = async (printer: PrinterDevice) => {
    try {
      setSelectedPrinterId(printer.id);
      await connectToPrinter(printer);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setSelectedPrinterId(null);
    }
  };

  const handleDisconnectPrinter = async (printer: PrinterDevice) => {
    try {
      await disconnectFromPrinter(printer.id);
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleRemovePrinter = async (printer: PrinterDevice) => {
    try {
      await removePrinter(printer.id);
    } catch (error) {
      console.error('Remove printer failed:', error);
    }
  };
  
  const handleTestPrint = async (printer: PrinterDevice) => {
    try {
      await testPrint(printer.id);
      toast({
        title: "Test Print Successful",
        description: `Test print sent to ${printer.name}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Test print failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Test Print Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (printer: PrinterDevice) => {
    if (printer.isConnected) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (printer.status === 'error') {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (printer: PrinterDevice) => {
    if (printer.isConnected) {
      return <Badge className="bg-green-100 text-green-800">Connected</Badge>;
    } else if (printer.status === 'error') {
      return <Badge variant="destructive">Error</Badge>;
    } else {
      return <Badge variant="secondary">Offline</Badge>;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl h-screen max-h-screen flex flex-col ${isAndroid ? 'touch-pan-y overscroll-contain' : 'max-h-[90vh]'}`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Printer Management
            <Badge variant="outline" className="ml-auto text-xs">
              {localActiveTab === 'direct' && <><Smartphone className="w-3 h-3 mr-1" />Direct</>}
              {localActiveTab === 'network' && <><Wifi className="w-3 h-3 mr-1" />Network</>}
              {localActiveTab === 'cloudprnt' && <><Cloud className="w-3 h-3 mr-1" />CloudPRNT</>}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Configure your direct printer, network printers, or CloudPRNT remote printing.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={localActiveTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="direct" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Network
            </TabsTrigger>
            <TabsTrigger value="cloudprnt" className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              CloudPRNT
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            {/* Direct Printer Tab */}
            <TabsContent value="direct" className="mt-0">
              <Card className="border-2 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    Direct Printer
                    <Badge variant="secondary">Built-in</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use your device's built-in print service. Works directly without additional setup.
                  </p>
                  {isAndroid ? (
                    <>
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Direct printing available on this device</span>
                      </div>
                      <Button 
                        onClick={async () => {
                          try {
                            console.log('🖨️ Direct print test requested');
                            const { directPrint } = await import('@/lib/direct-print');
                            await directPrint.testPrint();
                            toast({
                              title: "Test Print Sent",
                              description: "Print dialog should appear. Select your printer if needed.",
                            });
                          } catch (error) {
                            console.error('❌ Direct print failed:', error);
                            toast({
                              title: "Test Print Failed",
                              description: error instanceof Error ? error.message : "Unknown error",
                              variant: "destructive",
                            });
                          }
                        }}
                        variant="default" 
                        className="w-full"
                        size="lg"
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        Test Print
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-yellow-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">Direct printing is only available on Android devices</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Network Printer Tab */}
            <TabsContent value="network" className="mt-0">
              <div className="space-y-4">
              {/* Manual Network Printer Addition */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Network Printer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="ip">IP Address</Label>
                      <Input
                        id="ip"
                        placeholder="192.168.1.233"
                        value={manualIp}
                        onChange={(e) => setManualIp(e.target.value)}
                        disabled={isAddingManualPrinter}
                      />
                    </div>
                    <div>
                      <Label htmlFor="port">Port</Label>
                      <Input
                        id="port"
                        placeholder="9100"
                        value={manualPort}
                        onChange={(e) => setManualPort(e.target.value)}
                        disabled={isAddingManualPrinter}
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Name (Optional)</Label>
                      <Input
                        id="name"
                        placeholder="Thermal Printer"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        disabled={isAddingManualPrinter}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="printerType">Printer Type</Label>
                    <select
                      id="printerType"
                      value={manualPrinterType}
                      onChange={(e) => setManualPrinterType(e.target.value as 'star' | 'escpos')}
                      disabled={isAddingManualPrinter}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="star">Star mC-Print3 (StarPRNT)</option>
                      <option value="escpos">Generic ESC/POS</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select "Star mC-Print3" for Star printers (mC-Print3, TSP series)
                    </p>
                  </div>
                  <Button 
                    onClick={handleAddManualPrinter} 
                    className="w-full"
                    disabled={isAddingManualPrinter}
                  >
                    {isAddingManualPrinter ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding Printer...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Printer
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Network Printers List */}
              <div>
                <h3 className="text-lg font-medium mb-3">Network Printers</h3>
                {printers.filter(p => p.type === 'network').length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <Printer className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No network printers configured</p>
                        <p className="text-sm">Add a printer using the form above</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {printers.filter(p => p.type === 'network').map((printer) => (
                      <Card key={printer.id} className={`${activePrinter?.id === printer.id ? 'ring-2 ring-primary' : ''}`}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(printer)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{printer.name}</h4>
                                  {activePrinter?.id === printer.id && (
                                    <Badge variant="outline" className="text-xs">Active</Badge>
                                  )}
                                  {printer.printerType && (
                                    <Badge variant="secondary" className="text-xs">
                                      {printer.printerType === 'star' ? 'Star' : 'ESC/POS'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {printer.address}:{printer.port}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(printer)}
                              <div className="flex gap-1">
                                {printer.isConnected ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleTestPrint(printer)}
                                    >
                                      <TestTube className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDisconnectPrinter(printer)}
                                    >
                                      <Power className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleConnectPrinter(printer)}
                                    disabled={isConnecting && selectedPrinterId === printer.id}
                                  >
                                    {isConnecting && selectedPrinterId === printer.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Power className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemovePrinter(printer)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {printer.printerType === 'star' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setExpandedPrinterId(expandedPrinterId === printer.id ? null : printer.id)}
                                  >
                                    {expandedPrinterId === printer.id ? 'Hide' : 'Fonts'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Font Settings - shown when expanded and printer is Star */}
                          {expandedPrinterId === printer.id && (
                            <PrinterFontSettings 
                              printer={printer}
                              onUpdate={(updatedPrinter) => {
                                // The printer context will auto-refresh from database
                                toast({
                                  title: "Settings Updated",
                                  description: "Reconnect the printer to apply the new font settings",
                                });
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </TabsContent>

            {/* CloudPRNT Tab */}
            <TabsContent value="cloudprnt" className="mt-0">
              <CloudPRNTManagement />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}



