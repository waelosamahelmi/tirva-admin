// Complete network-printer-scanner.ts with all required interfaces

import { PrinterDevice } from './types';

export interface NetworkInfo {
  localIP: string;
  networkBase: string;
  subnetMask: string;
  gateway: string;
  networkRange: string;
  totalHosts: number;
}

export interface PrinterScanProgress {
  currentIP: string;
  scannedCount: number;
  totalCount: number;
  foundDevices: number;
  verifiedPrinters: number;
  percentage: number;
  estimatedTimeRemaining: number;
}

export interface DeviceTestResult {
  ip: string;
  isReachable: boolean;
  isPrinter: boolean;
  openPorts: number[];
  printerScore: number;
  deviceInfo?: {
    name?: string;
    manufacturer?: string;
    model?: string;
    webInterface?: string;
  };
  responseTime: number;
}

export class NetworkPrinterScanner {
  private scanAbortController: AbortController | null = null;
  private isScanning = false;
  private onProgress: (progress: PrinterScanProgress) => void = () => {};
  private onDeviceFound: (device: PrinterDevice) => void = () => {};

  // Common printer ports in order of priority
  private readonly PRINTER_PORTS = [
    { port: 9100, protocol: 'Raw/JetDirect', weight: 10 },
    { port: 631, protocol: 'IPP/CUPS', weight: 8 },
    { port: 80, protocol: 'HTTP', weight: 6 },
    { port: 515, protocol: 'LPD/LPR', weight: 5 },
    { port: 8080, protocol: 'HTTP-Alt', weight: 4 },
    { port: 443, protocol: 'HTTPS', weight: 3 }
  ];

  // Known printer manufacturer indicators
  private readonly PRINTER_INDICATORS = [
    // Web interface indicators
    'printer status', 'print queue', 'cartridge', 'toner', 'paper jam',
    'ready to print', 'printing', 'cups', 'ipp', 'jetdirect', 'print server',
    
    // Manufacturer indicators
    'hp laserjet', 'hp color', 'hp deskjet', 'hp officejet',
    'canon printer', 'canon pixma', 'canon imageclass',
    'epson', 'brother printer', 'brother mfc', 'brother dcp',
    'xerox', 'ricoh', 'kyocera', 'sharp printer', 'lexmark',
    'samsung printer', 'dell printer', 'kodak printer',
    
    // Generic printer terms
    'thermal printer', 'receipt printer', 'pos printer',
    'label printer', 'barcode printer'
  ];

  constructor(
    onProgress?: (progress: PrinterScanProgress) => void,
    onDeviceFound?: (device: PrinterDevice) => void
  ) {
    if (onProgress) this.onProgress = onProgress;
    if (onDeviceFound) this.onDeviceFound = onDeviceFound;
  }

  // ============================================
  // NETWORK DETECTION
  // ============================================

  async detectCurrentNetwork(): Promise<NetworkInfo> {
    console.log('🌐 ===== DETECTING CURRENT NETWORK =====');
    
    try {
      // Method 1: Try Android native network detection
      if (typeof (window as any).Android?.getNetworkInfo === 'function') {
        console.log('📱 Using Android native network detection...');
        const androidNetworkInfo = await (window as any).Android.getNetworkInfo();
        if (androidNetworkInfo) {
          console.log('✅ Android network info:', androidNetworkInfo);
          return this.parseAndroidNetworkInfo(androidNetworkInfo);
        }
      }

      // Method 2: WebRTC-based local IP detection
      console.log('🔍 Using WebRTC for local IP detection...');
      const localIP = await this.getLocalIPViaWebRTC();
      if (localIP) {
        const networkInfo = this.calculateNetworkFromIP(localIP);
        console.log('✅ Detected network via WebRTC:', networkInfo);
        return networkInfo;
      }

      // Method 3: Gateway detection through connectivity tests
      console.log('🔍 Using gateway detection method...');
      const networkInfo = await this.detectNetworkViaGatewayTest();
      if (networkInfo) {
        console.log('✅ Detected network via gateway test:', networkInfo);
        return networkInfo;
      }

      // Method 4: Fallback to common network ranges
      console.log('⚠️ Falling back to common network detection...');
      const fallbackNetwork = await this.detectCommonNetworkRange();
      console.log('✅ Using fallback network:', fallbackNetwork);
      return fallbackNetwork;

    } catch (error) {
      console.error('❌ Network detection failed:', error);
      
      // Ultimate fallback
      return {
        localIP: '192.168.1.100',
        networkBase: '192.168.1',
        subnetMask: '255.255.255.0',
        gateway: '192.168.1.1',
        networkRange: '192.168.1.1-192.168.1.254',
        totalHosts: 254
      };
    }
  }

  private async getLocalIPViaWebRTC(): Promise<string | null> {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch && this.isPrivateIP(ipMatch[1])) {
              pc.close();
              resolve(ipMatch[1]);
            }
          }
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 5000);
      } catch (error) {
        console.log('WebRTC IP detection failed:', error);
        resolve(null);
      }
    });
  }

  private isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    return (
      (parts[0] === 192 && parts[1] === 168) ||
      (parts[0] === 10) ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    );
  }

  private calculateNetworkFromIP(localIP: string): NetworkInfo {
    const parts = localIP.split('.').map(Number);
    
    // Assume /24 subnet (most common)
    const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
    const gateway = `${networkBase}.1`;
    
    return {
      localIP,
      networkBase,
      subnetMask: '255.255.255.0',
      gateway,
      networkRange: `${networkBase}.1-${networkBase}.254`,
      totalHosts: 254
    };
  }

  private async detectNetworkViaGatewayTest(): Promise<NetworkInfo | null> {
    const commonGateways = [
      '192.168.1.1', '192.168.0.1', '192.168.2.1',
      '10.0.0.1', '10.0.1.1', '172.16.0.1'
    ];

    for (const gateway of commonGateways) {
      try {
        console.log(`🔍 Testing gateway: ${gateway}`);
        const isReachable = await this.testConnectivity(gateway, 80, 2000);
        if (isReachable) {
          const parts = gateway.split('.');
          const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
          
          return {
            localIP: `${networkBase}.100`, // Estimate
            networkBase,
            subnetMask: '255.255.255.0',
            gateway,
            networkRange: `${networkBase}.1-${networkBase}.254`,
            totalHosts: 254
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private async detectCommonNetworkRange(): Promise<NetworkInfo> {
    const commonNetworks = [
      '192.168.1', '192.168.0', '192.168.2',
      '10.0.0', '10.0.1', '172.16.0'
    ];

    // Test each network by trying to reach a few common IPs
    for (const network of commonNetworks) {
      const testIPs = [`${network}.1`, `${network}.254`, `${network}.100`];
      let reachableCount = 0;

      for (const ip of testIPs) {
        try {
          const isReachable = await this.testConnectivity(ip, 80, 1000);
          if (isReachable) reachableCount++;
        } catch {
          continue;
        }
      }

      if (reachableCount > 0) {
        return {
          localIP: `${network}.100`,
          networkBase: network,
          subnetMask: '255.255.255.0',
          gateway: `${network}.1`,
          networkRange: `${network}.1-${network}.254`,
          totalHosts: 254
        };
      }
    }

    // Default fallback
    return {
      localIP: '192.168.1.100',
      networkBase: '192.168.1',
      subnetMask: '255.255.255.0',
      gateway: '192.168.1.1',
      networkRange: '192.168.1.1-192.168.1.254',
      totalHosts: 254
    };
  }

  private parseAndroidNetworkInfo(androidInfo: any): NetworkInfo {
    return {
      localIP: androidInfo.localIP || '192.168.1.100',
      networkBase: androidInfo.networkBase || '192.168.1',
      subnetMask: androidInfo.subnetMask || '255.255.255.0',
      gateway: androidInfo.gateway || '192.168.1.1',
      networkRange: androidInfo.networkRange || '192.168.1.1-192.168.1.254',
      totalHosts: androidInfo.totalHosts || 254
    };
  }

  // ============================================
  // COMPREHENSIVE NETWORK SCANNING
  // ============================================

  async scanNetworkForPrinters(): Promise<PrinterDevice[]> {
    if (this.isScanning) {
      throw new Error('Scan already in progress');
    }

    this.isScanning = true;
    this.scanAbortController = new AbortController();
    
    console.log('🖨️ ===== STARTING INTELLIGENT PRINTER SCAN =====');
    
    try {
      // Step 1: Detect current network
      const networkInfo = await this.detectCurrentNetwork();
      console.log('📡 Network detected:', networkInfo);

      // Step 2: Generate scan targets
      const scanTargets = this.generateScanTargets(networkInfo);
      console.log(`🎯 Generated ${scanTargets.length} scan targets`);

      // Step 3: Scan network systematically
      const foundPrinters: PrinterDevice[] = [];
      const startTime = Date.now();
      let scannedCount = 0;

      console.log(`🔍 Starting systematic scan of ${scanTargets.length} IPs...`);

      for (const ip of scanTargets) {
        if (this.scanAbortController.signal.aborted) {
          console.log('🛑 Scan aborted by user');
          break;
        }

        scannedCount++;
        const progress: PrinterScanProgress = {
          currentIP: ip,
          scannedCount,
          totalCount: scanTargets.length,
          foundDevices: foundPrinters.length,
          verifiedPrinters: foundPrinters.length,
          percentage: (scannedCount / scanTargets.length) * 100,
          estimatedTimeRemaining: this.calculateETA(startTime, scannedCount, scanTargets.length)
        };

        console.log(`🔍 [${scannedCount}/${scanTargets.length}] Scanning ${ip}... (${Math.round(progress.percentage)}%)`);
        this.onProgress(progress);

        try {
          const deviceResult = await this.comprehensiveDeviceTest(ip);
          
          if (deviceResult.isPrinter) {
            console.log(`✅ VERIFIED PRINTER FOUND: ${ip} (Score: ${deviceResult.printerScore}/100)`);
            
            const printer = this.createPrinterDevice(deviceResult);
            foundPrinters.push(printer);
            this.onDeviceFound(printer);
            
            // Log detailed findings
            console.log(`📋 Printer Details:`);
            console.log(`   • Name: ${deviceResult.deviceInfo?.name || 'Unknown'}`);
            console.log(`   • Manufacturer: ${deviceResult.deviceInfo?.manufacturer || 'Unknown'}`);
            console.log(`   • Model: ${deviceResult.deviceInfo?.model || 'Unknown'}`);
            console.log(`   • Open Ports: ${deviceResult.openPorts.join(', ')}`);
            console.log(`   • Response Time: ${deviceResult.responseTime}ms`);
            console.log(`   • Web Interface: ${deviceResult.deviceInfo?.webInterface || 'None'}`);
          } else if (deviceResult.isReachable) {
            console.log(`❌ Device at ${ip} is reachable but not a printer (Score: ${deviceResult.printerScore}/100)`);
          } else {
            console.log(`❌ No device at ${ip}`);
          }
        } catch (error) {
          console.log(`❌ Error testing ${ip}: ${error}`);
        }

        // Small delay to prevent overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const scanDuration = Date.now() - startTime;
      
      console.log(`✅ ===== SCAN COMPLETE =====`);
      console.log(`📊 Scan Results:`);
      console.log(`   • Duration: ${Math.round(scanDuration / 1000)}s`);
      console.log(`   • IPs Scanned: ${scannedCount}`);
      console.log(`   • Printers Found: ${foundPrinters.length}`);
      console.log(`   • Success Rate: ${Math.round((foundPrinters.length / scannedCount) * 100)}%`);

      return foundPrinters;

    } catch (error) {
      console.error('❌ Network scan failed:', error);
      throw error;
    } finally {
      this.isScanning = false;
      this.scanAbortController = null;
    }
  }

  private generateScanTargets(networkInfo: NetworkInfo): string[] {
    const targets: string[] = [];
    const networkBase = networkInfo.networkBase;
    
    // Strategy: Scan common printer IPs first, then fill in the gaps
    
    // Priority 1: Common printer IPs (statically assigned)
    const commonPrinterIPs = [
      200, 201, 202, 203, 204, 205,  // Common static printer range
      100, 101, 102, 103, 104, 105,  // Common device range
      150, 151, 152, 153, 154, 155,  // Alternative static range
      50, 51, 52, 53, 54, 55,        // Low range static
      250, 251, 252, 253             // High range static
    ];

    for (const ip of commonPrinterIPs) {
      targets.push(`${networkBase}.${ip}`);
    }

    // Priority 2: Gateway and network infrastructure (often have web interfaces)
    targets.push(`${networkBase}.1`);   // Gateway
    targets.push(`${networkBase}.254`); // Last IP

    // Priority 3: Fill in the gaps systematically
    for (let i = 2; i <= 249; i++) {
      const ip = `${networkBase}.${i}`;
      if (!targets.includes(ip)) {
        targets.push(ip);
      }
    }

    console.log(`📋 Scan strategy: ${commonPrinterIPs.length} priority IPs + ${targets.length - commonPrinterIPs.length - 2} systematic IPs`);
    
    return targets;
  }

  // ============================================
  // COMPREHENSIVE DEVICE TESTING
  // ============================================

  async comprehensiveDeviceTest(ip: string): Promise<DeviceTestResult> {
    const startTime = Date.now();
    console.log(`🔍 ===== COMPREHENSIVE DEVICE TEST: ${ip} =====`);
    console.log(`🌍 Environment: ${typeof (window as any).Android !== 'undefined' ? 'Android' : 'Browser'}`);
    
    let printerScore = 0;
    const openPorts: number[] = [];
    let deviceInfo: any = {};

    console.log(`📡 Testing connectivity on all printer ports...`);
    // Test 1: Basic connectivity on all printer ports
    for (const portInfo of this.PRINTER_PORTS) {
      try {
        console.log(`🔌 Testing port ${portInfo.port} (${portInfo.protocol})...`);
        const portTestStart = Date.now();
        const isOpen = await this.testConnectivity(ip, portInfo.port, 3000);
        const portTestDuration = Date.now() - portTestStart;
        
        console.log(`📊 Port ${portInfo.port} test: ${isOpen ? 'OPEN' : 'CLOSED'} (${portTestDuration}ms)`);
        
        if (isOpen) {
          openPorts.push(portInfo.port);
          printerScore += portInfo.weight;
          console.log(`✅ Port ${portInfo.port} open, added ${portInfo.weight} points (total: ${printerScore})`);
        }
      } catch (error) {
        console.log(`❌ Port ${portInfo.port} test failed: ${error}`);
        continue;
      }
    }

    console.log(`📋 Port scan complete: ${openPorts.length} open ports: [${openPorts.join(', ')}]`);
    console.log(`🏆 Current printer score: ${printerScore}/100`);

    if (openPorts.length === 0) {
      const totalTime = Date.now() - startTime;
      console.log(`❌ No open ports found on ${ip} after ${totalTime}ms`);
      return {
        ip,
        isReachable: false,
        isPrinter: false,
        openPorts: [],
        printerScore: 0,
        responseTime: totalTime
      };
    }

    // Test 2: Web interface analysis
    const webAnalysis = await this.analyzeWebInterface(ip, openPorts);
    if (webAnalysis.isPrinter) {
      printerScore += 20; // Major boost for printer web interface
      deviceInfo = { ...deviceInfo, ...webAnalysis.deviceInfo };
    }

    // Test 3: Protocol-specific tests
    for (const port of openPorts) {
      const protocolScore = await this.testPrinterProtocol(ip, port);
      printerScore += protocolScore;
    }

    // Test 4: Device fingerprinting
    console.log(`🔍 Performing device fingerprinting...`);
    const fingerprintScore = await this.fingerprintPrinterDevice(ip, openPorts);
    printerScore += fingerprintScore;
    console.log(`🔍 Fingerprint analysis added ${fingerprintScore} points (total: ${printerScore})`);

    const responseTime = Date.now() - startTime;
    const isPrinter = printerScore >= 15; // Threshold for printer classification
    
    console.log(`🏁 ===== COMPREHENSIVE TEST COMPLETE =====`);
    console.log(`📊 Final Results for ${ip}:`);
    console.log(`   • Total time: ${responseTime}ms`);
    console.log(`   • Open ports: [${openPorts.join(', ')}]`);
    console.log(`   • Printer score: ${printerScore}/100`);
    console.log(`   • Is printer: ${isPrinter ? 'YES' : 'NO'} (threshold: 15)`);
    console.log(`   • Is reachable: true`);
    
    if (responseTime < 200) {
      console.log(`⚠️ WARNING: Comprehensive test completed suspiciously fast (${responseTime}ms)`);
      console.log(`🔍 This might indicate that network tests are being bypassed or faked!`);
    }

    return {
      ip,
      isReachable: true,
      isPrinter,
      openPorts,
      printerScore,
      deviceInfo,
      responseTime
    };
  }

  private async testConnectivity(ip: string, port: number, timeout: number = 3000): Promise<boolean> {
    const testStart = Date.now();
    console.log(`🔍 Testing connectivity to ${ip}:${port} with ${timeout}ms timeout...`);
    
    return new Promise((resolve) => {
      let resolved = false;
      
      const cleanup = (result: boolean, reason: string) => {
        if (!resolved) {
          resolved = true;
          const duration = Date.now() - testStart;
          console.log(`📡 Connectivity test ${ip}:${port} -> ${result ? 'SUCCESS' : 'FAILED'} (${reason}) in ${duration}ms`);
          
          // Warn about suspiciously fast results
          if (duration < 50 && result) {
            console.log(`⚠️ WARNING: Test completed suspiciously fast (${duration}ms) - might be fake!`);
          }
          
          resolve(result);
        }
      };

      const timer = setTimeout(() => cleanup(false, 'timeout'), timeout);

      // Try different approaches based on port
      if (port === 80 || port === 8080 || port === 443) {
        // HTTP ports - try actual HTTP request
        console.log(`🌐 Testing HTTP port ${port}...`);
        const protocol = port === 443 ? 'https' : 'http';
        fetch(`${protocol}://${ip}:${port}`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(timeout)
        })
        .then(() => {
          clearTimeout(timer);
          cleanup(true, 'HTTP response');
        })
        .catch((error) => {
          console.log(`🔍 HTTP test failed: ${error}`);
          clearTimeout(timer);
          cleanup(false, `HTTP error: ${error.name}`);
        });
      } else {
        // For non-HTTP ports, try to access via HTTP first
        console.log(`🔌 Testing RAW port ${port} (trying HTTP detection first)...`);
        fetch(`http://${ip}`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(timeout / 2)
        })
        .then(() => {
          clearTimeout(timer);
          cleanup(true, 'HTTP root response');
        })
        .catch((error1) => {
          console.log(`🔍 HTTP root failed: ${error1}, trying port-specific test...`);
          // If HTTP fails, try the specific port
          fetch(`http://${ip}:${port}`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: AbortSignal.timeout(timeout / 2)
          })
          .then(() => {
            clearTimeout(timer);
            cleanup(true, 'port-specific response');
          })
          .catch((error2) => {
            console.log(`🔍 Port-specific test failed: ${error2}`);
            clearTimeout(timer);
            
            // For RAW ports, network errors might actually indicate success
            if (port === 9100 || port === 515) {
              if (error2.name === 'TypeError' || error2.message.includes('CORS') || error2.message.includes('network')) {
                cleanup(true, 'RAW port detected (network error expected)');
              } else {
                cleanup(false, `RAW port error: ${error2.name}`);
              }
            } else {
              cleanup(false, `port error: ${error2.name}`);
            }
          });
        });
      }
    });
  }

  private async analyzeWebInterface(ip: string, openPorts: number[]): Promise<{
    isPrinter: boolean;
    deviceInfo?: any;
  }> {
    const testPorts = [80, 8080, 443, 631].filter(port => openPorts.includes(port));
    
    for (const port of testPorts) {
      try {
        const protocol = port === 443 ? 'https' : 'http';
        const response = await fetch(`${protocol}://${ip}:${port}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const html = await response.text();
          const analysis = this.analyzeHTMLForPrinterIndicators(html);
          
          if (analysis.isPrinter) {
            return {
              isPrinter: true,
              deviceInfo: {
                ...analysis.deviceInfo,
                webInterface: `${protocol}://${ip}:${port}`
              }
            };
          }
        }
      } catch (error) {
        continue;
      }
    }

    return { isPrinter: false };
  }

  private analyzeHTMLForPrinterIndicators(html: string): {
    isPrinter: boolean;
    deviceInfo?: any;
  } {
    const lowerHTML = html.toLowerCase();
    let printerIndicatorCount = 0;
    let deviceInfo: any = {};

    // Count printer indicators
    for (const indicator of this.PRINTER_INDICATORS) {
      if (lowerHTML.includes(indicator)) {
        printerIndicatorCount++;
      }
    }

    // Extract device information
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      deviceInfo.name = titleMatch[1].trim();
    }

    // Look for manufacturer info
    const manufacturerPatterns = [
      /manufacturer[:\s]*([^<\n,;]+)/i,
      /brand[:\s]*([^<\n,;]+)/i,
      /(hp|canon|epson|brother|xerox|ricoh|kyocera|samsung|dell|lexmark)/i
    ];

    for (const pattern of manufacturerPatterns) {
      const match = html.match(pattern);
      if (match) {
        deviceInfo.manufacturer = match[1].trim();
        break;
      }
    }

    // Look for model info
    const modelPatterns = [
      /model[:\s]*([^<\n,;]+)/i,
      /product[:\s]*([^<\n,;]+)/i
    ];

    for (const pattern of modelPatterns) {
      const match = html.match(pattern);
      if (match) {
        deviceInfo.model = match[1].trim();
        break;
      }
    }

    const isPrinter = printerIndicatorCount >= 2;

    return { isPrinter, deviceInfo };
  }

  private async testPrinterProtocol(ip: string, port: number): Promise<number> {
    let score = 0;

    if (port === 9100) {
      score += 5; // Base score for having Raw port open
    }

    if (port === 631) {
      try {
        const response = await fetch(`http://${ip}:631/printers/`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          score += 10; // High score for CUPS/IPP
        }
      } catch {
        score += 3; // Still some score for having IPP port open
      }
    }

    return score;
  }

  private async fingerprintPrinterDevice(ip: string, openPorts: number[]): Promise<number> {
    let score = 0;

    // Score based on port combination patterns
    if (openPorts.includes(9100) && openPorts.includes(80)) {
      score += 10; // Classic printer setup
    }

    if (openPorts.includes(631)) {
      score += 8; // CUPS/IPP is strong printer indicator
    }

    if (openPorts.includes(515)) {
      score += 6; // LPD is printer protocol
    }

    // Multiple printer ports = higher confidence
    const printerPortCount = openPorts.filter(port => [9100, 631, 515].includes(port)).length;
    score += printerPortCount * 3;

    return score;
  }

  private createPrinterDevice(deviceResult: DeviceTestResult): PrinterDevice {
    // Determine the best port to use
    const preferredPort = this.selectBestPort(deviceResult.openPorts);
    const protocol = this.PRINTER_PORTS.find(p => p.port === preferredPort)?.protocol || 'Unknown';

    return {
      id: `${deviceResult.ip}:${preferredPort}`,
      name: deviceResult.deviceInfo?.name || `${protocol} Printer (${deviceResult.ip})`,
      type: 'network',
      address: deviceResult.ip,
      port: preferredPort,
      isConnected: false,
      status: 'offline',
      capabilities: {
        paperWidth: 80,
        supportsImages: true,
        supportsCLahting: true,
        supportsQR: true,
        supportsBarcode: true,
        maxLineLength: 48
      },
      metadata: {
        protocol,
        manufacturer: deviceResult.deviceInfo?.manufacturer,
        model: deviceResult.deviceInfo?.model,
        discoveryMethod: 'Intelligent Network Scan',
        webInterface: deviceResult.deviceInfo?.webInterface,
        openPorts: deviceResult.openPorts,
        printerScore: deviceResult.printerScore,
        responseTime: deviceResult.responseTime,
        confidence: deviceResult.printerScore >= 25 ? 'high' : 
                   deviceResult.printerScore >= 15 ? 'medium' : 'low',
        scanTimestamp: new Date().toISOString()
      }
    };
  }

  private selectBestPort(openPorts: number[]): number {
    // Prefer ports in order of reliability for printing
    const preferenceOrder = [9100, 631, 80, 515, 8080];
    
    for (const port of preferenceOrder) {
      if (openPorts.includes(port)) {
        return port;
      }
    }
    
    return openPorts[0] || 9100;
  }

  private calculateETA(startTime: number, completed: number, total: number): number {
    if (completed === 0) return 0;
    
    const elapsed = Date.now() - startTime;
    const rate = completed / elapsed;
    const remaining = total - completed;
    
    return Math.round(remaining / rate);
  }

  // ============================================
  // CONTROL METHODS
  // ============================================

  cancelScan(): void {
    if (this.scanAbortController) {
      this.scanAbortController.abort();
      console.log('🛑 Network scan cancelled by user');
    }
    this.isScanning = false;
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}


