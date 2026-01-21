import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { PrinterService } from './printer/printer-service';
import { PrinterDevice, PrintJob, ReceiptData } from "./printer/types";
import { useAndroid } from "./android-context";
import { useToast } from "@/hooks/use-toast";
import { LocalPrinterManager } from "./local-printer-manager";
import { UniversalOrderParser } from "./universal-order-parser";
import { supabase } from "./supabase-client";
import { useSupabaseAuth } from "./supabase-auth-context";

interface PrinterContextType {
  // Printer Management
  printers: PrinterDevice[];
  activePrinter: PrinterDevice | null;
  isDiscovering: boolean;
  isConnecting: boolean;
  connectionStatus: string;
  scanProgress: number;
  
  // Discovery & Connection
  startBluetoothDiscovery: () => Promise<void>;
  startNetworkDiscovery: () => Promise<void>;
  stopDiscovery: () => void;
  connectToPrinter: (printer: PrinterDevice) => Promise<void>;
  disconnectFromPrinter: (printerId: string) => Promise<void>;
  addManualPrinter: (ip: string, port: number, name?: string, printerType?: 'star' | 'escpos') => Promise<void>;
  addCloudPRNTPrinter: (macAddress: string, name?: string, printerType?: 'star' | 'escpos') => Promise<void>;
  removePrinter: (printerId: string) => Promise<void>;
  setActivePrinter: (printer: PrinterDevice | null) => void;
    // Printing
  printReceipt: (data: ReceiptData) => Promise<boolean>;
  printOrder: (order: any) => Promise<boolean>;
  testPrint: (printerId: string) => Promise<void>;
  
  // Status
  refreshPrinterStatus: (printerId: string) => Promise<void>;
  
  // Queue Management
  printQueue: PrintJob[];
  addToPrintQueue: (job: PrintJob) => void;
  processPrintQueue: () => Promise<void>;
  clearPrintQueue: () => void;
  
  // Modal Management
  showDiscoveryModal: boolean;
  showSettingsModal: boolean;
  showPreviewModal: boolean;
  showTroubleshootingModal: boolean;
  setShowDiscoveryModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  setShowPreviewModal: (show: boolean) => void;
  setShowTroubleshootingModal: (show: boolean) => void;
}

const PrinterContext = createContext<PrinterContextType | undefined>(undefined);

interface PrinterProviderProps {
  children: ReactNode;
}

export function PrinterProvider({ children }: PrinterProviderProps) {
  // ...existing state...
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [activePrinter, setActivePrinter] = useState<PrinterDevice | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("Disconnected");
  const [scanProgress, setScanProgress] = useState(0);
  const [printQueue, setPrintQueue] = useState<PrintJob[]>([]);
  
  const { isAndroid } = useAndroid();
  const { toast } = useToast();
  const { user, userBranch } = useSupabaseAuth();
  
  // Modal states
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTroubleshootingModal, setShowTroubleshootingModal] = useState(false);

  // Single printer service instance
  const [printerService] = useState(() => {
    const service = new PrinterService();
    
    console.log('🔄 PrinterService created for Android network printing');
    
    // Set up event handlers
    service.onDeviceFound = (device: PrinterDevice) => {
      console.log(`📱 Device found: ${device.name}`);
      setPrinters(current => {
        const existing = current.find(p => p.id === device.id);
        if (existing) {
          // Update existing device
          return current.map(p => p.id === device.id ? device : p);
        } else {
          // Add new device
          return [...current, device];
        }
      });
    };
    
    service.onDeviceConnected = (device: PrinterDevice) => {
      console.log(`✅ Device connected: ${device.name}`);
      setActivePrinter(device);
      setConnectionStatus('Connected');
      setPrinters(current => current.map(p => p.id === device.id ? device : p));
      toast({
        title: "Printer Connected",
        description: `Successfully connected to ${device.name}`,
      });
    };
    
    service.onDeviceDisconnected = (device: PrinterDevice) => {
      console.log(`🔌 Device disconnected: ${device.name}`);
      if (activePrinter?.id === device.id) {
        setActivePrinter(null);
        setConnectionStatus('Disconnected');
      }
      setPrinters(current => current.map(p => p.id === device.id ? device : p));
      toast({
        title: "Printer Disconnected",
        description: `Disconnected from ${device.name}`,
      });
    };
    
    service.onError = (error: any) => {
      console.error(`❌ Printer service error: ${error}`);
      toast({
        title: "Printer Error",
        description: error.message || String(error),
        variant: "destructive",
      });
    };
    
    service.onScanProgress = (progress) => {
      setScanProgress((progress.current / progress.total) * 100);
    };
    
    return service;
  });

  // Auto-add Direct Printer on Android devices
  useEffect(() => {
    const addDirectPrinter = async () => {
      if (!isAndroid) return;
      
      try {
        console.log('🖨️ Checking for Direct Printer (LocalPrintService)...');
        const { directPrint } = await import('./direct-print');
        
        const isAvailable = await directPrint.isAvailable();
        
        if (isAvailable) {
          console.log('✅ Direct Printer available! Adding to printers list...');
          
          const directPrinterDevice: PrinterDevice = {
            id: 'direct-print-system',
            name: 'Direct Printer (Z92)',
            address: 'system://direct-print',
            type: 'network', // Use 'network' type to show in list
            isConnected: false, // Don't auto-connect
            status: 'idle'
          };
          
          // Add to printers list (but don't set as active)
          setPrinters(prev => {
            const exists = prev.find(p => p.id === 'direct-print-system');
            if (exists) {
              return prev.map(p => p.id === 'direct-print-system' ? directPrinterDevice : p);
            }
            return [directPrinterDevice, ...prev];
          });
          
          // Only set as active if no other printer is active
          setActivePrinter(prev => {
            if (prev) {
              console.log('⚠️ Active printer already exists, not overriding with Direct Printer');
              return prev;
            }
            console.log('✅ No active printer, setting Direct Printer as active');
            return directPrinterDevice;
          });
          
          console.log('✅ Direct Printer added to available printers!');
        } else {
          console.log('⚠️ Direct Printer not available on this device');
        }
      } catch (error) {
        console.error('❌ Failed to add Direct Printer:', error);
      }
    };
    
    // Add Direct Printer first
    addDirectPrinter();
  }, [isAndroid, toast]);

  // Auto re-discover and reconnect to saved printers on startup
  useEffect(() => {
    console.log('📄 Auto-discovering saved printers on startup...');
    
    // Clean up stale connections first
    LocalPrinterManager.clearFailedConnections();
    
    const savedPrinters = LocalPrinterManager.getPrinters();
    
    if (savedPrinters.length > 0) {
      console.log(`📄 Found ${savedPrinters.length} saved printers, auto-adding them...`);
      
      // Auto-rediscover saved printers using proper discovery logic
      const autoRediscoverSavedPrinters = async () => {
        for (const savedPrinter of savedPrinters) {
          try {
            console.log(`🔍 Auto-rediscovering saved printer: ${savedPrinter.name} (${savedPrinter.address}:${savedPrinter.port})`);
            
            // Use the same logic as manual printer addition to properly re-add the printer
            const ip = savedPrinter.address;
            const port = savedPrinter.port || 9100; // Default to 9100 if port is undefined
            
            // Force add the printer (this will properly test connection and setup)
            const rediscoveredPrinter = await printerService.forceAddPrinter(
              ip, 
              port, 
              savedPrinter.name
            );
            
            console.log(`✅ Successfully re-added saved printer: ${rediscoveredPrinter.name}`);
            
            // Update the printers list with the newly rediscovered printer
            setPrinters(prev => {
              const filtered = prev.filter(p => p.id !== rediscoveredPrinter.id);
              return [...filtered, rediscoveredPrinter];
            });
            
            // Auto-connect if this was the last connected printer and auto-reconnect is enabled
            if (LocalPrinterManager.isAutoReconnectEnabled()) {
              const lastConnected = LocalPrinterManager.getLastConnectedPrinter();
              if (lastConnected && lastConnected.id === savedPrinter.id) {
                console.log(`🔄 Auto-connecting to last used printer: ${rediscoveredPrinter.name}`);
                // Don't await to avoid blocking other rediscoveries
                connectToPrinter(rediscoveredPrinter).catch(error => {
                  console.log(`⚠️ Auto-connect failed for ${rediscoveredPrinter.name}: ${error}`);
                });
              }
            }
            
          } catch (error) {
            console.log(`⚠️ Failed to rediscover saved printer ${savedPrinter.name}: ${error}`);
            // Keep the old printer entry in case user wants to manually reconnect
            setPrinters(prev => {
              const exists = prev.find(p => p.id === savedPrinter.id);
              if (!exists) {
                return [...prev, { ...savedPrinter, status: 'offline', isConnected: false }];
              }
              return prev;
            });
          }
        }
      };
      
      // Start auto-rediscovery in background
      autoRediscoverSavedPrinters();
    } else {
      console.log('📄 No saved printers found');
    }
  }, []);

  // Check for paired Bluetooth devices on startup
  useEffect(() => {
    const checkPairedBluetoothDevices = async () => {
      if (!isAndroid) return;
      
      try {
        console.log('🔵 Checking for previously connected Bluetooth printers...');
        const savedPrinters = LocalPrinterManager.getPrinters();
        const bluetoothPrinters = savedPrinters.filter(p => p.type === 'bluetooth');
        
        if (bluetoothPrinters.length > 0) {
          const { CapacitorThermalPrinterService } = await import('./capacitor-thermal-printer');
          const thermalPrinter = new CapacitorThermalPrinterService();
          
          // Check if any Bluetooth printer is still connected
          const isConnected = await thermalPrinter.isConnected();
          if (isConnected) {
            // Find the last connected Bluetooth printer
            const lastConnected = LocalPrinterManager.getLastConnectedPrinter();
            if (lastConnected && lastConnected.type === 'bluetooth') {
              console.log(`✅ Bluetooth printer ${lastConnected.name} is still connected`);
              
              // Update the printer state and set as active
              setPrinters(prev => prev.map(p => 
                p.id === lastConnected.id 
                  ? { ...p, isConnected: true, status: 'idle' } 
                  : p
              ));
              setActivePrinter({ ...lastConnected, isConnected: true, status: 'idle' });
              setConnectionStatus('Connected');
              
              toast({
                title: "Printer Reconnected",
                description: `${lastConnected.name} is still connected and ready to use`,
              });
            }
          }
        }
      } catch (error) {
        console.log('❌ Failed to check paired Bluetooth devices:', error);
      }
    };
    
    // Run this after a short delay to allow the main initialization to complete
    const timeoutId = setTimeout(checkPairedBluetoothDevices, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [isAndroid, toast]);

  // Listen for manually added Bluetooth printers
  useEffect(() => {
    const handleBluetoothPrinterAdded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const printer = customEvent.detail as PrinterDevice;
      
      console.log('📱 Received bluetooth-printer-added event:', printer);
      
      // Add to printers list if not already present
      setPrinters(prev => {
        const exists = prev.find(p => p.id === printer.id);
        if (exists) {
          console.log('⚠️ Printer already exists, skipping');
          return prev;
        }
        console.log('✅ Adding new Bluetooth printer to list');
        return [...prev, printer];
      });
    };

    window.addEventListener('bluetooth-printer-added', handleBluetoothPrinterAdded);
    
    return () => {
      window.removeEventListener('bluetooth-printer-added', handleBluetoothPrinterAdded);
    };
  }, []);

  // Discovery functions
  const startBluetoothDiscovery = useCallback(async () => {
    if (isDiscovering) return;
    
    setIsDiscovering(true);
    setScanProgress(0);
    
    try {
      console.log('📱 Starting simple Bluetooth discovery...');
      
      // Check if Android
      if (!isAndroid) {
        throw new Error('Bluetooth scanning is only available on Android devices');
      }

      // Use simple Bluetooth printer service
      const { SimpleBluetoothPrinter } = await import('./simple-bluetooth-printer');
      const btPrinter = new SimpleBluetoothPrinter();
      
      console.log('� Initializing Bluetooth...');
      await btPrinter.initialize();
      
      console.log('🔍 Scanning for Bluetooth devices...');
      const foundDevices: any[] = [];
      
      await btPrinter.scanForPrinters((printer) => {
        foundDevices.push(printer);
        
        // Add to printer list immediately
        const printerDevice: PrinterDevice = {
          id: `bt-${printer.id.replace(/[:-]/g, '')}`,
          name: printer.name,
          address: printer.id, // Use deviceId as address for connection
          type: 'bluetooth',
          isOnline: true,
          isConnected: false,
          metadata: {
            rssi: printer.rssi
          }
        };

        setPrinters(prev => {
          const exists = prev.find(p => p.id === printerDevice.id);
          if (!exists) {
            console.log(`📱 Added device: ${printerDevice.name}`);
            return [...prev, printerDevice];
          }
          return prev;
        });

        setScanProgress(prev => Math.min(prev + 10, 90));
      });
      
      setScanProgress(100);
      console.log(`✅ Bluetooth scan complete - found ${foundDevices.length} devices`);
      
      if (foundDevices.length === 0) {
        toast({
          title: "No Bluetooth Devices Found",
          description: "Make sure your printer is powered on and Bluetooth is enabled",
        });
      } else {
        toast({
          title: "Bluetooth Scan Complete",
          description: `Found ${foundDevices.length} Bluetooth device${foundDevices.length === 1 ? '' : 's'}`,
        });
      }
    } catch (error) {
      console.error('❌ Bluetooth discovery failed:', error);
      toast({
        title: "Bluetooth Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
      setScanProgress(0);
    }
  }, [isDiscovering, isAndroid, toast]);

  const startNetworkDiscovery = useCallback(async () => {
    if (isDiscovering) return;
    
    setIsDiscovering(true);
    setScanProgress(0);
    
    try {
      console.log('🌐 Starting network discovery...');
      const devices = await printerService.scanNetworkPrinters();
      console.log(`🌐 Network scan found ${devices.length} devices`);
      
      if (devices.length === 0) {
        toast({
          title: "No Network Printers Found",
          description: "Check that printers are connected to the same network",
        });
      } else {
        toast({
          title: "Network Scan Complete",
          description: `Found ${devices.length} network printer${devices.length === 1 ? '' : 's'}`,
        });
      }
    } catch (error) {
      console.error('❌ Network discovery failed:', error);
      toast({
        title: "Network Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDiscovering(false);
      setScanProgress(0);
    }
  }, [isDiscovering, printerService, toast]);

  const stopDiscovery = useCallback(() => {
    console.log('⏹️ Stopping printer discovery...');
    printerService.cancelScan();
    setIsDiscovering(false);
    setScanProgress(0);
  }, [printerService]);

  // Connection functions
  const connectToPrinter = useCallback(async (printer: PrinterDevice) => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setConnectionStatus('Connecting...');
    
    try {
      console.log(`🔗 Connecting to printer: ${printer.name} (${printer.type})`);
      
      // CloudPRNT printers don't need connection - they poll the server
      if (printer.type === 'cloudprnt') {
        console.log(`☁️ CloudPRNT printer registered: ${printer.macAddress}`);
        
        // Mark as connected immediately since CloudPRNT is polling-based
        setPrinters(prev => prev.map(p => 
          p.id === printer.id 
            ? { ...p, isConnected: true, status: 'idle' } 
            : { ...p, isConnected: false }
        ));
        
        setActivePrinter({ ...printer, isConnected: true, status: 'idle' });
        setConnectionStatus('Connected');
        
        // Record successful "connection"
        LocalPrinterManager.recordConnection(printer.id);
        
        toast({
          title: "CloudPRNT Printer Ready",
          description: `${printer.name} will poll the server for print jobs.`,
        });
        
        console.log('✅ CloudPRNT printer activated!');
        return;
      }
      
      if (printer.type === 'bluetooth') {
        // For Bluetooth printers, use simple bluetooth printer service
        console.log(`🔵 Connecting to Bluetooth printer: ${printer.address}`);
        
        try {
          const { SimpleBluetoothPrinter } = await import('./simple-bluetooth-printer');
          const btPrinter = new SimpleBluetoothPrinter();
          
          console.log('🔵 Initializing Bluetooth...');
          await btPrinter.initialize();
          
          console.log('🔵 Connecting to device...');
          const connected = await btPrinter.connect(printer.address);
          
          if (connected) {
            // Update printer status
            setPrinters(prev => prev.map(p => 
              p.id === printer.id 
                ? { ...p, isConnected: true, status: 'idle' } 
                : { ...p, isConnected: false }
            ));
            
            setActivePrinter({ ...printer, isConnected: true, status: 'idle' });
            setConnectionStatus('Connected');
            
            // Record successful connection
            LocalPrinterManager.recordConnection(printer.id);
            
            toast({
              title: "Connected",
              description: `Successfully connected to ${printer.name}. Ready to print!`,
            });
            
            console.log('✅ Bluetooth printer connected successfully!');
            return;
          } else {
            throw new Error('Failed to connect to Bluetooth printer');
          }
        } catch (btError: any) {
          console.error('❌ Bluetooth printer error:', btError);
          throw new Error(`Bluetooth connection failed: ${btError.message || btError}`);
        }
      } else {
        // For network printers, use the original logic
        console.log(`🌐 Connecting to network printer: ${printer.address}:${printer.port}`);
        
        // First ensure the printer is properly added to the service
        const allDevices = printerService.getAllDevices();
        const deviceInService = allDevices.find(d => d.id === printer.id);
        
        if (!deviceInService) {
          console.log(`🔄 Printer not in service, re-adding: ${printer.name}`);
          const readdedPrinter = await printerService.forceAddPrinter(
            printer.address, 
            printer.port || 9100, 
            printer.name
          );
          
          // Update printers list with the re-added printer
          setPrinters(prev => {
            const filtered = prev.filter(p => p.id !== readdedPrinter.id);
            return [...filtered, readdedPrinter];
          });
          
          printer = readdedPrinter; // Use the re-added printer for connection
        }
        
        // Now connect to the printer
        await printerService.connectToPrinter(printer.id);
        
        // Update connection status
        setConnectionStatus('Connected');
        
        // Record successful connection in localStorage
        LocalPrinterManager.recordConnection(printer.id);
        
        toast({
          title: "Connected",
          description: `Successfully connected to ${printer.name}`,
        });
      }
      
    } catch (error) {
      console.error(`❌ Connection failed: ${error}`);
      setConnectionStatus('Connection Failed');
      toast({
        title: "Connection Failed",
        description: `Failed to connect to ${printer.name}. ${printer.type === 'bluetooth' ? 'Make sure the device is paired and in range.' : 'Printer may be offline or unreachable.'}`,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, printerService, toast]);

  const disconnectFromPrinter = useCallback(async (printerId: string) => {
    try {
      console.log(`🔌 Disconnecting printer: ${printerId}`);
      await printerService.disconnectFromPrinter(printerId);
    } catch (error) {
      console.error(`❌ Disconnect failed: ${error}`);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect from printer",
        variant: "destructive",
      });
    }
  }, [printerService, toast]);

  const addManualPrinter = useCallback(async (ip: string, port: number, name?: string, printerType?: 'star' | 'escpos') => {
    try {
      console.log(`➕ Adding manual printer: ${ip}:${port} (Type: ${printerType || 'auto'})`);
      const device = await printerService.addPrinter(ip, port);
      if (device) {
        // Set printer type if specified
        if (printerType) {
          device.printerType = printerType;
          console.log(`✅ Printer type set to: ${printerType}`);
        }
        
        // Save to localStorage
        LocalPrinterManager.addPrinter(device);
        
        // Update local state
        setPrinters(current => {
          const existing = current.find(p => p.id === device.id);
          if (existing) {
            return current.map(p => p.id === device.id ? device : p);
          } else {
            return [...current, device];
          }
        });
        
        toast({
          title: "Printer Added",
          description: `Successfully added ${device.name} as ${printerType || 'auto-detected'} printer`,
        });
      }
    } catch (error) {
      console.error(`❌ Failed to add manual printer: ${error}`);
      toast({
        title: "Failed to Add Printer",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [printerService, toast]);

  const addCloudPRNTPrinter = useCallback(async (macAddress: string, name?: string, printerType?: 'star' | 'escpos') => {
    try {
      console.log(`☁️ Adding CloudPRNT printer: ${macAddress} (Type: ${printerType || 'star'})`);
      
      const device: PrinterDevice = {
        id: `cloudprnt-${macAddress}`,
        name: name || `CloudPRNT Printer (${macAddress})`,
        type: 'cloudprnt',
        address: macAddress,
        macAddress: macAddress,
        isConnected: true, // Always "connected" for CloudPRNT
        status: 'idle',
        printerType: printerType || 'star',
      };
      
      // Save to localStorage
      LocalPrinterManager.addPrinter(device);
      
      // Update local state
      setPrinters(current => {
        const existing = current.find(p => p.id === device.id);
        if (existing) {
          return current.map(p => p.id === device.id ? device : p);
        } else {
          return [...current, device];
        }
      });
      
      toast({
        title: "CloudPRNT Printer Added",
        description: `Successfully added ${device.name}`,
      });
    } catch (error) {
      console.error(`❌ Failed to add CloudPRNT printer: ${error}`);
      toast({
        title: "Failed to Add CloudPRNT Printer",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [toast]);

  const removePrinter = useCallback(async (printerId: string) => {
    try {
      console.log(`🗑️ Removing printer: ${printerId}`);
      
      // Remove from localStorage
      LocalPrinterManager.removePrinter(printerId);
      
      // Remove from local state
      setPrinters(current => current.filter(p => p.id !== printerId));
      
      if (activePrinter?.id === printerId) {
        setActivePrinter(null);
        setConnectionStatus('Disconnected');
      }
      
      toast({
        title: "Printer Removed",
        description: "Printer has been removed from the list",
      });
    } catch (error) {
      console.error(`❌ Failed to remove printer: ${error}`);
      toast({
        title: "Failed to Remove Printer",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [activePrinter, toast]);
  // Printing functions
  const printOrder = useCallback(async (order: any): Promise<boolean> => {
    // PRIORITY 1: Try CloudPRNT if CloudPRNT printer is active
    if (activePrinter?.type === 'cloudprnt') {
      try {
        console.log('☁️ CloudPRNT printer is active, submitting job to server...');
        const { createCloudPRNTClient } = await import('./printer/cloudprnt-client');
        
        const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || 'https://tirva-admin.fly.dev';
        const client = createCloudPRNTClient(apiUrl);
        
        // Parse order using universal parser
        const receiptData = UniversalOrderParser.parseOrder(order);
        
        const result = await client.submitJob(
          activePrinter.macAddress || activePrinter.address,
          receiptData,
          order,
          activePrinter.printerType || 'star'
        );
        
        if (result.success) {
          toast({
            title: "Order Sent to CloudPRNT",
            description: `Order #${order.id} queued for printing (Job: ${result.jobId})`,
          });
          return true;
        } else {
          toast({
            title: "CloudPRNT Failed",
            description: result.error || "Failed to submit print job",
            variant: "destructive",
          });
          return false;
        }
      } catch (error) {
        console.error('❌ CloudPRNT submission failed:', error);
        toast({
          title: "CloudPRNT Error",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        return false;
      }
    }
    
    // PRIORITY 2: Try DirectPrint on Android ONLY if Direct Printer is the active printer
    if (isAndroid && activePrinter?.id === 'direct-print-system') {
      try {
        console.log('🖨️ [Android] Direct Printer is active, using DirectPrint...');
        const { directPrint } = await import('./direct-print');
        
        const isAvailable = await directPrint.isAvailable();
        if (isAvailable) {
          console.log('✅ DirectPrint available, printing order silently...');
          const success = await directPrint.printOrder(order, true); // silentPrint=true
          
          if (success) {
            toast({
              title: "Order Sent to Printer",
              description: `Order #${order.id} printing...`,
            });
            return true;
          }
        } else {
          console.log('⚠️ DirectPrint not available');
          toast({
            title: "Direct Printer Not Available",
            description: "Please select a different printer",
            variant: "destructive",
          });
          return false;
        }
      } catch (error) {
        console.error('❌ DirectPrint failed:', error);
        toast({
          title: "Direct Print Failed",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
        return false;
      }
    }

    // Use the configured active printer
    if (!activePrinter || !activePrinter.isConnected) {
      toast({
        title: "No Active Printer",
        description: "Please connect to a printer first or enable LocalPrintService",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('🖨️ Printing order using universal parser...');
      
      // Parse order using universal parser
      const receiptData = UniversalOrderParser.parseOrder(order);
      
      // Validate the parsed data
      const validation = UniversalOrderParser.validateReceiptData(receiptData);
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Order parsing warnings:', validation.warnings);
      }
      if (!validation.isValid) {
        console.error('❌ Order parsing errors:', validation.errors);
        throw new Error(`Order parsing failed: ${validation.errors.join(', ')}`);
      }
      
      console.log('✅ Order parsed successfully:', {
        orderNumber: receiptData.orderNumber,
        itemCount: receiptData.items.length,
        total: receiptData.total
      });
      
      const success = await printerService.print(activePrinter.id, {
        type: 'receipt',
        data: receiptData,
        originalOrder: order
      });
      
      if (success) {
        toast({
          title: "Print Successful",
          description: `Order ${receiptData.orderNumber} has been printed`,
        });
      }
      return success;
    } catch (error) {
      console.error(`❌ Print order failed: ${error}`);
      
      // Debug the order structure on error
      UniversalOrderParser.debugOrder(order);
      
      toast({
        title: "Print Failed",
        description: error instanceof Error ? error.message : 'Failed to print order',
        variant: "destructive",
      });
      return false;
    }
  }, [activePrinter, printerService, isAndroid, toast]);

  const printReceipt = useCallback(async (data: ReceiptData): Promise<boolean> => {
    if (!activePrinter || !activePrinter.isConnected) {
      toast({
        title: "No Active Printer",
        description: "Please connect to a printer first",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('🖨️ Printing receipt...');
      // Convert receipt data to ESC/POS commands
      const escposData = convertReceiptToESCPOS(data);
      await printerService.print(activePrinter.id, {
        type: 'receipt',
        data: escposData
      });
      
      toast({
        title: "Print Successful",
        description: "Receipt has been sent to the printer",
      });
      return true;
    } catch (error) {
      console.error(`❌ Print failed: ${error}`);
      toast({
        title: "Print Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [activePrinter, printerService, toast]);

  const testPrint = useCallback(async (printerId: string) => {
    try {
      console.log(`🧪 Running test print for: ${printerId}`);
      
      // Find the printer
      const printer = printers.find(p => p.id === printerId);
      
      // PRIORITY 1: On Android, try Direct Print ONLY if this is the Direct Printer
      if (isAndroid && printerId === 'direct-print-system') {
        try {
          console.log('🖨️ [Android Device] Testing Direct Printer using system print service...');
          const { directPrint } = await import('./direct-print');
          
          console.log('📋 Checking print service availability...');
          const isAvailable = await directPrint.isAvailable();
          console.log(`📋 Print service available: ${isAvailable}`);
          
          if (isAvailable) {
            console.log('✅ System print service detected! Sending test print...');
            console.log('📄 This will use LocalPrintService if available on Z92');
            
            await directPrint.testPrint();
            
            toast({
              title: "Test Print Sent",
              description: "Print dialog should appear. Select your printer if needed.",
            });
            return;
          } else {
            console.log('⚠️ No system print service found');
            toast({
              title: "Direct Printer Not Available",
              description: "System print service not found on this device",
              variant: "destructive",
            });
            return;
          }
        } catch (directPrintError: any) {
          console.error('❌ Direct Print failed:', directPrintError);
          toast({
            title: "Direct Print Failed",
            description: directPrintError.message || "Unknown error",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Check if this is a Bluetooth printer
      if (printer && printer.type === 'bluetooth') {
        console.log('🔵 Using simple Bluetooth printer for test print');
        
        const { SimpleBluetoothPrinter } = await import('./simple-bluetooth-printer');
        const btPrinter = new SimpleBluetoothPrinter();
        
        try {
          // Initialize and connect
          await btPrinter.initialize();
          await btPrinter.connect(printer.address);
          
          // Print test receipt
          await btPrinter.printTestReceipt();
          
          toast({
            title: "Test Print Sent",
            description: "Check your printer for the test receipt!",
          });
          return;
        } catch (btError: any) {
          console.error('❌ Bluetooth test print failed:', btError);
          toast({
            title: "Test Print Failed",
            description: `Bluetooth Error: ${btError.message || 'Unknown error'}`,
            variant: "destructive",
          });
          return;
        }
      }
      
      // LAST RESORT: For network printers, use regular printer service
      const success = await printerService.testPrint(printerId);
      
      if (success) {
        toast({
          title: "Test Print Successful",
          description: "Test print has been sent to the printer",
        });
      } else {
        toast({
          title: "Test Print Failed",
          description: "Failed to send test print",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`❌ Test print failed: ${error}`);
      toast({
        title: "Test Print Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }, [printers, printerService, isAndroid, toast]);

  const refreshPrinterStatus = useCallback(async (printerId: string) => {
    const printer = printers.find(p => p.id === printerId);
    if (printer && printer.type === 'network') {
      // For network printers, test connection to update status
      try {
        const isConnected = printerService.isDeviceConnected(printerId);
        printer.isConnected = isConnected;
        printer.status = isConnected ? 'idle' : 'offline';
        setPrinters(current => current.map(p => p.id === printerId ? printer : p));
      } catch (error) {
        console.error(`❌ Status refresh failed: ${error}`);
      }
    }
  }, [printers, printerService]);

  // Print queue functions
  const addToPrintQueue = useCallback((job: PrintJob) => {
    setPrintQueue(current => [...current, job]);
  }, []);

  const processPrintQueue = useCallback(async () => {
    if (printQueue.length === 0 || !activePrinter) return;

    for (const job of printQueue) {
      try {
        await printReceipt(job.content.data as ReceiptData);
        setPrintQueue(current => current.filter(j => j.id !== job.id));
      } catch (error) {
        console.error(`❌ Failed to process print job ${job.id}:`, error);
        break; // Stop processing on error
      }
    }
  }, [printQueue, activePrinter, printReceipt]);

  const clearPrintQueue = useCallback(() => {
    setPrintQueue([]);
  }, []);

  // Initialize
  useEffect(() => {
    console.log('🚀 Initializing printer service...');
    
    // Load saved active printer from localStorage
    const savedPrinterId = localStorage.getItem('activePrinterId');
    if (savedPrinterId) {
      const savedPrinter = printers.find(p => p.id === savedPrinterId);
      if (savedPrinter) {
        setActivePrinter(savedPrinter);
      }
    }

    // Cleanup on unmount
    return () => {
      printerService.cleanup();
    };
  }, [printerService]);

  // Enhanced setActivePrinter that saves to both localStorage and Supabase
  const handleSetActivePrinter = useCallback(async (printer: PrinterDevice | null) => {
    setActivePrinter(printer);
    
    // Save to localStorage for immediate use
    if (printer) {
      localStorage.setItem('activePrinterId', printer.id);
      LocalPrinterManager.setDefaultPrinter(printer.id);
      console.log(`💾 Saved active printer to localStorage: ${printer.name}`);
      
      // Save to Supabase
      if (user) {
        try {
          const { data: existing } = await supabase
            .from('printer_settings')
            .select('*')
            .eq('user_id', user.id)
            .eq('branch_id', userBranch || null)
            .maybeSingle();

          const printerData = {
            active_printer_id: printer.id,
            active_printer_mac: printer.macAddress || printer.address,
            active_printer_type: printer.printerType,
          };

          if (existing) {
            await supabase
              .from('printer_settings')
              .update(printerData)
              .eq('id', existing.id);
          } else {
            await supabase
              .from('printer_settings')
              .insert({
                user_id: user.id,
                branch_id: userBranch || null,
                printer_mode: printer.type === 'cloudprnt' ? 'cloudprnt' : 'network',
                ...printerData,
              });
          }
          console.log(`☁️ Saved active printer to Supabase: ${printer.name}`);
        } catch (error) {
          console.error('❌ Failed to save printer to Supabase:', error);
        }
      }
    } else {
      localStorage.removeItem('activePrinterId');
      console.log('🗑️ Cleared active printer from localStorage');
    }
  }, [user, userBranch]);

  // Auto-reconnect on startup is already handled in the initial useEffect
  // No additional auto-reconnect logic needed here

  const contextValue: PrinterContextType = {
    printers,
    activePrinter,
    isDiscovering,
    isConnecting,
    connectionStatus,
    scanProgress,
    startBluetoothDiscovery,
    startNetworkDiscovery,
    stopDiscovery,
    connectToPrinter,
    disconnectFromPrinter,
    addManualPrinter,
    addCloudPRNTPrinter,
    removePrinter,
    setActivePrinter: handleSetActivePrinter,
    printReceipt,
    printOrder,
    testPrint,
    refreshPrinterStatus,
    printQueue,
    addToPrintQueue,
    processPrintQueue,
    clearPrintQueue,
    showDiscoveryModal,
    showSettingsModal,
    showPreviewModal,
    showTroubleshootingModal,
    setShowDiscoveryModal,
    setShowSettingsModal,
    setShowPreviewModal,
    setShowTroubleshootingModal,
  };

  return (
    <PrinterContext.Provider value={contextValue}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const context = useContext(PrinterContext);
  if (context === undefined) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
}

// Helper function to convert receipt data to ESC/POS commands
function convertReceiptToESCPOS(data: ReceiptData): Uint8Array {
  const commands: number[] = [];
  
  // Helper function to encode text for thermal printer with proper character mapping
  const encodeForThermalPrinter = (text: string): number[] => {
    const bytes: number[] = [];
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charAt(i);
      const code = text.charCodeAt(i);
      
      // Handle special characters for thermal printers
      switch (char) {
        // Euro symbol - CP850 encoding
        case '€':
          bytes.push(0xEE); // CP850 encoding for Euro
          break;
        // Finnish characters
        case 'ä':
          bytes.push(0x84); // CP850 encoding for ä
          break;
        case 'Ä':
          bytes.push(0x8E); // CP850 encoding for Ä
          break;
        case 'ö':
          bytes.push(0x94); // CP850 encoding for ö
          break;
        case 'Ö':
          bytes.push(0x99); // CP850 encoding for Ö
          break;
        case 'å':
          bytes.push(0x86); // CP850 encoding for å
          break;
        case 'Å':
          bytes.push(0x8F); // CP850 encoding for Å
          break;
        // Standard ASCII characters (0-127)
        default:
          if (code < 128) {
            bytes.push(code);
          } else {
            // For other characters, use question mark as fallback
            bytes.push(0x3F); // Question mark for unknown characters
          }
          break;
      }
    }
    
    return bytes;
  };
  
  // Initialize printer
  commands.push(0x1B, 0x40); // ESC @
  
  // Set character set to CP850 for European characters
  commands.push(0x1B, 0x74, 0x02); // ESC t 2 - Set CP850 code page
  
  // Header
  if (data.header) {
    commands.push(0x1B, 0x61, 0x01); // Center align
    commands.push(0x1B, 0x21, 0x30); // Double width/height
    commands.push(...encodeForThermalPrinter(data.header.text));
    commands.push(0x0A, 0x0A); // Line feeds
    commands.push(0x1B, 0x21, 0x00); // Normal text
  }
  
  // Items
  if (data.items && data.items.length > 0) {
    commands.push(0x1B, 0x61, 0x00); // Left align
    
    data.items.forEach(item => {
      // Item name and price
      const line = `${item.name.padEnd(20)} €${item.price.toFixed(2).padStart(7)}`;
      commands.push(...encodeForThermalPrinter(line));
      commands.push(0x0A);
      
      // Quantity if specified
      if (item.quantity && item.quantity > 1) {
        const qtyLine = `  Qty: ${item.quantity}`;
        commands.push(...encodeForThermalPrinter(qtyLine));
        commands.push(0x0A);
      }
      
      // Toppings
      if (item.toppings && item.toppings.length > 0) {
        item.toppings.forEach(topping => {
          const toppingLine = `  + ${topping.name}${topping.price > 0 ? ` (+€${topping.price.toFixed(2)})` : ''}`;
          commands.push(...encodeForThermalPrinter(toppingLine));
          commands.push(0x0A);
        });
      }
      
      // Special instructions (clean notes only)
      if (item.notes && item.notes.trim() && !item.notes.includes('Toppings:') && !item.notes.includes('Size:')) {
        const noteLine = `  Special: ${item.notes}`;
        commands.push(...encodeForThermalPrinter(noteLine));
        commands.push(0x0A);
      }
    });
    
    commands.push(0x0A); // Extra line feed
  }
  
  // Total
  if (data.total !== undefined) {
    commands.push(0x1B, 0x45, 0x01); // Bold on
    const totalLine = `${'TOTAL'.padEnd(20)} €${data.total.toFixed(2).padStart(8)}`;
    commands.push(...encodeForThermalPrinter(totalLine));
    commands.push(0x1B, 0x45, 0x00); // Bold off
    commands.push(0x0A, 0x0A);
  }
  
  // Footer
  if (data.footer) {
    commands.push(0x1B, 0x61, 0x01); // Center align
    commands.push(...encodeForThermalPrinter(data.footer.text));
    commands.push(0x0A, 0x0A);
  }
  
  // Cut paper
  commands.push(0x1D, 0x56, 0x01); // Partial cut
  
  return new Uint8Array(commands);
}



