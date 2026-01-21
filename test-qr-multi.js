/**
 * Star Printer - QR Code Multi-Method Test
 * Try different QR code commands to find which works
 */

import net from 'net';

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function encode(text) {
  return Array.from(text).map(c => c.charCodeAt(0));
}

function generateQRTests() {
  const cmd = [];
  const url = 'https://tirva.fi';
  const urlBytes = encode(url);
  
  // Initialize
  cmd.push(ESC, 0x40);
  cmd.push(ESC, 0x1D, 0x61, 0x01); // Center
  
  cmd.push(...encode('QR CODE TESTS'));
  cmd.push(LF, LF);
  
  // METHOD 1: ESC/POS Standard QR Code (GS ( k)
  console.log('Method 1: ESC/POS QR Code (GS ( k)');
  cmd.push(...encode('Method 1: ESC/POS'));
  cmd.push(LF);
  
  const pL1 = (urlBytes.length + 3) % 256;
  const pH1 = Math.floor((urlBytes.length + 3) / 256);
  
  // Model
  cmd.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  // Size (8 = module size)
  cmd.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08);
  // Error correction (48 = L, 49 = M, 50 = Q, 51 = H)
  cmd.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30);
  // Store data
  cmd.push(GS, 0x28, 0x6B, pL1, pH1, 0x31, 0x50, 0x30, ...urlBytes);
  // Print
  cmd.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  cmd.push(LF, LF);
  
  // METHOD 2: Star Native QR (ESC GS y S 0)
  console.log('Method 2: Star Native QR (ESC GS y S 0)');
  cmd.push(...encode('Method 2: Star Native'));
  cmd.push(LF);
  
  const pL2 = (urlBytes.length + 2) % 256;
  const pH2 = Math.floor((urlBytes.length + 2) / 256);
  
  cmd.push(ESC, 0x1D, 0x79, 0x53, 0x30, 0x00); // Model 2
  cmd.push(ESC, 0x1D, 0x79, 0x53, 0x31, 0x08); // Size 8
  cmd.push(ESC, 0x1D, 0x79, 0x53, 0x32, 0x30); // Error correction L
  cmd.push(ESC, 0x1D, 0x79, 0x44, 0x31, 0x00, pL2, pH2, ...urlBytes);
  cmd.push(ESC, 0x1D, 0x79, 0x50);
  cmd.push(LF, LF);
  
  // METHOD 3: Star QR with different syntax
  console.log('Method 3: Star QR alternate');
  cmd.push(...encode('Method 3: Star Alt'));
  cmd.push(LF);
  
  // QR Code command: ESC GS y S
  cmd.push(ESC, 0x1D, 0x79, 0x53);
  cmd.push(0x30); // Function 0 - Model
  cmd.push(0x02); // Model 2
  
  cmd.push(ESC, 0x1D, 0x79, 0x53);
  cmd.push(0x31); // Function 1 - Module size
  cmd.push(0x05); // Size 5
  
  cmd.push(ESC, 0x1D, 0x79, 0x53);
  cmd.push(0x32); // Function 2 - Error correction
  cmd.push(0x31); // Level M
  
  cmd.push(ESC, 0x1D, 0x79, 0x44);
  cmd.push(0x31); // Function D1 - Store data
  cmd.push(0x00); // Padding
  const len = urlBytes.length;
  cmd.push(len % 256, Math.floor(len / 256));
  cmd.push(...urlBytes);
  
  cmd.push(ESC, 0x1D, 0x79, 0x50); // Print
  cmd.push(LF, LF);
  
  // METHOD 4: Simple GS k (older style)
  console.log('Method 4: GS k QR');
  cmd.push(...encode('Method 4: GS k'));
  cmd.push(LF);
  
  cmd.push(GS, 0x6B, 0x09); // QR Code type 9
  cmd.push(urlBytes.length);
  cmd.push(...urlBytes);
  cmd.push(LF, LF);
  
  cmd.push(LF, LF, LF);
  cmd.push(...encode('Check which method'));
  cmd.push(LF);
  cmd.push(...encode('shows a QR code'));
  cmd.push(LF, LF, LF);
  
  // Cut
  cmd.push(ESC, 0x64, 0x02);
  
  return Buffer.from(cmd);
}

function sendToPrinter(host, port) {
  console.log(`\n???  ===== QR CODE TESTS =====`);
  console.log(`?? Target: ${host}:${port}\n`);
  
  const receipt = generateQRTests();
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
    console.log(`?? Sending QR code tests...\n`);
    
    client.write(receipt, () => {
      console.log(`? Sent!\n`);
      console.log(`Check the receipt:`);
      console.log(`  - Should see 4 test labels`);
      console.log(`  - One or more should show QR code`);
      console.log(`  - If all show just the URL text:`);
      console.log(`    * QR codes may not be supported`);
      console.log(`    * Or need to be enabled in printer settings\n`);
      console.log(`If NO QR codes appear, check:`);
      console.log(`  http://192.168.1.106`);
      console.log(`  Look for "QR Code" or "2D Barcode" settings\n`);
      
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
