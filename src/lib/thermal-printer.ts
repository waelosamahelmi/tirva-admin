// Thermal printer integration for local network and Bluetooth connectivity

// Extend Navigator interface for Bluetooth support
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>;
    };
  }
  
  interface BluetoothRequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
  }
  
  interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }
  
  interface BluetoothDevice {
    id: string;
    name?: string;
  }
  
  type BluetoothServiceUUID = string;
}

export interface ThermalPrinter {
  id: string;
  name: string;
  type: 'network' | 'bluetooth' | 'usb';
  address: string;
  status: 'connected' | 'disconnected' | 'error';
  paperStatus: 'ok' | 'low' | 'empty';
}

export interface PrintJob {
  id: string;
  type: 'receipt' | 'kitchen' | 'label';
  content: string;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createdAt: Date;
}

class ThermalPrinterService {
  private printers: Map<string, ThermalPrinter> = new Map();
  private printQueue: PrintJob[] = [];
  private isScanning = false;

  // Scan for available printers on local network
  async scanNetworkPrinters(): Promise<ThermalPrinter[]> {
    if (this.isScanning) return [];
    
    this.isScanning = true;
    const networkPrinters: ThermalPrinter[] = [];

    try {
      console.log('Scanning local network for thermal printers...');
      
      // Common IP addresses where thermal printers are typically configured
      const commonPrinterIPs = [
        // Common static IPs for thermal printers (removed 192.168.1.233)
        '192.168.1.101', '192.168.1.102', '192.168.1.200', '192.168.1.201',
        '192.168.1.230', '192.168.1.231', '192.168.1.232', '192.168.1.234', '192.168.1.235',        
        '10.0.0.100', '10.0.0.101', '10.0.0.102', '10.0.0.200', '10.0.0.201',
        '10.0.1.100', '10.0.1.101', '10.0.1.102', '10.0.1.200', '10.0.1.201',
        // DHCP range common addresses
        '192.168.1.20', '192.168.1.21', '192.168.1.22', '192.168.1.50', '192.168.1.100',
        '192.168.0.20', '192.168.0.21', '192.168.0.22', '192.168.0.50', '192.168.0.100'
      ];

      const promises = commonPrinterIPs.map(ip => this.checkPrinterAt(ip));
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          networkPrinters.push(result.value);
          this.printers.set(result.value.id, result.value);
          console.log(`Found thermal printer: ${result.value.name}`);
        }
      });

      if (networkPrinters.length > 0) {
        console.log(`Network scan complete: Found ${networkPrinters.length} thermal printer(s)`);
      } else {
        console.log('Network scan complete: No thermal printers found on common IP addresses');
        console.log('Note: Printers may be on different IP addresses or using different ports');
      }

      return networkPrinters;
    } catch (error) {
      console.error('Network printer scan failed:', error);
      return [];
    } finally {
      this.isScanning = false;
    }
  }

  // Check if a printer exists at given IP
  private async checkPrinterAt(ip: string): Promise<ThermalPrinter | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      // Try multiple common thermal printer ports and protocols
      const ports = [9100, 631, 515]; // RAW, IPP, LPD
      
      for (const port of ports) {
        try {
          const response = await fetch(`http://${ip}:${port}/`, {
            method: 'HEAD',
            signal: controller.signal,
            mode: 'no-cors'
          });
          
          clearTimeout(timeoutId);
          
          // If we get any response, assume there's a printer
          return {
            id: `network-${ip}-${port}`,
            name: `Thermal Printer (${ip}:${port})`,
            type: 'network',
            address: `${ip}:${port}`,
            status: 'connected',
            paperStatus: 'ok'
          };
        } catch (portError) {
          // Continue to next port
        }
      }
      
      clearTimeout(timeoutId);
      return null;
    } catch {
      return null;
    }
  }

  // Scan for Bluetooth thermal printers
  async scanBluetoothPrinters(): Promise<ThermalPrinter[]> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported in this browser');
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Common thermal printer service
          { namePrefix: 'Thermal' },
          { namePrefix: 'POS-' },
          { namePrefix: 'RP' } // Common for receipt printers
        ],
        optionalServices: ['battery_service']
      });

      if (device) {
        const printer: ThermalPrinter = {
          id: `bluetooth-${device.id}`,
          name: device.name || 'Bluetooth Thermal Printer',
          type: 'bluetooth',
          address: device.id,
          status: 'connected',
          paperStatus: 'ok'
        };

        this.printers.set(printer.id, printer);
        return [printer];
      }

      return [];
    } catch (error) {
      console.error('Bluetooth scanning failed:', error);
      throw error;
    }
  }

  // Add printer manually
  addPrinter(printer: Omit<ThermalPrinter, 'id'>): ThermalPrinter {
    const id = `${printer.type}-${Date.now()}`;
    const newPrinter: ThermalPrinter = { ...printer, id };
    this.printers.set(id, newPrinter);
    return newPrinter;
  }

  // Remove printer
  removePrinter(printerId: string): boolean {
    return this.printers.delete(printerId);
  }

  // Get all printers
  getPrinters(): ThermalPrinter[] {
    return Array.from(this.printers.values());
  }

  // Test printer connection
  async testPrinter(printerId: string): Promise<boolean> {
    const printer = this.printers.get(printerId);
    if (!printer) return false;

    try {
      await this.print(printerId, this.generateTestReceipt());
      return true;
    } catch {
      return false;
    }
  }

  // Print receipt
  async print(printerId: string, content: string): Promise<void> {
    const printer = this.printers.get(printerId);
    if (!printer) {
      throw new Error('Printer not found');
    }

    const job: PrintJob = {
      id: `job-${Date.now()}`,
      type: 'receipt',
      content,
      status: 'pending',
      createdAt: new Date()
    };

    this.printQueue.push(job);
    await this.processPrintJob(job, printer);
  }

  // Process print job
  private async processPrintJob(job: PrintJob, printer: ThermalPrinter): Promise<void> {
    try {
      job.status = 'printing';

      switch (printer.type) {
        case 'network':
          await this.printToNetwork(printer.address, job.content);
          break;
        case 'bluetooth':
          await this.printToBluetooth(printer.address, job.content);
          break;
        case 'usb':
          await this.printToUSB(printer.address, job.content);
          break;
      }

      job.status = 'completed';
    } catch (error) {
      job.status = 'failed';
      throw error;
    }
  }

  // Print to network printer with multiple protocol support
  private async printToNetwork(address: string, content: string): Promise<void> {
    const [ip, port] = address.split(':');
    const portNum = parseInt(port) || 9100;
    
    // Try different printing methods
    const printMethods = [
      // Method 1: Direct RAW socket (most common for thermal printers)
      () => this.printRAW(ip, portNum, content),
      // Method 2: HTTP POST to common printer endpoints
      () => this.printHTTP(ip, portNum, content),
      // Method 3: IPP (Internet Printing Protocol)
      () => this.printIPP(ip, content)
    ];
    
    let lastError;
    for (const method of printMethods) {
      try {
        await method();
        return; // Success
      } catch (error) {
        lastError = error;
        console.warn(`Print method failed, trying next...`, error);
      }
    }
    
    throw new Error(`All print methods failed. Last error: ${lastError}`);
  }
  
  // RAW socket printing (most reliable for thermal printers)
  private async printRAW(ip: string, port: number, content: string): Promise<void> {
    // For browsers, we need to use a WebSocket proxy or browser extension
    // In production, this would be handled by a local service or browser extension
    
    if ('serviceWorker' in navigator) {
      // Try to use service worker for printing
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({
          type: 'PRINT_RAW',
          ip,
          port,
          content
        });
        return;
      }
    }
    
    // Fallback: try WebSocket proxy if available
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:8080/print-proxy`);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          method: 'RAW',
          ip,
          port,
          content
        }));
      };
      
      ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
        ws.close();
      };
      
      ws.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };
      
      // Timeout after 10 seconds
      setTimeout(() => {
        ws.close();
        reject(new Error('Print timeout'));
      }, 10000);
    });
  }
  
  // HTTP printing
  private async printHTTP(ip: string, port: number, content: string): Promise<void> {
    const endpoints = [
      `http://${ip}:${port}/print`,
      `http://${ip}:${port}/`,
      `http://${ip}:631/printers/thermal/print-job`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/octet-stream',
            'Content-Length': content.length.toString()
          },
          body: content,
          mode: 'no-cors'
        });
        
        // For no-cors mode, we can't check response status
        // Assume success if no error was thrown
        return;
      } catch (error) {
        console.warn(`HTTP print failed for ${endpoint}:`, error);
      }
    }
    
    throw new Error('HTTP printing failed on all endpoints');
  }
  
  // IPP printing
  private async printIPP(ip: string, content: string): Promise<void> {
    const ippEndpoint = `http://${ip}:631/ipp/print`;
    
    // Create IPP request (simplified)
    const ippData = this.createIPPRequest(content);
    
    const response = await fetch(ippEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ipp',
        'Content-Length': ippData.byteLength.toString()
      },
      body: ippData
    });
    
    if (!response.ok) {
      throw new Error(`IPP printing failed: ${response.status}`);
    }
  }
  
  // Create basic IPP request
  private createIPPRequest(content: string): ArrayBuffer {
    // This is a simplified IPP request
    // In production, you'd use a proper IPP library
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(content);
    
    // Basic IPP header (simplified)
    const header = new ArrayBuffer(8);
    const headerView = new DataView(header);
    headerView.setUint16(0, 0x0101); // Version
    headerView.setUint16(2, 0x0002); // Print-Job operation
    headerView.setUint32(4, 1); // Request ID
    
    // Combine header and content
    const result = new ArrayBuffer(header.byteLength + contentBytes.length);
    const resultView = new Uint8Array(result);
    resultView.set(new Uint8Array(header), 0);
    resultView.set(contentBytes, header.byteLength);
    
    return result;
  }

  // Print to Bluetooth printer
  private async printToBluetooth(deviceId: string, content: string): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('Bluetooth not supported');
    }

    // In real implementation, would connect to Bluetooth device and send ESC/POS commands
    console.log('Printing to Bluetooth device:', deviceId, content);
  }

  // Print to USB printer
  private async printToUSB(address: string, content: string): Promise<void> {
    // Would use WebUSB API or native bridge
    console.log('Printing to USB printer:', address, content);
  }

  // Generate test receipt
  private generateTestReceipt(): string {
    return `
==============================
       TEST PRINT
==============================

------------------------------
Date: ${new Date().toLocaleDateString('fi-FI')}
Time: ${new Date().toLocaleTimeString('fi-FI')}

This is a test print to verify
printer connectivity.

==============================
`;
  }

  // Generate order receipt with ESC/POS commands
  generateOrderReceipt(order: any): string {
    const date = new Date(order.createdAt || new Date());
    const escInit = '\x1B\x40'; // Initialize printer
    const escCenter = '\x1B\x61\x01'; // Center align
    const escLeft = '\x1B\x61\x00'; // Left align
    const escBold = '\x1B\x45\x01'; // Bold on
    const escBoldOff = '\x1B\x45\x00'; // Bold off
    const escLarge = '\x1D\x21\x11'; // Double height and width (ESC/POS GS command)
    const escNormal = '\x1B\x21\x00'; // Normal size
    const escCut = '\x1D\x56\x42\x00'; // Cut paper
    const lineFeed = '\x0A'; // Line feed
    
    let receipt = escInit;
    
    // Header - Use branch info from order if available
    const branch = order.branch || order.branches || order.branch_data;
    const branchName = branch?.name || order.branchName || order.branch_name || '';
    const branchAddress = branch?.address || order.branchAddress || order.branch_address || '';
    const branchCity = branch?.city || order.branchCity || order.branch_city || '';
    const branchPostalCode = branch?.postalCode || order.branchPostalCode || order.postal_code || '';
    const branchPhone = branch?.phone || order.branchPhone || order.branch_phone || '';
    const fullAddress = [branchAddress, [branchPostalCode, branchCity].filter(Boolean).join(' ')].filter(Boolean).join(', ');

    receipt += escCenter + escBold + escLarge;
    if (branchName) {
      receipt += branchName + lineFeed;
    }
    receipt += escNormal + escBoldOff;
    receipt += '==============================' + lineFeed;
    if (fullAddress) {
      receipt += fullAddress + lineFeed;
    }
    if (branchPhone) {
      receipt += branchPhone + lineFeed;
    }
    receipt += lineFeed;
    
    // Order info
    receipt += escLeft + escBold;
    receipt += 'TILAUS / ORDER' + lineFeed;
    receipt += escBoldOff;
    receipt += '------------------------------' + lineFeed;
    receipt += `Tilausnro: ${order.orderNumber}` + lineFeed;
    receipt += `c: ${date.toLocaleDateString('fi-FI')}` + lineFeed;
    receipt += `Aika: ${date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}` + lineFeed;
    receipt += lineFeed;
    
    // Customer info - Make text larger and include all required information
    receipt += escBold + escLarge;
    receipt += `Asiakas: ${order.customerName || 'Asiakas'}` + lineFeed;
    receipt += escNormal + escBoldOff;
    
    // Customer phone (mandatory display)
    if (order.customerPhone) {
      receipt += escBold;
      receipt += `Puhelin: ${order.customerPhone}` + lineFeed;
      receipt += escBoldOff;
    }
    
    if (order.customerEmail) {
      receipt += `Sähköposti: ${order.customerEmail}` + lineFeed;
    }
    
    // Order type (mandatory display)
    receipt += escBold + escLarge;
    receipt += `Tyyppi: ${order.orderType === 'delivery' ? 'KOTIINKULJETUS' : 'NOUTO'}` + lineFeed;
    receipt += escNormal + escBoldOff;
    
    // Delivery address (mandatory display for delivery orders)
    if (order.deliveryAddress) {
      receipt += escBold;
      receipt += `Toimitusosoite:` + lineFeed;
      receipt += `${order.deliveryAddress}` + lineFeed;
      receipt += escBoldOff;
      if (order.deliveryDistance) {
        receipt += `Etäisyys: ${order.deliveryDistance} km` + lineFeed;
      }
    }
    
    if (order.pickupTime) {
      receipt += escBold;
      receipt += `Noutaika: ${order.pickupTime}` + lineFeed;
      receipt += escBoldOff;
    }
    
    receipt += lineFeed;
    
    // Items - Make all text larger
    receipt += escBold + escLarge;
    receipt += 'TUOTTEET / ITEMS' + lineFeed;
    receipt += escNormal + escBoldOff;
    receipt += '------------------------------' + lineFeed;
    
    let subtotal = 0;
    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any, index: number) => {
        console.log(`🔍 THERMAL PRINTER DEBUG - Processing item ${index + 1}:`, JSON.stringify(item, null, 2));
        
        const itemPrice = parseFloat(item.unitPrice || item.menuItem?.price || '0');
        const quantity = item.quantity || 1;
        const itemTotal = itemPrice * quantity;
        subtotal += itemTotal;
        
        // Item name - use already processed name which includes size
        let itemDisplayName = `${quantity}x ${item.name}`;
        // Note: Don't extract size again - it's already included in item.name by PrinterService
        
        receipt += escBold + escLarge;
        receipt += itemDisplayName + lineFeed;
        receipt += escNormal + escBoldOff;
        
        // Toppings - display each on separate lines with bold text and correct pricing
        const itemToppings = this.extractToppingsWithPricing(item);
        console.log(`🔍 THERMAL PRINTER DEBUG - Extracted toppings for ${item.menuItem?.name || item.name}:`, itemToppings);
        if (itemToppings.length > 0) {
          receipt += escBold;
          receipt += `   Lisäkkeet:` + lineFeed;
          receipt += escBoldOff;
          itemToppings.forEach((topping: string) => {
            receipt += escBold;
            receipt += `     • ${topping}` + lineFeed;
            receipt += escBoldOff;
          });
        }
        
        // Clean special instructions - make bold
        const cleanInstructions = this.extractCleanInstructionsFromItem(item);
        console.log(`🔍 THERMAL PRINTER DEBUG - Extracted instructions for ${item.menuItem?.name || item.name}: "${cleanInstructions}"`);
        if (cleanInstructions) {
          receipt += escBold;
          receipt += `   Ohje: ${cleanInstructions}` + lineFeed;
          receipt += escBoldOff;
        }
        
        // Price aligned to right - make larger
        receipt += escBold + escLarge;
        const priceStr = `€${itemTotal.toFixed(2)}`;
        const spaces = Math.max(0, 25 - priceStr.length);
        receipt += ' '.repeat(spaces) + priceStr + lineFeed;
        receipt += escNormal + escBoldOff;
        receipt += lineFeed;
      });
    }
    
    // Totals - Make larger
    receipt += '------------------------------' + lineFeed;
    receipt += escBold + escLarge;
    
    const subtotalStr = `€${subtotal.toFixed(2)}`;
    const subtotalSpaces = Math.max(0, 17 - subtotalStr.length);
    receipt += `Välisumma:` + ' '.repeat(subtotalSpaces) + subtotalStr + lineFeed;
    

    // Robust delivery fee detection: check multiple possible fields
    let deliveryFee = null;
    if (order.deliveryFee !== undefined && order.deliveryFee !== null && !isNaN(parseFloat(order.deliveryFee))) {
      deliveryFee = parseFloat(order.deliveryFee);
    } else if (order.delivery_fee !== undefined && order.delivery_fee !== null && !isNaN(parseFloat(order.delivery_fee))) {
      deliveryFee = parseFloat(order.delivery_fee);
    } else if (order.receiptData && order.receiptData.deliveryFee !== undefined && order.receiptData.deliveryFee !== null && !isNaN(parseFloat(order.receiptData.deliveryFee))) {
      deliveryFee = parseFloat(order.receiptData.deliveryFee);
    }
    if (deliveryFee !== null && deliveryFee > 0) {
      const deliveryStr = `€${deliveryFee.toFixed(2)}`;
      const deliverySpaces = Math.max(0, 19 - deliveryStr.length);
      receipt += `Toimitus:` + ' '.repeat(deliverySpaces) + deliveryStr + lineFeed;
    }
    
    if (order.discount && parseFloat(order.discount) > 0) {
      const discountStr = `-€${parseFloat(order.discount).toFixed(2)}`;
      const discountSpaces = Math.max(0, 20 - discountStr.length);
      receipt += `Alennus:` + ' '.repeat(discountSpaces) + discountStr + lineFeed;
    }
    
    const totalAmount = parseFloat(order.totalAmount || (subtotal + parseFloat(order.deliveryFee || '0') - parseFloat(order.discount || '0')).toFixed(2));
    const totalStr = `€${totalAmount.toFixed(2)}`;
    const totalSpaces = Math.max(0, 18 - totalStr.length);
    receipt += `YHTEENSÄ:` + ' '.repeat(totalSpaces) + totalStr + lineFeed;
    receipt += escNormal + escBoldOff;
    receipt += '==============================' + lineFeed;
    receipt += lineFeed;
    
    // Payment info - Make larger and always display payment method
    receipt += escBold + escLarge;
    receipt += `Maksutapa: ${order.paymentMethod || 'Ei määritelty'}` + lineFeed;
    if (order.paymentStatus) {
      receipt += `Maksun tila: ${order.paymentStatus}` + lineFeed;
    }
    receipt += escNormal + escBoldOff;
    receipt += lineFeed;
    
    // Special instructions
    if (order.specialInstructions) {
      receipt += escBold;
      receipt += 'ERIKOISOHJEET:' + lineFeed;
      receipt += escBoldOff;
      receipt += order.specialInstructions + lineFeed;
      receipt += lineFeed;
    }
    
    // Footer
    receipt += escCenter;
    receipt += 'Kiitos tilauksestasi!' + lineFeed;
    receipt += 'Thank you for your order!' + lineFeed;
    receipt += lineFeed;
    receipt += 'Tirvan Kahvila' + lineFeed;
    receipt += 'Avoinna: Ma-Su 10:00-20:00' + lineFeed;
    receipt += 'Kotiinkuljetus: Ma-To,Pe-Su 10:00-19:30' + lineFeed;
    receipt += lineFeed;
    receipt += 'Seuraa meitä sosiaalisessa mediassa!' + lineFeed;
    receipt += '@pizzeriaU triva' + lineFeed;
    receipt += lineFeed;
    receipt += '==============================' + lineFeed;
    receipt += lineFeed + lineFeed + lineFeed;
    
    // Cut paper
    receipt += escCut;
    
    return receipt;
  }

  // Generate kitchen receipt with ESC/POS commands
  generateKitchenReceipt(order: any): string {
    const date = new Date(order.createdAt || new Date());
    const escInit = '\x1B\x40'; // Initialize printer
    const escCenter = '\x1B\x61\x01'; // Center align
    const escLeft = '\x1B\x61\x00'; // Left align
    const escBold = '\x1B\x45\x01'; // Bold on
    const escBoldOff = '\x1B\x45\x00'; // Bold off
    const escLarge = '\x1D\x21\x11'; // Double height and width (ESC/POS GS command)
    const escNormal = '\x1B\x21\x00'; // Normal size
    const escCut = '\x1D\x56\x42\x00'; // Cut paper
    const lineFeed = '\x0A'; // Line feed
    
    let receipt = escInit;
    
    // Header
    receipt += escCenter + escBold + escLarge;
    receipt += 'KEITTIÖ / KITCHEN' + lineFeed;
    receipt += escNormal + escBoldOff;
    receipt += '==============================' + lineFeed;
    receipt += lineFeed;
    
    // Order info
    receipt += escLeft + escBold + escLarge;
    receipt += `TILAUS: ${order.orderNumber}` + lineFeed;
    receipt += escNormal + escBoldOff;
    receipt += `AIKA: ${date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}` + lineFeed;
    receipt += `PÄIVÄ: ${date.toLocaleDateString('fi-FI')}` + lineFeed;
    receipt += `TYYPPI: ${order.orderType === 'delivery' ? 'TOIMITUS' : 'NOUTO'}` + lineFeed;
    
    if (order.orderType === 'delivery' && order.deliveryAddress) {
      receipt += lineFeed;
      receipt += escBold + 'TOIMITUSOSOITE:' + escBoldOff + lineFeed;
      receipt += order.deliveryAddress + lineFeed;
      if (order.customerPhone) {
        receipt += `Puh: ${order.customerPhone}` + lineFeed;
      }
    }
    
    if (order.pickupTime) {
      receipt += lineFeed;
      receipt += escBold + `NOUTAIKA: ${order.pickupTime}` + escBoldOff + lineFeed;
    }
    
    receipt += lineFeed;
    receipt += '==============================' + lineFeed;
    
    // Items with detailed preparation instructions
    receipt += escBold + escLarge;
    receipt += 'TUOTTEET / ITEMS' + lineFeed;
    receipt += escNormal + escBoldOff;
    receipt += '------------------------------' + lineFeed;
    
    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any, index: number) => {
        receipt += lineFeed;
        
        // Item name - use already processed name which includes size
        let itemDisplayName = `${item.quantity}x ${item.name}`;
        // Note: Don't extract size again - it's already included in item.name by PrinterService
        
        receipt += escBold + escLarge;
        receipt += itemDisplayName + lineFeed;
        receipt += escNormal + escBoldOff;
        
        // Toppings with emphasis and correct pricing (parsed from special instructions or direct field)
        const itemToppings = this.extractToppingsWithPricing(item);
        if (itemToppings.length > 0) {
          receipt += escBold + '   LISÄKKEET:' + escBoldOff + lineFeed;
          itemToppings.forEach((topping: string) => {
            receipt += escBold + `   * ${topping}` + escBoldOff + lineFeed;
          });
        }
        
        // Clean special instructions for this item (excluding toppings and size info)
        const cleanInstructions = this.extractCleanInstructionsFromItem(item);
        if (cleanInstructions) {
          receipt += escBold + '   ERIKOISOHJE:' + escBoldOff + lineFeed;
          receipt += escBold + `   ${cleanInstructions}` + escBoldOff + lineFeed;
        }
        
        receipt += '- - - - - - - - - - - - - - - -' + lineFeed;
      });
    }
    
    // General special instructions
    if (order.specialInstructions) {
      receipt += lineFeed;
      receipt += escBold + escLarge;
      receipt += 'YLEISET ERIKOISOHJEET:' + lineFeed;
      receipt += escNormal + escBoldOff;
      receipt += order.specialInstructions + lineFeed;
      receipt += lineFeed;
    }
    
    // Priority indicator
    if (order.priority === 'high' || order.orderType === 'express') {
      receipt += lineFeed;
      receipt += escCenter + escBold + escLarge;
      receipt += '!!! KIIREELLINEN !!!' + lineFeed;
      receipt += '!!! EXPRESS ORDER !!!' + lineFeed;
      receipt += escNormal + escBoldOff + escLeft;
      receipt += lineFeed;
    }
    
    // Allergen warnings
    const allergens = this.extractAllergens(order.items);
    if (allergens.length > 0) {
      receipt += lineFeed;
      receipt += escBold + 'ALLERGEENIT / ALLERGENS:' + escBoldOff + lineFeed;
      receipt += allergens.join(', ') + lineFeed;
      receipt += lineFeed;
    }
    
    // Footer
    receipt += '==============================' + lineFeed;
    receipt += escCenter;
    receipt += `Tulostettu: ${new Date().toLocaleTimeString('fi-FI')}` + lineFeed;
    receipt += lineFeed + lineFeed + lineFeed;
    
    // Cut paper
    receipt += escCut;
    
    return receipt;
  }
  
  // Extract allergens from order items
  private extractAllergens(items: any[]): string[] {
    const allergens = new Set<string>();
    
    if (!items) return [];
    
    items.forEach(item => {
      // Common allergens in pizza/restaurant items
      const itemName = (item.menuItem?.name || item.name || '').toLowerCase();
      
      if (itemName.includes('gluteeni') || itemName.includes('gluten')) {
        allergens.add('Gluteeni/Gluten');
      }
      if (itemName.includes('juusto') || itemName.includes('cheese')) {
        allergens.add('Laktoosi/Lactose');
      }
      if (itemName.includes('kala') || itemName.includes('fish') || itemName.includes('lohi') || itemName.includes('salmon')) {
        allergens.add('Kala/Fish');
      }
      if (itemName.includes('muna') || itemName.includes('egg')) {
        allergens.add('Muna/Egg');
      }
      if (itemName.includes('pähkinä') || itemName.includes('nut')) {
        allergens.add('Pähkinät/Nuts');
      }
      
      // Check toppings for allergens
      if (item.toppings) {
        item.toppings.forEach((topping: string) => {
          const toppingLower = topping.toLowerCase();
          if (toppingLower.includes('juusto') || toppingLower.includes('cheese')) {
            allergens.add('Laktoosi/Lactose');
          }
          if (toppingLower.includes('kala') || toppingLower.includes('fish')) {
            allergens.add('Kala/Fish');
          }
          if (toppingLower.includes('pähkinä') || toppingLower.includes('nut')) {
            allergens.add('Pähkinät/Nuts');
          }
        });
      }
    });
    
    return Array.from(allergens);
  }

  /**
   * Extract size information from item data
   */
  private extractSizeFromItem(item: any): string | null {
    console.log(`🔍 EXTRACT SIZE DEBUG - Input item:`, JSON.stringify(item, null, 2));
    
    // Check direct size field (try multiple possible field names)
    const possibleSizeFields = ['size', 'Size', 'pizza_size', 'pizzaSize', 'item_size', 'itemSize'];
    for (const field of possibleSizeFields) {
      if (item[field] && item[field] !== 'regular') {
        console.log(`✅ Found size in field '${field}': "${item[field]}"`);
        return item[field];
      }
    }
    
    // Extract from special instructions (try multiple field names)
    const possibleInstructionFields = [
      'specialInstructions', 'special_instructions', 'instructions', 
      'notes', 'special_notes', 'order_notes', 'item_notes',
      'customizations', 'modifications'
    ];
    
    for (const field of possibleInstructionFields) {
      const specialInstructions = item[field];
      if (specialInstructions && typeof specialInstructions === 'string') {
        console.log(`🔍 Checking ${field} for size: "${specialInstructions}"`);
        const sizeMatch = specialInstructions.match(/Size:\s*([^;,]+)/i);
        if (sizeMatch) {
          const size = sizeMatch[1].trim();
          console.log(`✅ Found size in ${field}: "${size}"`);
          return size !== 'regular' ? size : null;
        }
      }
    }
    
    console.log(`❌ No size found for item`);
    return null;
  }

  /**
   * Extract toppings from item data
   */
  private extractToppingsFromItem(item: any): string[] {
    console.log(`🔍 EXTRACT TOPPINGS DEBUG - Input item:`, JSON.stringify(item, null, 2));
    
    const toppings: string[] = [];
    
    // Check direct toppings fields (try multiple possible field names)
    const possibleToppingsFields = [
      'toppings', 'Toppings', 'extras', 'Extras', 'addons', 'add_ons',
      'modifications', 'customizations', 'pizza_toppings', 'item_toppings'
    ];
    
    for (const field of possibleToppingsFields) {
      if (item[field]) {
        console.log(`🔍 Found ${field} field:`, item[field]);
        
        if (Array.isArray(item[field])) {
          item[field].forEach((topping: any) => {
            if (typeof topping === 'string') {
              toppings.push(topping);
            } else if (topping && topping.name) {
              toppings.push(topping.name);
            }
          });
          if (toppings.length > 0) {
            console.log(`✅ Extracted ${toppings.length} toppings from ${field}:`, toppings);
            return toppings;
          }
        } else if (typeof item[field] === 'string') {
          // Try to parse as JSON or comma-separated
          try {
            const parsed = JSON.parse(item[field]);
            if (Array.isArray(parsed)) {
              parsed.forEach((topping: any) => {
                if (typeof topping === 'string') {
                  toppings.push(topping);
                } else if (topping && topping.name) {
                  toppings.push(topping.name);
                }
              });
              if (toppings.length > 0) {
                console.log(`✅ Extracted ${toppings.length} toppings from parsed ${field}:`, toppings);
                return toppings;
              }
            }
          } catch {
            // Not JSON, try comma-separated
            const splitToppings = item[field].split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
            if (splitToppings.length > 0) {
              toppings.push(...splitToppings);
              console.log(`✅ Extracted ${toppings.length} toppings from comma-separated ${field}:`, toppings);
              return toppings;
            }
          }
        }
      }
    }
    
    // If no direct toppings, extract from special instructions
    const possibleInstructionFields = [
      'specialInstructions', 'special_instructions', 'instructions', 
      'notes', 'special_notes', 'order_notes', 'item_notes',
      'customizations', 'modifications'
    ];
    
    for (const field of possibleInstructionFields) {
      const specialInstructions = item[field];
      if (specialInstructions && typeof specialInstructions === 'string') {
        console.log(`🔍 Checking ${field} for toppings: "${specialInstructions}"`);
        const toppingsMatch = specialInstructions.match(/Toppings:\s*([^;]+)/i);
        if (toppingsMatch) {
          const toppingsText = toppingsMatch[1];
          console.log(`✅ Found toppings text in ${field}: "${toppingsText}"`);
          
          const toppingItems = toppingsText.split(',').map((t: string) => t.trim());
          
          toppingItems.forEach((topping: string) => {
            // Remove price info like (+€1.50) if present
            const cleanTopping = topping.replace(/\s*\(\+€[0-9.]+\)$/, '').trim();
            if (cleanTopping) {
              toppings.push(cleanTopping);
            }
          });
          
          if (toppings.length > 0) {
            console.log(`✅ Extracted ${toppings.length} toppings from ${field}:`, toppings);
            return toppings;
          }
        }
      }
    }
    
    console.log(`❌ No toppings found for item`);
    return toppings;
  }

  /**
   * Extract toppings with correct pricing based on pizza size
   */
  private extractToppingsWithPricing(item: any): string[] {
    console.log(`🔍 EXTRACT TOPPINGS WITH PRICING - Input item:`, JSON.stringify(item, null, 2));
    
    const toppings: string[] = [];
    
    // Check for Supabase relational order_item_toppings (from DB join)
    const orderItemToppings = item.order_item_toppings || item.orderItemToppings;
    if (orderItemToppings && Array.isArray(orderItemToppings) && orderItemToppings.length > 0) {
      console.log(`✅ Found order_item_toppings from DB:`, orderItemToppings);
      
      const specialInstructions = item.specialInstructions || item.special_instructions || '';
      const sizeMatch = specialInstructions.match(/Size:\s*([^;]+)/i);
      const size = sizeMatch ? sizeMatch[1].trim() : 'normal';
      
      orderItemToppings.forEach((oit: any) => {
        const toppingData = oit.toppings || oit.topping;
        const toppingName = toppingData?.name || oit.name || '';
        const basePrice = parseFloat(oit.unit_price || oit.unitPrice || toppingData?.price || '0');
        
        if (toppingName) {
          let adjustedPrice = basePrice;
          if (size === "perhe") {
            adjustedPrice = basePrice * 2;
          } else if (size === "large" && Math.abs(basePrice - 1.00) < 0.01) {
            adjustedPrice = 2.00;
          }
          
          const displayText = adjustedPrice > 0 ? `${toppingName} (+€${adjustedPrice.toFixed(2)})` : toppingName;
          toppings.push(displayText);
        }
      });
      
      if (toppings.length > 0) {
        console.log(`✅ Extracted ${toppings.length} toppings from DB:`, toppings);
        return toppings;
      }
    }
    
    // Extract size for pricing calculation
    const specialInstructions = item.specialInstructions || item.special_instructions || '';
    const sizeMatch = specialInstructions.match(/Size:\s*([^;]+)/i);
    const size = sizeMatch ? sizeMatch[1].trim() : 'normal';
    console.log(`🔍 Extracted size for pricing: "${size}"`);
    
    // Check for toppings in special instructions
    if (specialInstructions) {
      const toppingsMatch = specialInstructions.match(/Toppings:\s*([^;]+)/i);
      if (toppingsMatch) {
        const toppingsText = toppingsMatch[1];
        console.log(`✅ Found toppings text: "${toppingsText}"`);
        
        const toppingItems = toppingsText.split(',').map((t: string) => t.trim());
        
        toppingItems.forEach((topping: string) => {
          // Extract topping name and original price
          const priceMatch = topping.match(/(.+?)\s*\(\+€([\d.]+)\)/);
          if (priceMatch) {
            const toppingName = priceMatch[1].trim();
            const originalPrice = parseFloat(priceMatch[2]);
            
            // Apply size-based pricing rules
            let adjustedPrice = originalPrice;
            if (size === "perhe") {
              adjustedPrice = originalPrice * 2; // Double price for family size
            } else if (size === "large" && Math.abs(originalPrice - 1.00) < 0.01) {
              adjustedPrice = 2.00; // €1.00 toppings become €2.00 for large
            }
            
            const displayText = `${toppingName} (+€${adjustedPrice.toFixed(2)})`;
            console.log(`✅ Adjusted topping price: "${toppingName}" ${originalPrice} → ${adjustedPrice} (size: ${size})`);
            toppings.push(displayText);
          } else {
            // No price information, keep as-is
            toppings.push(topping);
          }
        });
        
        console.log(`✅ Final toppings with pricing:`, toppings);
        return toppings;
      }
    }
    
    // Fallback to old method if no toppings in special instructions
    console.log(`❌ No toppings found in special instructions, falling back to old method`);
    return this.extractToppingsFromItem(item);
  }

  /**
   * Extract clean special instructions (excluding toppings and size info)
   */
  private extractCleanInstructionsFromItem(item: any): string | null {
    console.log(`🔍 EXTRACT INSTRUCTIONS DEBUG - Input item:`, JSON.stringify(item, null, 2));
    
    // Try multiple possible instruction fields
    const possibleInstructionFields = [
      'specialInstructions', 'special_instructions', 'instructions', 
      'notes', 'special_notes', 'order_notes', 'item_notes',
      'customizations', 'modifications', 'comments'
    ];
    
    for (const field of possibleInstructionFields) {
      const specialInstructions = item[field];
      if (specialInstructions && typeof specialInstructions === 'string') {
        console.log(`🔍 Processing ${field}: "${specialInstructions}"`);
        
        if (!specialInstructions.trim()) {
          console.log(`⏭️ Empty ${field}, skipping`);
          continue;
        }
        
        // If it doesn't contain structured data (no colons), return as-is
        if (!specialInstructions.includes(':') && !specialInstructions.includes(';')) {
          console.log(`✅ Found simple instructions in ${field}: "${specialInstructions}"`);
          return specialInstructions.trim();
        }
        
        // Split by semicolon and filter out toppings and size sections
        const sections = specialInstructions.split(';').map((s: string) => s.trim());
        const cleanSections: string[] = [];
        
        sections.forEach((section: string) => {
          console.log(`🔍 Processing section: "${section}"`);
          
          // Skip sections that start with "Toppings:", "Size:", or are just repetitions
          if (!section.match(/^(Toppings|Size):/i) && section.length > 0) {
            // Check if this section starts with "Special:" and extract the content
            const specialMatch = section.match(/^Special:\s*(.+)$/i);
            if (specialMatch) {
              const content = specialMatch[1].trim();
              console.log(`✅ Found special section content: "${content}"`);
              // Only add if it's not a repetition of toppings/size info
              if (!content.match(/^(Toppings|Size):/i) && !cleanSections.includes(content)) {
                cleanSections.push(content);
              }
            } else if (!section.match(/^(Toppings|Size):/i)) {
              console.log(`✅ Found general section: "${section}"`);
              // Add non-special sections that aren't toppings/size
              if (!cleanSections.includes(section)) {
                cleanSections.push(section);
              }
            }
          } else {
            console.log(`⏭️ Skipping section (Toppings/Size): "${section}"`);
          }
        });
        
        if (cleanSections.length > 0) {
          const result = cleanSections.join(', ');
          console.log(`✅ Extracted clean instructions from ${field}: "${result}"`);
          return result;
        }
      }
    }
    
    console.log(`❌ No clean instructions found`);
    return null;
  }
}

export const thermalPrinterService = new ThermalPrinterService();


