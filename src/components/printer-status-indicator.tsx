import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { 
  Printer, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Wifi, 
  Bluetooth, 
  Clock,
  Activity,
  WifiOff,
  BluetoothOff
} from 'lucide-react';
import { PrinterDevice, PrinterConnectionManager, PrintJob } from '@/lib/printer';

interface PrinterStatusIndicatorProps {
  printerManager: PrinterConnectionManager;
  className?: string;
}

export function PrinterStatusIndicator({ printerManager, className }: PrinterStatusIndicatorProps) {
  const [connectedPrinters, setConnectedPrinters] = useState<PrinterDevice[]>([]);
  const [queuedJobs, setQueuedJobs] = useState<PrintJob[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setConnectedPrinters(printerManager.getConnectedPrinters());
      setQueuedJobs(printerManager.getQueuedJobs());
    };

    // Initial load
    updateStatus();

    // Set up event handlers
    const handleDeviceConnected = () => updateStatus();
    const handleDeviceDisconnected = () => updateStatus();
    const handlePrintCompleted = () => updateStatus();

    printerManager.onDeviceConnected = handleDeviceConnected;
    printerManager.onDeviceDisconnected = handleDeviceDisconnected;
    printerManager.onPrintCompleted = handlePrintCompleted;

    // Periodic status update
    const interval = setInterval(updateStatus, 5000);

    return () => {
      clearInterval(interval);
      printerManager.onDeviceConnected = () => {};
      printerManager.onDeviceDisconnected = () => {};
      printerManager.onPrintCompleted = () => {};
    };
  }, [printerManager]);

  const getOverallStatus = () => {
    if (connectedPrinters.length === 0) {
      return {
        status: 'offline',
        color: 'bg-gray-500',
        icon: X,
        text: 'No Printers'
      };
    }

    const hasError = connectedPrinters.some(p => p.status === 'error');
    const isPrinting = connectedPrinters.some(p => p.status === 'printing');
    const allIdle = connectedPrinters.every(p => p.status === 'idle');

    if (hasError) {
      return {
        status: 'error',
        color: 'bg-red-500',
        icon: AlertCircle,
        text: 'Error'
      };
    }

    if (isPrinting || queuedJobs.length > 0) {
      return {
        status: 'printing',
        color: 'bg-blue-500',
        icon: Activity,
        text: 'Printing'
      };
    }

    if (allIdle) {
      return {
        status: 'ready',
        color: 'bg-green-500',
        icon: CheckCircle,
        text: 'Ready'
      };
    }

    return {
      status: 'unknown',
      color: 'bg-gray-500',
      icon: X,
      text: 'Unknown'
    };
  };

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon;

  const getDeviceTypeIcon = (type: 'bluetooth' | 'network') => {
    return type === 'bluetooth' ? Bluetooth : Wifi;
  };

  const getStatusBadge = (printer: PrinterDevice) => {
    switch (printer.status) {
      case 'idle':
        return <Badge variant="default" className="text-xs">Ready</Badge>;
      case 'printing':
        return <Badge variant="secondary" className="text-xs">Printing</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Error</Badge>;
      case 'offline':
        return <Badge variant="outline" className="text-xs">Offline</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative p-2 ${className}`}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Printer className="w-4 h-4" />
              {/* Status indicator dot */}
              <div
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${overallStatus.color} border border-background`}
              />
            </div>
            <span className="hidden sm:inline text-sm">
              {overallStatus.text}
            </span>
            {queuedJobs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {queuedJobs.length}
              </Badge>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <StatusIcon className="w-4 h-4" />
              Printer Status
            </h3>
            <Badge 
              variant={overallStatus.status === 'ready' ? 'default' : 
                      overallStatus.status === 'error' ? 'destructive' : 'secondary'}
            >
              {overallStatus.text}
            </Badge>
          </div>

          <Separator />

          {/* Connected Printers */}
          <div>
            <h4 className="text-sm font-medium mb-2">
              Connected Printers ({connectedPrinters.length})
            </h4>
            
            {connectedPrinters.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <div className="flex justify-center mb-2">
                  <WifiOff className="w-6 h-6 mr-1" />
                  <BluetoothOff className="w-6 h-6" />
                </div>
                <p className="text-sm">No printers connected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {connectedPrinters.map(printer => {
                  const DeviceIcon = getDeviceTypeIcon(printer.type);
                  
                  return (
                    <Card key={printer.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DeviceIcon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{printer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {printer.type === 'bluetooth' ? 'Bluetooth' : printer.address}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(printer)}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Print Queue */}
          {queuedJobs.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Print Queue ({queuedJobs.length})
                </h4>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {queuedJobs.slice(0, 3).map(job => (
                    <div key={job.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{job.content.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge 
                        variant={job.priority === 'high' ? 'destructive' : 
                               job.priority === 'normal' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {job.priority}
                      </Badge>
                    </div>
                  ))}
                  
                  {queuedJobs.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{queuedJobs.length - 3} more jobs
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Quick Actions */}
          <Separator />
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Compact version for mobile header
export function CompactPrinterStatus({ printerManager, className }: PrinterStatusIndicatorProps) {
  const [connectedPrinters, setConnectedPrinters] = useState<PrinterDevice[]>([]);
  const [queuedJobs, setQueuedJobs] = useState<PrintJob[]>([]);

  useEffect(() => {
    const updateStatus = () => {
      setConnectedPrinters(printerManager.getConnectedPrinters());
      setQueuedJobs(printerManager.getQueuedJobs());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);
    
    return () => clearInterval(interval);
  }, [printerManager]);

  const getStatusColor = () => {
    if (connectedPrinters.length === 0) return 'text-gray-500';
    
    const hasError = connectedPrinters.some(p => p.status === 'error');
    const isPrinting = connectedPrinters.some(p => p.status === 'printing') || queuedJobs.length > 0;
    
    if (hasError) return 'text-red-500';
    if (isPrinting) return 'text-blue-500';
    return 'text-green-500';
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Printer className={`w-4 h-4 ${getStatusColor()}`} />
      <span className="text-xs text-muted-foreground">
        {connectedPrinters.length}
      </span>
      {queuedJobs.length > 0 && (
        <Badge variant="secondary" className="text-xs h-4 px-1">
          {queuedJobs.length}
        </Badge>
      )}
    </div>
  );
}



