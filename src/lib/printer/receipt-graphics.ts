/**
 * Graphics generation for thermal receipts
 * Generates QR codes and handles logo for thermal printers
 */

/**
 * Generate QR code ESC/POS commands for a URL
 * Uses native QR code printing command (Model 2)
 */
export function generateQRCodeESCPOS(url: string, size: number = 6): number[] {
  const commands: number[] = [];
  
  // ESC/POS QR Code commands (Model 2)
  // GS ( k pL pH cn fn n (QR Code commands)
  
  const urlBytes = Array.from(new TextEncoder().encode(url));
  const urlLength = urlBytes.length;
  
  // 1. Select QR code model (Model 2)
  // GS ( k <pL> <pH> <cn=49> <fn=65> <n=50> <m=0>
  commands.push(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  
  // 2. Set QR code module size
  // GS ( k <pL=3> <pH=0> <cn=49> <fn=67> <n=size>
  commands.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);
  
  // 3. Set error correction level (L=48, M=49, Q=50, H=51)
  // GS ( k <pL=3> <pH=0> <cn=49> <fn=69> <n=49> (M level)
  commands.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);
  
  // 4. Store QR code data
  // GS ( k <pL> <pH> <cn=49> <fn=80> <m=48> [data]
  const pL = (urlLength + 3) & 0xFF;
  const pH = ((urlLength + 3) >> 8) & 0xFF;
  commands.push(0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
  commands.push(...urlBytes);
  
  // 5. Print QR code
  // GS ( k <pL=3> <pH=0> <cn=49> <fn=81> <m=48>
  commands.push(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  
  return commands;
}

/**
 * Generate Star printer QR code commands
 */
export function generateQRCodeStar(url: string, model: number = 2, cellSize: number = 4): number[] {
  const commands: number[] = [];
  const encoder = new TextEncoder();
  const urlBytes = Array.from(encoder.encode(url));
  const urlLength = urlBytes.length;
  
  // Star QR code command: ESC GS y S 0 n [data]
  // Model 2, Error correction level M
  commands.push(
    0x1B, 0x1D, 0x79, 0x53, 0x30, // QR code command header
    model, // Model (1 or 2)
    1, // Error correction level (0=L, 1=M, 2=Q, 3=H)
    cellSize, // Cell size (1-8)
    (urlLength & 0xFF), // Data length low byte
    ((urlLength >> 8) & 0xFF) // Data length high byte
  );
  commands.push(...urlBytes);
  
  return commands;
}

/**
 * Generate simple text-based logo for thermal printers
 * Returns array of command bytes
 */
export function generateTextLogo(): number[] {
  const commands: number[] = [];
  const ESC = 0x1B;
  const GS = 0x1D;
  
  // Center alignment
  commands.push(ESC, 0x61, 0x01);
  
  // Set to large bold text for logo
  commands.push(GS, 0x21, 0x11); // Double width and height
  commands.push(ESC, 0x45, 0x01); // Bold on
  
  // Restaurant name
  const logoText = 'Tirvan Kahvila';
  const logoBytes = Array.from(new TextEncoder().encode(logoText));
  commands.push(...logoBytes, 0x0A); // Add newline
  
  // Reset formatting
  commands.push(ESC, 0x45, 0x00); // Bold off
  commands.push(GS, 0x21, 0x00); // Normal size
  
  return commands;
}

/**
 * Simple Tirva logo as ASCII art for thermal printer
 */
export function getTirvaASCIILogo(): string {
  return `
  ╔════════════════════════════════╗
  ║      Tirvan Kahvila         ║
  ╚════════════════════════════════╝
`;
}

/**
 * Get decorative border/separator
 */
export function getDecorativeBorder(width: number = 32): string {
  return '═'.repeat(width);
}

/**
 * Get fancy separator with style
 */
export function getFancySeparator(width: number = 32): string {
  return '─'.repeat(width);
}

/**
 * Generate barcode for order number (Code128)
 */
export function generateBarcodeESCPOS(orderNumber: string): number[] {
  const commands: number[] = [];
  const GS = 0x1D;
  
  // Set barcode height
  commands.push(GS, 0x68, 0x64); // Height = 100 dots
  
  // Set barcode width
  commands.push(GS, 0x77, 0x02); // Width = 2
  
  // Set HRI character position (below barcode)
  commands.push(GS, 0x48, 0x02);
  
  // Set font for HRI characters
  commands.push(GS, 0x66, 0x00); // Font A
  
  // Print barcode (CODE128)
  const dataBytes = Array.from(new TextEncoder().encode(orderNumber));
  commands.push(GS, 0x6B, 0x49, dataBytes.length); // CODE128 = 73 (0x49)
  commands.push(...dataBytes);
  
  return commands;
}



