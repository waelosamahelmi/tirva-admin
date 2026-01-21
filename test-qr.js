/**
 * Star Printer QR Code Test
 * Testing QR code generation with Star native commands
 */

import net from 'net';

const ESC = 0x1B;
const LF = 0x0A;

function encode(text) {
  return Array.from(text).map(c => c.charCodeAt(0));
}

function generateQRTest() {
  const cmd = [];
  
  console.log('Building QR Code test...\n');
  
  // Initialize
  cmd.push(ESC, 0x40);
  
  // Star Line Mode
  cmd.push(ESC, 0x1E, 0x61, 0x00);
  
  // Center alignment
  cmd.push(ESC, 0x1D, 0x61, 0x01);
  
  cmd.push(LF, LF);
  cmd.push(...encode('QR CODE TEST'));
  cmd.push(LF, LF);
  
  // Test 1: Star QR Code (2D barcode)
  console.log('? Generating Star QR Code...');
  
  const url = 'https://tirvankahvila.fi';
  const qrData = encode(url);
  
  // Star QR Code command: ESC GS y S 0
  // Model: L (low error correction)
  // Size: 8 (module size)
  
  // QR Code Start
  cmd.push(ESC, 0x1D, 0x79, 0x53, 0x30); // Start QR
  cmd.push(qrData.length); // Data length
  cmd.push(...qrData); // QR data
  cmd.push(0x1E); // End of data
  
  cmd.push(LF, LF);
  cmd.push(...encode('tirvankahvila.fi'));
  cmd.push(LF, LF, LF);
  
  // Test 2: Alternative QR method - Star 2D Code
  console.log('? Generating 2D Code (alternative)...');
  
  cmd.push(...encode('ALTERNATIVE METHOD:'));
  cmd.push(LF, LF);
  
  // ESC GS ( k - 2D Code
  // Try the full Star 2D barcode command
  const data2 = encode('TEST123');
  
  // Function 165: Set QR Code model
  cmd.push(ESC, 0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  
  // Function 167: Set module size
  cmd.push(ESC, 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08);
  
  // Function 169: Set error correction (L=48, M=49, Q=50, H=51)
  cmd.push(ESC, 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30);
  
  // Function 180: Store data
  const pL = (data2.length + 3) & 0xFF;
  const pH = ((data2.length + 3) >> 8) & 0xFF;
  cmd.push(ESC, 0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
  cmd.push(...data2);
  
  // Function 181: Print QR Code
  cmd.push(ESC, 0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  
  cmd.push(LF, LF);
  cmd.push(...encode('TEST123'));
  cmd.push(LF, LF, LF);
  
  // Test 3: Simple barcode (1D)
  console.log('? Generating 1D Barcode...');
  
  cmd.push(...encode('1D BARCODE:'));
  cmd.push(LF);
  
  // Barcode: CODE39
  cmd.push(ESC, 0x62, 0x35, 0x31, 0x32, 0x37, 0x30); // ESC b (barcode type, width, height)
  cmd.push(...encode('*12345*')); // CODE39 data
  cmd.push(0x1E); // End
  
  cmd.push(LF, LF, LF);
  
  // Feed and cut
  cmd.push(ESC, 0x64, 0x02);
  
  console.log('');
  return Buffer.from(cmd);
}

function sendToPrinter(host, port) {
  console.log(`???  ===== QR CODE TEST =====`);
  console.log(`?? Target: ${host}:${port}\n`);
  
  const receipt = generateQRTest();
  console.log(`?? Generated ${receipt.length} bytes\n`);
  
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
    console.log(`?? Sending QR code commands...\n`);
    
    client.write(receipt, () => {
      console.log(`? Sent successfully!\n`);
      console.log(`Expected output:`);
      console.log(`  1. "QR CODE TEST" header`);
      console.log(`  2. QR code (scannable square)`);
      console.log(`  3. "tirvankahvila.fi" text`);
      console.log(`  4. Alternative QR code method`);
      console.log(`  5. "TEST123" QR code`);
      console.log(`  6. 1D Barcode for "12345"\n`);
      console.log(`Scan the QR codes with your phone!`);
      console.log(`They should open tirvankahvila.fi\n`);
      
      setTimeout(() => {
        client.end();
        process.exit(0);
      }, 1000);
    });
  });
  
  console.log(`?? Connecting...`);
  client.connect(port, host);
}

sendToPrinter('192.168.1.106', 9100);
