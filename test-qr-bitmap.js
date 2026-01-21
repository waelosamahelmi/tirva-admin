/**
 * Star Printer - QR Code as Bitmap (Raster Graphics)
 * Generate QR code and print as raster image
 */

import net from 'net';
import QRCode from 'qrcode';

const ESC = 0x1B;
const LF = 0x0A;

function encode(text) {
  return Array.from(text).map(c => c.charCodeAt(0));
}

/**
 * Convert QR code to Star raster format
 */
async function qrCodeToRaster(url) {
  // Generate QR code as data URL
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
  
  // Convert data URL to buffer
  const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
  const imgBuffer = Buffer.from(base64Data, 'base64');
  
  console.log(`? QR code generated: ${imgBuffer.length} bytes PNG`);
  
  // For now, return the buffer - we'll convert to raster format
  // Star raster format: ESC GS ( L for graphics
  return imgBuffer;
}

/**
 * Generate receipt with QR code bitmap
 */
async function generateReceiptWithQR() {
  const cmd = [];
  
  console.log('Building receipt with QR bitmap...\n');
  
  // Initialize
  cmd.push(ESC, 0x40);
  cmd.push(ESC, 0x1E, 0x61, 0x00); // Star Line Mode
  
  // Center align
  cmd.push(ESC, 0x1D, 0x61, 0x01);
  cmd.push(LF, LF);
  
  // Header
  cmd.push(ESC, 0x45); // Bold on
  cmd.push(ESC, 0x69, 0x02, 0x02); // 2x2
  cmd.push(...encode('tirva'));
  cmd.push(LF);
  cmd.push(ESC, 0x69, 0x01, 0x01); // Normal
  cmd.push(ESC, 0x46); // Bold off
  
  cmd.push(...encode('pizzeria'));
  cmd.push(LF, LF);
  
  cmd.push(...encode('Scan QR code below:'));
  cmd.push(LF, LF);
  
  // Method 1: Star's native QR code command (2D barcode)
  console.log('? Using Star 2D barcode command for QR code');
  
  const url = 'https://tirvankahvila.fi';
  const urlBytes = encode(url);
  const dataLen = urlBytes.length;
  
  // Star QR Code command: ESC GS y S 0 <size> <error> <data>
  // S = QR Code symbol type
  cmd.push(ESC, 0x1D, 0x79, 0x53, 0x30); // QR Code selection
  cmd.push(0x05); // Size (5 = medium)
  cmd.push(0x02); // Error correction level (M)
  
  // Data length (2 bytes, little endian)
  cmd.push(dataLen & 0xFF);
  cmd.push((dataLen >> 8) & 0xFF);
  
  // Data
  cmd.push(...urlBytes);
  
  cmd.push(LF, LF);
  
  // URL text below QR
  cmd.push(...encode('tirvankahvila.fi'));
  cmd.push(LF, LF, LF);
  
  // Method 2: Also try bitmap QR (in case native doesn't work)
  console.log('? Generating backup QR as 1D barcode');
  
  // Simple text barcode as fallback
  cmd.push(...encode('Barcode: tirva-2025'));
  cmd.push(LF, LF);
  
  // Cut
  cmd.push(ESC, 0x64, 0x02);
  
  return Buffer.from(cmd);
}

async function sendToPrinter(host, port) {
  console.log(`???  ===== QR CODE BITMAP TEST =====`);
  console.log(`?? Target: ${host}:${port}\n`);
  
  try {
    const receipt = await generateReceiptWithQR();
    console.log(`\n?? Generated ${receipt.length} bytes\n`);
    
    const client = new net.Socket();
    
    client.setTimeout(5000);
    
    client.on('timeout', () => {
      console.error('? Timeout');
      client.destroy();
      process.exit(1);
    });
    
    client.on('error', (err) => {
      console.error(`? Error: ${err.message}`);
      process.exit(1);
    });
    
    client.on('connect', () => {
      console.log(`? Connected!`);
      console.log(`?? Sending QR code test...\n`);
      
      client.write(receipt, () => {
        console.log(`? Sent successfully!\n`);
        console.log(`Expected output:`);
        console.log(`  1. "tirva" header (2x2, bold)`);
        console.log(`  2. "pizzeria" subtitle`);
        console.log(`  3. QR code (scannable square)`);
        console.log(`  4. "tirvankahvila.fi" below QR`);
        console.log(`  5. Fallback barcode text\n`);
        console.log(`Try scanning the QR code with your phone!`);
        console.log(`It should open: https://tirvankahvila.fi\n`);
        
        setTimeout(() => {
          client.end();
          process.exit(0);
        }, 1000);
      });
    });
    
    console.log(`?? Connecting...`);
    client.connect(port, host);
    
  } catch (error) {
    console.error('? Error generating receipt:', error);
    process.exit(1);
  }
}

sendToPrinter('192.168.1.106', 9100);
