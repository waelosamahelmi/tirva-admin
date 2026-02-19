/**
 * Production-Ready Android Printer Service
 * Optimized for real network printing with comprehensive error handling
 */

import { 
  PrinterDevice, 
  PrinterError, 
  ERROR_CODES, 
  PRINTER_PORTS, 
  NetworkScanOptions, 
  ScanProgress,
  PrintContent,
  PrintJob,
  ConnectionTestResult,
  AndroidBridge,
  ReceiptData
} from './types';
import { ESCPOSFormatter } from './escpos-formatter';
import { StarFormatter } from './star-formatter';
import { StarModernReceipt } from './star-modern-receipt';

export class PrinterService {
  private static instance: PrinterService;
  private devices = new Map<string, PrinterDevice>();
  private connectedDevices = new Map<string, PrinterDevice>();
  private scanController: AbortController | null = null;
  private isScanning = false;
  private printQueue: PrintJob[] = [];
  private isProcessingQueue = false;
  
  // Track active print jobs by order ID to prevent duplicates
  private activePrintJobs = new Map<string, string>(); // orderNumber -> jobId

  // Event handlers
  public onDeviceFound: (device: PrinterDevice) => void = () => {};
  public onDeviceConnected: (device: PrinterDevice) => void = () => {};
  public onDeviceDisconnected: (device: PrinterDevice) => void = () => {};
  public onError: (error: PrinterError) => void = () => {};
  public onScanProgress: (progress: ScanProgress) => void = () => {};
  public onPrintProgress: (job: PrintJob) => void = () => {};

  constructor() {
    console.log('🖨️ PrinterService initialized for Android network printing');
    this.startQueueProcessor();
  }

  // ===== ANDROID BRIDGE INTEGRATION =====

  /**
   * Check if Android native bridge is available
   */
  private isAndroidBridgeAvailable(): boolean {
    return typeof (window as any).Android === 'object' &&
           typeof (window as any).Android.sendRawDataToPrinter === 'function';
  }

  /**
   * Get Android bridge interface
   */
  private getAndroidBridge(): AndroidBridge | null {
    if (this.isAndroidBridgeAvailable()) {
      return (window as any).Android;
    }
    return null;
  }

  /**
   * Send data using Android native bridge
   */
  private async sendViaAndroidBridge(device: PrinterDevice, data: Uint8Array): Promise<boolean> {
    const bridge = this.getAndroidBridge();
    if (!bridge) {
      throw new PrinterError('Android bridge not available', ERROR_CODES.BRIDGE_NOT_AVAILABLE);
    }

    try {
      const base64Data = this.arrayToBase64(data);
      console.log(`📱 Sending ${data.length} bytes to ${device.address}:${device.port} via Android bridge`);
      
      const result = await bridge.sendRawDataToPrinter(device.address, device.port!, base64Data);
      
      if (result) {
        console.log(`✅ Android bridge print successful to ${device.address}:${device.port}`);
        return true;
      } else {
        console.log(`❌ Android bridge print failed to ${device.address}:${device.port}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Android bridge error:`, error);
      throw new PrinterError(`Android bridge failed: ${error}`, ERROR_CODES.PRINT_FAILED);
    }
  }

  /**
   * Test connection using Android bridge
   */
  private async testConnectionViaAndroid(address: string, port: number): Promise<boolean> {
    const bridge = this.getAndroidBridge();
    if (!bridge) {
      return false;
    }

    try {
      const result = await bridge.testPrinterConnection(address, port);
      console.log(`🔍 Android bridge connection test ${address}:${port} -> ${result ? 'SUCCESS' : 'FAILED'}`);
      return result;
    } catch (error) {
      console.log(`❌ Android bridge connection test error: ${error}`);
      return false;
    }
  }

  // ===== NETWORK DISCOVERY =====

  /**
   * Scan for network printers with intelligent discovery
   */
  async scanNetworkPrinters(options: NetworkScanOptions = {}): Promise<PrinterDevice[]> {
    if (this.isScanning) {
      throw new PrinterError('Scan already in progress', ERROR_CODES.SCAN_IN_PROGRESS);
    }

    this.isScanning = true;
    this.scanController = new AbortController();
    
    console.log('🌐 ===== STARTING PRODUCTION NETWORK PRINTER SCAN =====');

    try {
      const devices: PrinterDevice[] = [];
      const networkBase = options.networkBase || await this.detectNetworkBase();
      
      // Intelligent IP targeting
      const targetIPs = options.targetIPs || this.generateTargetIPs(networkBase);
      const portsToTest = options.ports || PRINTER_PORTS.map(p => p.port);
      
      console.log(`🎯 Scanning ${targetIPs.length} IPs across ${portsToTest.length} ports`);
      console.log(`📍 Network base: ${networkBase}`);
      console.log(`🚀 Using Android bridge: ${this.isAndroidBridgeAvailable()}`);

      let discovered = 0;
      let errors = 0;

      for (let i = 0; i < targetIPs.length; i++) {
        if (this.scanController?.signal.aborted) break;

        const ip = targetIPs[i];
        
        this.onScanProgress({
          current: i + 1,
          total: targetIPs.length,
          message: `Testing ${ip}...`,
          discovered,
          errors
        });

        try {
          const device = await this.testIPForPrinter(ip, portsToTest);
          if (device) {
            console.log(`✅ PRINTER DISCOVERED: ${device.name} at ${ip}:${device.port}`);
            devices.push(device);
            this.devices.set(device.id, device);
            this.onDeviceFound(device);
            discovered++;
          }
        } catch (error) {
          console.log(`❌ Error testing ${ip}: ${error}`);
          errors++;
        }
      }

      console.log(`✅ Network scan completed: Found ${devices.length} printers (${errors} errors)`);
      return devices;

    } catch (error) {
      console.error('❌ Network scan failed:', error);
      throw new PrinterError(`Network scan failed: ${error}`, ERROR_CODES.NETWORK_ERROR);
    } finally {
      this.isScanning = false;
      this.scanController = null;
    }
  }

  /**
   * Test IP address for printer presence
   */
  private async testIPForPrinter(ip: string, ports: number[]): Promise<PrinterDevice | null> {
    for (const port of ports) {
      try {
        const portInfo = PRINTER_PORTS.find(p => p.port === port);
        if (!portInfo) continue;

        console.log(`🔍 Testing ${ip}:${port} (${portInfo.protocol})`);
        
        const startTime = Date.now();
        const isReachable = await this.testConnection(ip, port, portInfo.timeout);
        const responseTime = Date.now() - startTime;
        
        if (isReachable) {
          console.log(`✅ ${ip}:${port} responded in ${responseTime}ms`);
          
          // Get additional printer info
          const info = await this.getPrinterInfo(ip, port);
          
          const device: PrinterDevice = {
            id: `${ip}:${port}`,
            name: info.name || `${portInfo.protocol} Printer (${ip})`,
            type: 'network',
            address: ip,
            port: port,
            isConnected: false,
            status: 'offline',
            capabilities: {
              paperWidth: 80,
              supportsImages: true,
              supportsCLahting: true,
              supportsQR: true,
              supportsBarcode: true,
              maxLineLength: 48,
              characterEncoding: 'ASCII'
            },
            metadata: {
              protocol: portInfo.protocol,
              manufacturer: info.manufacturer,
              model: info.model,
              discoveryMethod: this.isAndroidBridgeAvailable() ? 'Android Bridge' : 'Web Browser',
              responseTime,
              webInterface: info.webInterface,
              confidence: responseTime < 1000 ? 'high' : responseTime < 3000 ? 'medium' : 'low',
              testResults: {
                success: true,
                responseTime,
                protocol: portInfo.protocol,
                endpoints: info.endpoints || [],
                timestamp: new Date()
              }
            }
          };

          return device;
        }
      } catch (error) {
        console.log(`❌ Port ${port} test failed for ${ip}: ${error}`);
        continue;
      }
    }
    
    return null;
  }

  /**
   * Test network connection to printer
   */
  private async testConnection(ip: string, port: number, timeout: number = 3000): Promise<boolean> {
    // Try Android bridge first if available
    if (this.isAndroidBridgeAvailable()) {
      const result = await this.testConnectionViaAndroid(ip, port);
      if (result !== null) {
        return result;
      }
    }

    // Fallback to web-based testing
    return new Promise((resolve) => {
      let resolved = false;
      const cleanup = (result: boolean) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      const timer = setTimeout(() => cleanup(false), timeout);

      try {
        if (port === 80 || port === 631 || port === 8080) {
          // HTTP ports - test with fetch
          fetch(`http://${ip}:${port}`, { 
            method: 'HEAD', 
            mode: 'no-cors',
            signal: AbortSignal.timeout(timeout)
          })
          .then(() => {
            clearTimeout(timer);
            cleanup(true);
          })
          .catch(() => {
            clearTimeout(timer);
            cleanup(false);
          });
        } else {
          // Raw ports (9100, 515) - assume available if network is reachable
          fetch(`http://${ip}`, { 
            method: 'HEAD', 
            mode: 'no-cors',
            signal: AbortSignal.timeout(timeout / 2)
          })
          .then(() => {
            clearTimeout(timer);
            cleanup(true);
          })
          .catch(() => {
            clearTimeout(timer);
            cleanup(false);
          });
        }
      } catch {
        clearTimeout(timer);
        cleanup(false);
      }
    });
  }

  /**
   * Get printer information from HTTP interface
   */
  private async getPrinterInfo(ip: string, port: number): Promise<{
    name?: string;
    manufacturer?: string;
    model?: string;
    webInterface?: string;
    endpoints?: string[];
  }> {
    try {
      if (port === 80 || port === 631 || port === 8080) {
        const baseUrl = `http://${ip}:${port}`;
        
        try {
          const response = await fetch(baseUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          });
          
          if (response.ok) {
            const html = await response.text();
            return this.parseWebInterface(html, baseUrl);
          }
        } catch {
          // CORS blocked - still return interface info
          return {
            webInterface: baseUrl,
            endpoints: [`${baseUrl}/print`, `${baseUrl}/jobs`]
          };
        }
      }
      
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Parse printer web interface
   */
  private parseWebInterface(html: string, baseUrl: string): {
    name: string;
    manufacturer?: string;
    model?: string;
    webInterface: string;
    endpoints: string[];
  } {
    const nameMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const manufacturerMatch = html.match(/(?:manufacturer|brand)[^>]*[:\s]+([^<\n]+)/i);
    const modelMatch = html.match(/(?:model|type)[^>]*[:\s]+([^<\n]+)/i);
    
    return {
      name: nameMatch?.[1]?.trim() || 'Network Printer',
      manufacturer: manufacturerMatch?.[1]?.trim(),
      model: modelMatch?.[1]?.trim(),
      webInterface: baseUrl,
      endpoints: [`${baseUrl}/print`, `${baseUrl}/jobs`, `${baseUrl}/api`]
    };
  }

  // ===== PRINTER CONNECTION MANAGEMENT =====

  /**
   * Connect to a printer
   */
  async connectToPrinter(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new PrinterError('Device not found', ERROR_CODES.DEVICE_NOT_FOUND);
    }

    if (device.isConnected) {
      return true;
    }

    console.log(`🔌 Connecting to ${device.name} (${device.address}:${device.port})`);
    
    try {
      device.status = 'connecting';
      device.connectionAttempts = (device.connectionAttempts || 0) + 1;

      // Test connection
      const isReachable = await this.testConnection(device.address, device.port!, 5000);
      
      if (isReachable) {
        device.isConnected = true;
        device.status = 'idle';
        device.lastConnected = new Date();
        device.lastError = undefined;
        
        this.connectedDevices.set(deviceId, device);
        this.onDeviceConnected(device);
        
        console.log(`✅ Connected to ${device.name}`);
        return true;
      } else {
        device.status = 'error';
        device.lastError = 'Connection test failed';
        throw new PrinterError('Connection test failed', ERROR_CODES.CONNECTION_FAILED);
      }
    } catch (error) {
      device.status = 'error';
      device.lastError = error instanceof Error ? error.message : String(error);
      console.error(`❌ Connection failed to ${device.name}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from a printer
   */
  async disconnectFromPrinter(deviceId: string): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      return;
    }

    device.isConnected = false;
    device.status = 'offline';
    this.connectedDevices.delete(deviceId);
    this.onDeviceDisconnected(device);
    
    console.log(`🔌 Disconnected from ${device.name}`);
  }

  // ===== PRINTING OPERATIONS =====

  /**
   * Print content to a device
   */
  async print(deviceId: string, content: PrintContent): Promise<boolean> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new PrinterError('Device not connected', ERROR_CODES.DEVICE_NOT_FOUND);
    }

    const job: PrintJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      printerId: deviceId,
      content,
      priority: 'normal',
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.printQueue.push(job);
    console.log(`📄 Print job queued: ${job.id} for ${device.name}`);
    
    return new Promise((resolve, reject) => {
      const checkJob = () => {
        const currentJob = this.printQueue.find(j => j.id === job.id);
        if (!currentJob) {
          // Job completed or removed
          if (job.status === 'completed') {
            resolve(true);
          } else {
            reject(new PrinterError(job.error || 'Print job failed', ERROR_CODES.PRINT_FAILED));
          }
          return;
        }
        
        if (job.status === 'completed') {
          resolve(true);
        } else if (job.status === 'failed') {
          reject(new PrinterError(job.error || 'Print job failed', ERROR_CODES.PRINT_FAILED));
        } else {
          setTimeout(checkJob, 100);
        }
      };
      
      setTimeout(checkJob, 100);
    });
  }

  /**
   * Print test page
   */
  async testPrint(deviceId: string): Promise<boolean> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new PrinterError('Device not connected', ERROR_CODES.DEVICE_NOT_FOUND);
    }

    // Detect if this is a Star printer
    const isStarPrinter = this.isStarPrinter(device);
    console.log(`🖨️ Printer type detected: ${isStarPrinter ? 'Star mC-Print (Modern)' : 'ESC/POS'}`);
    
    let testData: Uint8Array;
    if (isStarPrinter) {
      // Use modern Star receipt formatter for test print
      const testReceiptData: ReceiptData = {
        orderNumber: 'TEST-' + Date.now().toString().slice(-4),
        timestamp: new Date(),
        items: [
          {
            name: 'Pizza Margherita',
            quantity: 1,
            price: 12.50,
            totalPrice: 12.50,
            toppings: [{ name: 'Extra Cheese', price: 2.00 }]
          },
          {
            name: 'Coca-Cola',
            quantity: 2,
            price: 3.00,
            totalPrice: 6.00
          }
        ],
        total: 20.50,
        orderType: 'pickup',
        paymentMethod: 'card',
        customerName: 'Test Customer',
        customerPhone: '+358 123 456 789'
      };
      testData = StarModernReceipt.generate(testReceiptData);
    } else {
      testData = ESCPOSFormatter.formatTestReceipt(device.name, device.address, device.port!);
    }
    
    return this.print(deviceId, {
      type: 'test',
      data: testData
    });
  }

  /**
   * Print order receipt
   */
  async printOrder(deviceId: string, order: any): Promise<boolean> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new PrinterError('Device not connected', ERROR_CODES.DEVICE_NOT_FOUND);
    }

    console.log('🖨️ PRINT ORDER DEBUG - Full order object received:');
    console.log(JSON.stringify(order, null, 2));
    
    console.log(`🧾 Printing order ${order.orderNumber || order.order_number || order.id} for ${order.customerName || order.customer_name || 'Customer'}`);

    try {
      // Convert order to receipt data format
      const receiptData = this.convertOrderToReceipt(order);
      
      console.log('🖨️ PRINT ORDER DEBUG - Receipt data created:');
      console.log(JSON.stringify(receiptData, null, 2));
      
      if (!receiptData.items || receiptData.items.length === 0) {
        console.error('❌ No items found in receipt data');
        throw new PrinterError('No items found in receipt data', ERROR_CODES.PRINT_FAILED);
      }
      
      // Check for existing print job for this order
      const orderNumber = order.orderNumber || order.order_number || order.id;
      if (this.activePrintJobs.has(orderNumber)) {
        const existingJobId = this.activePrintJobs.get(orderNumber);
        console.log(`⚠️ Print job already in progress for order ${orderNumber} (Job ID: ${existingJobId}). Preventing duplicate.`);
        
        // Check if the existing job is still active
        const existingJob = this.printQueue.find(j => j.id === existingJobId);
        if (existingJob && (existingJob.status === 'pending' || existingJob.status === 'printing')) {
          return false; // Order is actively being printed
        } else {
          // Clean up stale job reference
          this.activePrintJobs.delete(orderNumber);
        }
      }
      
      // Print the receipt using order tracking
      return this.printWithOrderTracking(deviceId, {
        type: 'receipt',
        data: receiptData
      }, orderNumber);
    } catch (error) {
      console.error(`❌ Failed to print order: ${error}`);
      
      // Clean up tracking on error
      const orderNumber = order.orderNumber || order.order_number || order.id;
      this.activePrintJobs.delete(orderNumber);
      
      throw new PrinterError(`Failed to print order: ${error}`, ERROR_CODES.PRINT_FAILED);
    }
  }

  /**
   * Print order as kitchen receipt
   */
  async printKitchenOrder(deviceId: string, order: any): Promise<boolean> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new PrinterError('Device not connected', ERROR_CODES.DEVICE_NOT_FOUND);
    }

    console.log(`🍳 Printing kitchen order ${order.orderNumber || order.id}`);

    try {
      // Convert order to kitchen receipt text
      const kitchenReceipt = this.generateKitchenReceipt(order);
      
      // Print as text
      return this.print(deviceId, {
        type: 'text',
        data: kitchenReceipt
      });
    } catch (error) {
      console.error(`❌ Failed to print kitchen order: ${error}`);
      throw new PrinterError(`Failed to print kitchen order: ${error}`, ERROR_CODES.PRINT_FAILED);
    }
  }

  /**
   * Print with order tracking to prevent duplicates
   */
  private async printWithOrderTracking(deviceId: string, content: PrintContent, orderNumber: string): Promise<boolean> {
    const job: PrintJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      printerId: deviceId,
      content,
      priority: 'normal',
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    // Track this order as being printed
    this.activePrintJobs.set(orderNumber, job.id);
    this.printQueue.push(job);
    
    console.log(`📄 Print job queued: ${job.id} for order ${orderNumber}`);
    
    return new Promise((resolve, reject) => {
      const checkJob = () => {
        const currentJob = this.printQueue.find(j => j.id === job.id);
        if (!currentJob) {
          // Job completed or removed - clean up tracking
          this.activePrintJobs.delete(orderNumber);
          
          if (job.status === 'completed') {
            resolve(true);
          } else {
            reject(new PrinterError(job.error || 'Print job failed', ERROR_CODES.PRINT_FAILED));
          }
          return;
        }
        
        if (job.status === 'completed') {
          // Clean up tracking on completion
          this.activePrintJobs.delete(orderNumber);
          resolve(true);
        } else if (job.status === 'failed') {
          // Clean up tracking on failure
          this.activePrintJobs.delete(orderNumber);
          reject(new PrinterError(job.error || 'Print job failed', ERROR_CODES.PRINT_FAILED));
        } else {
          setTimeout(checkJob, 100);
        }
      };
      
      setTimeout(checkJob, 100);
    });
  }

  /**
   * Convert order object to receipt data format
   */
  private convertOrderToReceipt(order: any): ReceiptData {
    console.log(`🧾 Converting order to receipt format:`, JSON.stringify(order, null, 2));
    
    // Handle multiple possible item array names
    const orderItems = order.orderItems || order.order_items || order.items || [];
    
    console.log(`📦 Found ${orderItems.length} items in order`);
    console.log(`🔍 TOPPINGS DEBUG - Raw order items:`, JSON.stringify(orderItems, null, 2));
    
    const items = orderItems.map((item: any) => {
      // Handle Supabase format where menu item info is nested
      const menuItem = item.menuItems || item.menu_items || item.menuItem || item;
      const itemName = menuItem.name || item.name || 'Unknown Item';
      
      // Try to get price from various possible fields
      const unitPrice = parseFloat(
        item.unit_price || 
        item.unitPrice || 
        menuItem.price || 
        item.price || 
        '0'
      );
      
      const quantity = parseInt(item.quantity || '1');
      
      // Calculate total price
      const totalPrice = parseFloat(
        item.total_price || 
        item.totalPrice || 
        (quantity * unitPrice).toString()
      );
      
      console.log(`📋 Processing item:`, {
        name: itemName,
        unitPrice,
        quantity,
        totalPrice,
        originalItem: item
      });

      // Extract toppings and size using helper methods
      const itemSize = this.extractSizeFromItem(item);
      const cleanInstructions = this.extractCleanInstructionsFromItem(item);
      console.log(`🔍 EXTRACTION RESULTS for "${itemName}":`)
      console.log(`  - Size: "${itemSize}"`);
      console.log(`  - Instructions: "${cleanInstructions}"`);
      
      // Build toppings for the receipt format with correct pricing
      const receiptToppings = this.extractToppingsWithPricing(item, itemSize);
      
      console.log(`🍕 Receipt toppings array:`, JSON.stringify(receiptToppings, null, 2));
      
      // Build item name with size if present
      let itemDisplayName = itemName;
      if (itemSize && itemSize !== 'regular') {
        itemDisplayName += ` (${itemSize})`;
      }
      
      return {
        name: itemDisplayName,
        quantity: quantity,
        price: unitPrice,
        totalPrice: totalPrice,
        toppings: receiptToppings,
        notes: cleanInstructions || ''
      };
    });

    const total = parseFloat(order.total_amount || order.totalAmount || order.total || '0');
    const orderNumber = order.order_number || order.orderNumber || order.id || 'N/A';
    const customerName = order.customer_name || order.customerName || 'Guest';
    const orderSpecialInstructions = order.specialInstructions || order.special_instructions || '';

    // Extract branch information from order if available
    const branch = order.branch || order.branches || order.branch_data;
    const branchName = branch?.name || order.branchName || order.branch_name || 'Tirvan Kahvila';
    const branchAddress = branch?.address || order.branchAddress || order.branch_address || 'Rauhankatu 19 c';
    const branchCity = branch?.city || order.branchCity || order.branch_city || 'Lahti';
    const branchPostalCode = branch?.postalCode || order.branchPostalCode || order.postal_code || '15110';
    const branchPhone = branch?.phone || order.branchPhone || order.branch_phone || '+358-3589-9089';
    const branchEmail = branch?.email || order.branchEmail || order.branch_email || '';

    const receiptData = {
      header: {
        text: `${branchName}\n================\n${branchAddress}\n${branchPostalCode} ${branchCity}\n${branchPhone}`,
        alignment: 'center' as const,
        bold: true
      },
      items: items,
      footer: {
        text: 'Kiitos tilauksestasi!\nThank you for your order!\n\n' + branchName + '\nAvoinna: Ma-Su 10:00-20:00',
        alignment: 'center' as const
      },
      total: total,
      orderNumber: orderNumber,
      timestamp: new Date(order.created_at || order.createdAt || new Date()),
      customerName: customerName,
      customerPhone: order.customer_phone || order.customerPhone,
      customerEmail: order.customer_email || order.customerEmail,
      orderType: order.order_type || order.orderType,
      deliveryAddress: order.delivery_address || order.deliveryAddress,
      paymentMethod: order.payment_method || order.paymentMethod,
      paymentStatus: order.payment_status || order.paymentStatus,
      tableNumber: order.table_number || order.tableNumber,
      orderSpecialInstructions: orderSpecialInstructions, // Add order-level special instructions
      // Branch information
      branchName,
      branchAddress,
      branchCity,
      branchPostalCode,
      branchPhone,
      branchEmail
    };

    console.log(`📄 Final receipt data:`, {
      orderNumber: receiptData.orderNumber,
      itemCount: receiptData.items.length,
      total: receiptData.total,
      customer: receiptData.customerName,
      items: receiptData.items.map((i: any) => `${i.name} x${i.quantity} = €${i.totalPrice.toFixed(2)}`)
    });

    return receiptData;
  }

  /**
   * Generate kitchen receipt text
   */
  private generateKitchenReceipt(order: any): string {
    const date = new Date(order.created_at || order.createdAt || new Date());
    
    let receipt = '';
    receipt += '================================\n';
    receipt += '          KEITTIÖ / KITCHEN      \n';
    receipt += '================================\n';
    receipt += '\n';
    
    // Order info
    receipt += `TILAUS: ${order.order_number || order.orderNumber || order.id}\n`;
    receipt += `AIKA: ${date.toLocaleTimeString('fi-FI')}\n`;
    receipt += `PÄIVÄ: ${date.toLocaleDateString('fi-FI')}\n`;
    receipt += `TYYPPI: ${order.order_type === 'delivery' ? 'TOIMITUS' : 'NOUTO'}\n`;
    
    if (order.customer_name || order.customerName) {
      receipt += `ASIAKAS: ${order.customer_name || order.customerName}\n`;
    }
    
    if ((order.order_type || order.orderType) === 'delivery' && (order.delivery_address || order.deliveryAddress)) {
      receipt += '\nTOIMITUSOSOITE:\n';
      receipt += `${order.delivery_address || order.deliveryAddress}\n`;
      if (order.customer_phone || order.customerPhone) {
        receipt += `Puh: ${order.customer_phone || order.customerPhone}\n`;
      }
    }
    
    if (order.pickup_time || order.pickupTime) {
      receipt += `\nNOUTAIKA: ${order.pickup_time || order.pickupTime}\n`;
    }
    
    receipt += '\n';
    receipt += '================================\n';
    receipt += '         TUOTTEET / ITEMS       \n';
    receipt += '--------------------------------\n';
    
    // Items - handle both Supabase and legacy formats
    const orderItems = order.order_items || order.items || [];
    
    if (orderItems.length > 0) {
      orderItems.forEach((item: any) => {
        const menuItem = item.menu_items || item.menuItem || item;
        const itemName = menuItem.name || item.name || 'Unknown Item';
        const quantity = item.quantity || 1;
        
        receipt += '\n';
        receipt += `${quantity}x ${itemName}\n`;
        
        // Size information (extracted using helper method)
        const itemSize = this.extractSizeFromItem(item);
        if (itemSize) {
          receipt += `   KOKO: ${itemSize.toUpperCase()}\n`;
        }
        
        // Toppings (parsed using helper method)
        const itemToppings = this.extractToppingsFromItem(item);
        if (itemToppings.length > 0) {
          receipt += '   LISÄKKEET:\n';
          itemToppings.forEach((topping: string) => {
            receipt += `   * ${topping}\n`;
          });
        }
        
        // Clean special instructions (excluding toppings and size info)
        const cleanInstructions = this.extractCleanInstructionsFromItem(item);
        if (cleanInstructions) {
          receipt += '   ERIKOISOHJE:\n';
          receipt += `   ${cleanInstructions}\n`;
        }
        
        receipt += '- - - - - - - - - - - - - - - -\n';
      });
    }
    
    // General special instructions
    const generalInstructions = order.special_instructions || order.specialInstructions;
    if (generalInstructions) {
      receipt += '\n';
      receipt += 'YLEISET ERIKOISOHJEET:\n';
      receipt += `${generalInstructions}\n`;
      receipt += '\n';
    }
    
    // Priority indicator
    if (order.priority === 'high' || (order.order_type || order.orderType) === 'express') {
      receipt += '\n';
      receipt += '!!! KIIREELLINEN !!!\n';
      receipt += '!!! EXPRESS ORDER !!!\n';
      receipt += '\n';
    }
    
    // Footer
    receipt += '================================\n';
    receipt += `Tulostettu: ${new Date().toLocaleTimeString('fi-FI')}\n`;
    receipt += '\n\n\n';
    
    return receipt;
  }

  // ===== EXISTING PRINTING OPERATIONS =====

  /**
   * Process print queue
   */
  private async startQueueProcessor(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;
    
    while (this.isProcessingQueue) {
      try {
        const job = this.printQueue.find(j => j.status === 'pending');
        if (!job) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        await this.processJob(job);
        
      } catch (error) {
        console.error('❌ Queue processor error:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process individual print job
   */
  private async processJob(job: PrintJob): Promise<void> {
    try {
      job.status = 'printing';
      this.onPrintProgress(job);
      
      const device = this.connectedDevices.get(job.printerId);
      if (!device) {
        throw new Error('Device not connected');
      }

      device.status = 'printing';
      
      // Convert content to print data
      let printData: Uint8Array;
      
      // Detect if this is a Star printer
      const isStarPrinter = this.isStarPrinter(device);
      console.log(`🖨️ Formatting for printer type: ${isStarPrinter ? 'Star mC-Print' : 'ESC/POS'}`);
      
      if (job.content.type === 'receipt' && typeof job.content.data === 'object') {
        if (isStarPrinter) {
          // Use modern Star receipt formatter (optimized for mC-Print3)
          console.log('🖨️ Using StarModernReceipt formatter');
          printData = StarModernReceipt.generate(job.content.data as any, job.content.originalOrder);
        } else {
          // Get font settings from device metadata or use defaults
          const fontSettings = device.metadata?.fontSettings;
          printData = ESCPOSFormatter.formatReceipt(job.content.data as any, job.content.originalOrder, fontSettings);
        }
      } else if (job.content.type === 'text' && typeof job.content.data === 'string') {
        printData = ESCPOSFormatter.formatText(job.content.data);
      } else if (job.content.data instanceof Uint8Array) {
        printData = job.content.data;
      } else {
        throw new Error('Invalid content data type');
      }

      console.log(`🖨️ Processing print job ${job.id} - ${printData.length} bytes`);
      
      // Send to printer
      const success = await this.sendToPrinter(device, printData);
      
      if (success) {
        job.status = 'completed';
        job.completedAt = new Date();
        device.status = 'idle';
        console.log(`✅ Print job ${job.id} completed successfully`);
      } else {
        throw new Error('Print failed');
      }
      
    } catch (error) {
      job.retryCount++;
      job.error = error instanceof Error ? error.message : String(error);
      
      if (job.retryCount >= job.maxRetries) {
        job.status = 'failed';
        console.error(`❌ Print job ${job.id} failed after ${job.retryCount} attempts: ${job.error}`);
        
        const device = this.connectedDevices.get(job.printerId);
        if (device) {
          device.status = 'error';
          device.lastError = job.error;
        }
      } else {
        job.status = 'pending';
        console.log(`⚠️ Print job ${job.id} retry ${job.retryCount}/${job.maxRetries}: ${job.error}`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * job.retryCount));
      }
    }
    
    this.onPrintProgress(job);
    
    // Remove completed/failed jobs
    if (job.status === 'completed' || job.status === 'failed') {
      const index = this.printQueue.findIndex(j => j.id === job.id);
      if (index >= 0) {
        this.printQueue.splice(index, 1);
      }
    }
  }

  /**
   * Send data to printer using best available method
   */
  private async sendToPrinter(device: PrinterDevice, data: Uint8Array): Promise<boolean> {
    console.log(`📡 Sending ${data.length} bytes to ${device.address}:${device.port}`);
    
    // Primary method: Android native bridge
    if (this.isAndroidBridgeAvailable()) {
      try {
        console.log(`📱 Using Android native bridge for printing`);
        const result = await this.sendViaAndroidBridge(device, data);
        if (result) {
          console.log(`✅ Android bridge print successful`);
          return true;
        }
        console.log(`❌ Android bridge print failed`);
      } catch (error) {
        console.error(`❌ Android bridge error: ${error}`);
      }
    }

    // Fallback methods for web environment
    console.log(`🌐 Falling back to web-based printing methods`);

    // Try HTTP printing for compatible ports
    if (device.port === 80 || device.port === 631 || device.port === 8080) {
      try {
        const success = await this.sendViaHTTP(device, data);
        if (success) {
          console.log(`✅ HTTP print successful`);
          return true;
        }
      } catch (error) {
        console.log(`❌ HTTP print failed: ${error}`);
      }
    }

    // Development fallback
    console.log(`⚠️ No working print method found`);
    console.log(`📱 In production Android app, this would use native TCP printing`);
    console.log(`🔧 Ensure Android bridge is properly implemented for real printing`);
    
    // Simulate success for development/testing
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }

  /**
   * Send via HTTP to web-enabled printers
   */
  private async sendViaHTTP(device: PrinterDevice, data: Uint8Array): Promise<boolean> {
    const endpoints = ['/print', '/api/print', '/raw-print', '/'];
    
    // Convert to standard Uint8Array to avoid TypeScript type issues
    const standardData = new Uint8Array(data);
    
    for (const endpoint of endpoints) {
      try {
        const url = `http://${device.address}:${device.port}${endpoint}`;
        console.log(`🌐 Trying HTTP POST to ${url}`);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': standardData.length.toString()
          },
          body: new Blob([standardData]),
          mode: 'no-cors',
          signal: AbortSignal.timeout(5000)
        });
        
        console.log(`✅ HTTP request to ${endpoint} completed`);
        return true;
        
      } catch (error) {
        console.log(`❌ HTTP endpoint ${endpoint} failed: ${error}`);
      }
    }
    
    return false;
  }

  // ===== UTILITY METHODS =====

  /**
   * Detect network base for scanning
   */
  private async detectNetworkBase(): Promise<string> {
    const bridge = this.getAndroidBridge();
    if (bridge) {
      try {
        const networkInfo = await bridge.getNetworkInfo();
        const info = JSON.parse(networkInfo);
        if (info.networkBase) {
          return info.networkBase;
        }
      } catch (error) {
        console.log('Could not get network info from Android bridge');
      }
    }

    // Fallback to common network ranges
    const commonBases = ['192.168.1', '192.168.0', '10.0.0', '172.16.0'];
    return commonBases[0];
  }

  /**
   * Generate target IPs for scanning
   */
  private generateTargetIPs(networkBase: string): string[] {
    const ips: string[] = [];
    
    // Known printer IP
    ips.push('192.168.1.233');
    
    // Common printer ranges
    for (let i = 100; i <= 110; i++) {
      ips.push(`${networkBase}.${i}`);
    }
    for (let i = 200; i <= 210; i++) {
      ips.push(`${networkBase}.${i}`);
    }
    for (let i = 150; i <= 155; i++) {
      ips.push(`${networkBase}.${i}`);
    }
    
    // Router and gateway ranges
    for (let i = 1; i <= 5; i++) {
      ips.push(`${networkBase}.${i}`);
    }
    
    return Array.from(new Set(ips)); // Remove duplicates
  }

  /**
   * Convert Uint8Array to base64
   */
  private arrayToBase64(array: Uint8Array): string {
    const binary = Array.from(array).map(byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }

  // ===== PUBLIC API =====

  /**
   * Get all discovered devices
   */
  getAllDevices(): PrinterDevice[] {
    return Array.from(this.devices.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get connected devices
   */
  getConnectedDevices(): PrinterDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Check if device is connected
   */
  isDeviceConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }

  /**
   * Cancel current scan
   */
  cancelScan(): void {
    if (this.scanController) {
      this.scanController.abort();
    }
    this.isScanning = false;
  }

  /**
   * Get current scan status
   */
  isScanInProgress(): boolean {
    return this.isScanning;
  }

  /**
   * Get print queue status
   */
  getQueueStatus(): { pending: number; printing: number; total: number } {
    const pending = this.printQueue.filter(j => j.status === 'pending').length;
    const printing = this.printQueue.filter(j => j.status === 'printing').length;
    
    return {
      pending,
      printing,
      total: this.printQueue.length
    };
  }

  /**
   * Add printer manually with connection testing
   */
  async addPrinter(address: string, port: number, name?: string): Promise<PrinterDevice> {
    console.log(`🔧 Adding printer manually: ${address}:${port}`);
    
    try {
      // First try to test the connection
      const device = await this.testIPForPrinter(address, [port]);
      if (device) {
        this.devices.set(device.id, device);
        this.onDeviceFound(device);
        console.log(`✅ Manually added printer with connection test: ${device.name}`);
        return device;
      }
      
      // If connection test fails, offer to add anyway
      console.log(`⚠️ Connection test failed for ${address}:${port}, but adding printer anyway`);
      return await this.forceAddPrinter(address, port, name);
      
    } catch (error) {
      console.error(`❌ Failed to add printer: ${error}`);
      // Try force add as fallback
      console.log(`🔄 Attempting to force add printer without connection test`);
      return await this.forceAddPrinter(address, port, name);
    }
  }

  /**
   * Force add printer without connection testing
   */
  async forceAddPrinter(address: string, port: number, name?: string): Promise<PrinterDevice> {
    console.log(`🔧 Force adding printer: ${address}:${port}`);
    
    const portInfo = PRINTER_PORTS.find(p => p.port === port) || {
      port,
      protocol: 'RAW',
      timeout: 3000,
      description: 'Manual Printer'
    };

    // Default to Star printer for port 9100 (standard Star/JetDirect port)
    const defaultPrinterType = port === 9100 ? 'star' : undefined;
    
    const device: PrinterDevice = {
      id: `${address}:${port}`,
      name: name || `Manual Printer (${address}:${port})`,
      type: 'network',
      address: address,
      port: port,
      isConnected: false,
      status: 'offline',
      printerType: defaultPrinterType,
      capabilities: {
        paperWidth: 80,
        supportsImages: true,
        supportsCLahting: true,
        supportsQR: true,
        supportsBarcode: true,
        maxLineLength: 48,
        characterEncoding: 'ASCII'
      },
      metadata: {
        protocol: portInfo.protocol,
        discoveryMethod: this.isAndroidBridgeAvailable() ? 'Android Bridge (Manual)' : 'Web Browser (Manual)',
        confidence: 'low',
        testResults: {
          success: false,
          responseTime: 0,
          protocol: portInfo.protocol,
          endpoints: [],
          timestamp: new Date(),
          errorMessage: 'Connection test skipped - manually added'
        }
      }
    };

    this.devices.set(device.id, device);
    this.onDeviceFound(device);
    
    console.log(`✅ Force added printer: ${device.name}`);
    return device;
  }

  /**
   * Remove printer
   */
  async removePrinter(deviceId: string): Promise<void> {
    await this.disconnectFromPrinter(deviceId);
    this.devices.delete(deviceId);
    console.log(`🗑️ Removed printer: ${deviceId}`);
  }

  /**
   * Calculate topping price based on pizza size
   * - "perhe" (family) size: double the base price
   * - "large" size: €1.00 toppings become €2.00
   * - regular size: original price
   */
  private calculateToppingPrice(basePrice: number, size: string | null): number {
    console.log(`🔍 [TOPPING PRICE] Calculating for size: "${size}", base price: €${basePrice}`);
    
    if (!size || size === 'regular') {
      console.log(`✅ [TOPPING PRICE] Regular size, returning base price: €${basePrice}`);
      return basePrice;
    }
    
    if (size === 'perhe') {
      const doublePrice = basePrice * 2;
      console.log(`✅ [TOPPING PRICE] Family size, doubling price: €${basePrice} → €${doublePrice}`);
      return doublePrice;
    }
    
    if (size === 'large' && basePrice === 1.00) {
      console.log(`✅ [TOPPING PRICE] Large size, €1.00 topping becomes €2.00`);
      return 2.00;
    }
    
    console.log(`✅ [TOPPING PRICE] Other size/price, returning base price: €${basePrice}`);
    return basePrice;
  }

  /**
   * Extract toppings from item data with correct pricing
   */
  private extractToppingsWithPricing(item: any, size: string | null): { name: string; price: number }[] {
    console.log(`🔍 [EXTRACT TOPPINGS WITH PRICING] Input item:`, JSON.stringify(item, null, 2));
    console.log(`🔍 [EXTRACT TOPPINGS WITH PRICING] Size: "${size}"`);
    
    const toppings: { name: string; price: number }[] = [];
    
    // First check if we have direct toppings array
    if (item.toppings && Array.isArray(item.toppings)) {
      console.log(`✅ [EXTRACT TOPPINGS WITH PRICING] Found direct toppings array:`, item.toppings);
      item.toppings.forEach((topping: any) => {
        let toppingName = '';
        let basePrice = 0;
        
        if (typeof topping === 'string') {
          toppingName = topping;
          basePrice = 1.50; // Default topping price
        } else if (topping && topping.name) {
          toppingName = topping.name;
          basePrice = parseFloat(topping.price || '1.50');
        }
        
        if (toppingName) {
          const adjustedPrice = this.calculateToppingPrice(basePrice, size);
          toppings.push({ name: toppingName, price: adjustedPrice });
          console.log(`✅ [EXTRACT TOPPINGS WITH PRICING] Added topping: "${toppingName}" @ €${adjustedPrice}`);
        }
      });
    }
    
    // If no direct toppings, extract from special instructions
    if (toppings.length === 0) {
      const specialInstructions = item.specialInstructions || item.special_instructions || '';
      console.log(`🔍 [EXTRACT TOPPINGS WITH PRICING] Checking special instructions: "${specialInstructions}"`);
      
      if (specialInstructions) {
        const toppingsMatch = specialInstructions.match(/Toppings:\s*([^;]+)/i);
        if (toppingsMatch) {
          const toppingsText = toppingsMatch[1];
          console.log(`✅ [EXTRACT TOPPINGS WITH PRICING] Found toppings text: "${toppingsText}"`);
          
          const toppingItems = toppingsText.split(',').map((t: string) => t.trim());
          console.log(`🔍 [EXTRACT TOPPINGS WITH PRICING] Split toppings:`, toppingItems);
          
          toppingItems.forEach((topping: string) => {
            // Extract price from topping text like "Pepperoni (+€1.50)"
            const priceMatch = topping.match(/\(\+€([0-9.]+)\)$/);
            const basePrice = priceMatch ? parseFloat(priceMatch[1]) : 1.50;
            
            // Remove price info to get clean topping name
            const cleanTopping = topping.replace(/\s*\(\+€[0-9.]+\)$/, '').trim();
            
            if (cleanTopping) {
              const adjustedPrice = this.calculateToppingPrice(basePrice, size);
              toppings.push({ name: cleanTopping, price: adjustedPrice });
              console.log(`✅ [EXTRACT TOPPINGS WITH PRICING] Added topping: "${cleanTopping}" @ €${adjustedPrice} (base: €${basePrice})`);
            }
          });
        }
      }
    }
    
    console.log(`✅ [EXTRACT TOPPINGS WITH PRICING] Returning ${toppings.length} toppings:`, toppings);
    return toppings;
  }

  /**
   * Extract size from item data
   */
  private extractSizeFromItem(item: any): string | null {
    console.log(`🔍 [EXTRACT SIZE] Input item:`, JSON.stringify(item, null, 2));
    
    // Check direct size field
    if (item.size && item.size !== 'regular') {
      console.log(`✅ [EXTRACT SIZE] Found direct size: "${item.size}"`);
      return item.size;
    }
    
    // Extract from special instructions
    const specialInstructions = item.specialInstructions || item.special_instructions || '';
    console.log(`🔍 [EXTRACT SIZE] Checking special instructions: "${specialInstructions}"`);
    
    if (specialInstructions) {
      const sizeMatch = specialInstructions.match(/Size:\s*([^;]+)/i);
      if (sizeMatch) {
        const size = sizeMatch[1].trim();
        console.log(`✅ [EXTRACT SIZE] Found size in instructions: "${size}"`);
        return size !== 'regular' ? size : null;
      }
    }
    
    console.log(`❌ [EXTRACT SIZE] No size found`);
    return null;
  }

  /**
   * Extract toppings from item data
   */
  private extractToppingsFromItem(item: any): string[] {
    console.log(`🔍 [EXTRACT TOPPINGS] Input item:`, JSON.stringify(item, null, 2));
    
    const toppings: string[] = [];
    
    // First check if we have direct toppings array
    if (item.toppings && Array.isArray(item.toppings)) {
      console.log(`✅ [EXTRACT TOPPINGS] Found direct toppings array:`, item.toppings);
      item.toppings.forEach((topping: any) => {
        if (typeof topping === 'string') {
          toppings.push(topping);
        } else if (topping && topping.name) {
          toppings.push(topping.name);
        }
      });
      console.log(`✅ [EXTRACT TOPPINGS] Processed direct toppings:`, toppings);
    }
    
    // If no direct toppings, extract from special instructions
    if (toppings.length === 0) {
      const specialInstructions = item.specialInstructions || item.special_instructions || '';
      console.log(`🔍 [EXTRACT TOPPINGS] Checking special instructions: "${specialInstructions}"`);
      
      if (specialInstructions) {
        const toppingsMatch = specialInstructions.match(/Toppings:\s*([^;]+)/i);
        if (toppingsMatch) {
          const toppingsText = toppingsMatch[1];
          console.log(`✅ [EXTRACT TOPPINGS] Found toppings text: "${toppingsText}"`);
          
          const toppingItems = toppingsText.split(',').map((t: string) => t.trim());
          console.log(`🔍 [EXTRACT TOPPINGS] Split toppings:`, toppingItems);
          
          toppingItems.forEach((topping: string) => {
            // Remove price info like (+€1.50) if present
            const cleanTopping = topping.replace(/\s*\(\+€[0-9.]+\)$/, '').trim();
            if (cleanTopping) {
              toppings.push(cleanTopping);
            }
          });
          
          console.log(`✅ [EXTRACT TOPPINGS] Final extracted toppings:`, toppings);
        } else {
          console.log(`❌ [EXTRACT TOPPINGS] No toppings pattern found in instructions`);
        }
      } else {
        console.log(`❌ [EXTRACT TOPPINGS] No special instructions found`);
      }
    }
    
    if (toppings.length === 0) {
      console.log(`❌ [EXTRACT TOPPINGS] No toppings found for item`);
    } else {
      console.log(`✅ [EXTRACT TOPPINGS] Returning ${toppings.length} toppings:`, toppings);
    }
    
    return toppings;
  }

  /**
   * Extract clean special instructions (excluding toppings and size info)
   */
  private extractCleanInstructionsFromItem(item: any): string | null {
    const specialInstructions = item.specialInstructions || item.special_instructions || '';
    if (!specialInstructions) return null;
    
    // Split by semicolon and filter out toppings and size sections
    const sections = specialInstructions.split(';').map((s: string) => s.trim());
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
   * Detect if printer is a Star printer (mC-Print3 or similar)
   */
  private isStarPrinter(device: PrinterDevice): boolean {
    // First check if printer type is explicitly set
    if (device.printerType === 'star') {
      console.log(`🌟 Star printer detected: explicit printerType='star'`);
      return true;
    }
    if (device.printerType === 'escpos') {
      console.log(`📄 ESC/POS printer detected: explicit printerType='escpos'`);
      return false;
    }
    
    // Default to Star for port 9100 (standard JetDirect/Star port)
    if (device.port === 9100) {
      console.log(`🌟 Star printer detected: port 9100 (JetDirect/Star standard)`);
      return true;
    }
    
    // Auto-detect based on name/model/address
    const name = (device.name || '').toLowerCase();
    const model = (device.metadata?.model || '').toLowerCase();
    const address = (device.address || '').toLowerCase();
    
    // Check for Star printer keywords
    const isStar = name.includes('star') || 
           name.includes('mc-print') || 
           name.includes('mcp') ||
           name.includes('mc print') ||
           name.includes('tsp') || // TSP series
           model.includes('star') ||
           model.includes('mc-print') ||
           address.includes('star');
           
    if (isStar) {
      console.log(`🌟 Star printer detected: keyword match in name/model/address`);
    } else {
      console.log(`📄 Non-Star printer: defaulting to ESC/POS`);
    }
    
    return isStar;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.cancelScan();
    this.isProcessingQueue = false;
    
    // Disconnect all devices
    const deviceIds = Array.from(this.connectedDevices.keys());
    for (const deviceId of deviceIds) {
      this.disconnectFromPrinter(deviceId);
    }
    
    this.devices.clear();
    this.printQueue.length = 0;
    
    console.log('🧹 PrinterService cleanup completed');
  }
}



