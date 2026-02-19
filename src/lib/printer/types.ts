/**
 * Printer Types and Interfaces
 * Production-ready definitions for Android network printing
 */

export interface PrinterDevice {
  id: string;
  name: string;
  type: 'bluetooth' | 'network' | 'cloudprnt';
  address: string;
  port?: number;
  isConnected: boolean;
  status: 'idle' | 'printing' | 'error' | 'offline' | 'connecting';
  capabilities?: PrinterCapabilities;
  metadata?: PrinterMetadata;
  lastError?: string;
  connectionAttempts?: number;
  lastConnected?: Date;
  printerType?: 'star' | 'escpos'; // Explicitly set printer command type
  macAddress?: string; // For CloudPRNT printers
}

export interface PrinterCapabilities {
  paperWidth: number; // in mm
  supportsImages: boolean;
  supportsCLahting: boolean;
  supportsQR: boolean;
  supportsBarcode: boolean;
  maxLineLength: number;
  characterEncoding: 'ASCII' | 'UTF-8' | 'ISO-8859-1';
  cutCommand?: number[];
  initCommand?: number[];
}

export interface PrinterMetadata {
  protocol: string;
  manufacturer?: string;
  model?: string;
  discoveryMethod: string;
  responseTime?: number;
  webInterface?: string;
  confidence: 'high' | 'medium' | 'low';
  workingEndpoints?: string[];
  testResults?: ConnectionTestResult;
  fontSettings?: {
    restaurantName?: { width: number; height: number };
    header?: { width: number; height: number };
    orderNumber?: { width: number; height: number };
    menuItems?: { width: number; height: number };
    toppings?: { width: number; height: number };
    totals?: { width: number; height: number };
    finalTotal?: { width: number; height: number };
    characterSpacing?: number;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  responseTime: number;
  protocol: string;
  endpoints: string[];
  errorMessage?: string;
  timestamp: Date;
}

export interface PrintJob {
  id: string;
  printerId: string;
  content: PrintContent;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface PrintContent {
  type: 'receipt' | 'test' | 'text';
  data: ReceiptData | string | Uint8Array;
  originalOrder?: any; // Original order data for enhanced formatting
}

export interface ReceiptData {
  header: ReceiptSection;
  items: ReceiptItem[];
  footer: ReceiptSection;
  total: number;
  orderNumber: string;
  timestamp: Date;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderType?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  tableNumber?: string;
  // Branch information (loaded from database)
  branchName?: string;
  branchAddress?: string;
  branchCity?: string;
  branchPostalCode?: string;
  branchPhone?: string;
  branchEmail?: string;
}

export interface ReceiptSection {
  text: string;
  alignment?: 'left' | 'center' | 'right';
  fontSize?: 'small' | 'normal' | 'large';
  bold?: boolean;
  underline?: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  toppings?: Array<{
    name: string;
    price: number;
  }>;
  totalPrice: number;
  notes?: string;
}

export interface NetworkScanOptions {
  networkBase?: string;
  targetIPs?: string[];
  ports?: number[];
  timeout?: number;
  maxConcurrent?: number;
  retries?: number;
}

export interface ScanProgress {
  current: number;
  total: number;
  message: string;
  discovered: number;
  errors: number;
}

export interface AndroidBridge {
  sendRawDataToPrinter(address: string, port: number, base64Data: string): Promise<boolean>;
  testPrinterConnection(address: string, port: number): Promise<boolean>;
  getNetworkInfo(): Promise<string>;
  testNetworkConnectivity(): Promise<boolean>;
  sendDataToPrinterAdvanced(address: string, port: number, base64Data: string, timeout: number): Promise<string>;
  getBridgeInfo(): Promise<string>;
}

export interface PrinterServiceError extends Error {
  code: string;
  details?: any;
}

export class PrinterError extends Error implements PrinterServiceError {
  code: string;
  details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'PrinterError';
    this.code = code;
    this.details = details;
  }
}

// Error codes
export const ERROR_CODES = {
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  PRINT_FAILED: 'PRINT_FAILED',
  TIMEOUT: 'TIMEOUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_DATA: 'INVALID_DATA',
  DEVICE_BUSY: 'DEVICE_BUSY',
  SCAN_IN_PROGRESS: 'SCAN_IN_PROGRESS',
  BRIDGE_NOT_AVAILABLE: 'BRIDGE_NOT_AVAILABLE'
} as const;

// Printer port configurations
export const PRINTER_PORTS = [
  { port: 9100, protocol: 'RAW/JetDirect', priority: 1, timeout: 3000 },
  { port: 631, protocol: 'IPP/CUPS', priority: 2, timeout: 3000 },
  { port: 80, protocol: 'HTTP', priority: 3, timeout: 2000 },
  { port: 515, protocol: 'LPD/LPR', priority: 4, timeout: 3000 },
  { port: 8080, protocol: 'HTTP-Alt', priority: 5, timeout: 2000 }
] as const;

// ESC/POS Commands
export const ESC_POS = {
  INIT: [0x1B, 0x40], // ESC @ - Initialize printer
  SET_CODEPAGE_CP850: [0x1B, 0x74, 0x02], // ESC t 2 - Set CP850 code page for European characters
  ALIGN_LEFT: [0x1B, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [0x1B, 0x61, 0x01], // ESC a 1  
  ALIGN_RIGHT: [0x1B, 0x61, 0x02], // ESC a 2
  BOLD_ON: [0x1B, 0x45, 0x01], // ESC E 1
  BOLD_OFF: [0x1B, 0x45, 0x00], // ESC E 0
  UNDERLINE_ON: [0x1B, 0x2D, 0x01], // ESC - 1
  UNDERLINE_OFF: [0x1B, 0x2D, 0x00], // ESC - 0
  SIZE_NORMAL: [0x1D, 0x21, 0x00], // GS ! 0
  SIZE_DOUBLE_HEIGHT: [0x1D, 0x21, 0x01], // GS ! 1
  SIZE_DOUBLE_WIDTH: [0x1D, 0x21, 0x10], // GS ! 16
  SIZE_DOUBLE_BOTH: [0x1D, 0x21, 0x11], // GS ! 17
  CUT_PAPER: [0x1D, 0x56, 0x01], // GS V 1 - Partial cut
  CUT_PAPER_FULL: [0x1D, 0x56, 0x00], // GS V 0 - Full cut
  FEED_LINE: [0x0A], // LF
  FEED_LINES: (lines: number) => [0x1B, 0x64, lines], // ESC d n
} as const;



