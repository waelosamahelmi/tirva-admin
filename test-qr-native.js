/**
 * Star Printer QR Code Test - Native Star QR Command
 * Using ESC GS y S 0 (Star's QR code command)
 */

import net from 'net';

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

function encode(text) {
  return Array.from(text).map(c => c.charCodeAt(0));
}

function generateStarQRReceipt() {
  const cmd = [];
  
  console.log('Building Star QR Code test...\n');
  
  // Initialize
  cmd.push(ESC, 0x40);
  
  // Center alignment
  cmd.push(ESC, 0x1D, 0x61, 0x01);
  
  cmd.push(LF, LF);
  cmd.push(...encode('=== STAR QR CODE TEST ==='));
  cmd.push(LF, LF);
  
  // Test 1: Star native QR code command
  // ESC GS y S 0 n1 n2 n d1...dk
  const url = 'https://tirva.fi';
  const urlBytes = encode(url);
  const dataLen = urlBytes.length;
  
  console.log(`? Star QR Code command for: ${url}`);
  console.log(`? Data length: ${dataLen} bytes`);
  
  // ESC GS y S 0 = Star 2D barcode (QR)
  // Size: 0x08 (medium), Error correction: L (0x00)
  cmd.push(ESC, 0x1D, 0x79, 0x53, 0x30); // Start QR command
  cmd.push(dataLen & 0xFF); // Length low byte
  cmd.push((dataLen >> 8) & 0xFF); // Length high byte
  cmd.push(...urlBytes); // Data
  
  cmd.push(LF, LF);
  cmd.push(...encode('Scan above QR code'));
  cmd.push(LF, LF, LF);
  
  // Test 2: Try different QR format (ESC GS ( k)
  console.log(`? Alternative QR format (if first doesn't work)`);
  
  const url2 = 'https://google.com';
  const url2Bytes = encode(url2);
  const len = url2Bytes.length + 3;
  
  // Store QR code data
  cmd.push(GS, 0x28, 0x6B); // Function 107
  cmd.push(len & 0xFF, (len >> 8) & 0xFF); // Length
  cmd.push(0x31, 0x50, 0x30); // QR code, store
  cmd.push(...url2Bytes);
  
  // Print QR code
  cmd.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  
  cmd.push(LF, LF);
  cmd.push(...encode('Alternative QR above'));
  cmd.push(LF, LF, LF);
  
  // Cut
  cmd.push(ESC, 0x64, 0x02);
  
  console.log('');
  return Buffer.from(cmd);
}

function sendToPrinter(host, port) {
  console.log(`???  ===== STAR QR CODE TEST =====`);
  console.log(`?? Target: ${host}:${port}\n`);
  
  const receipt = generateStarQRReceipt();
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
    console.log(`?? Sending QR test...\n`);
    
    client.write(receipt, () => {
      console.log(`? Sent!\n`);
      console.log(`Check receipt:`);
      console.log(`  - Should see 2 QR codes`);
      console.log(`  - First one: https://tirva.fi`);
      console.log(`  - Second one: https://google.com`);
      console.log(`  - Try scanning with phone\n`);
      console.log(`If you see text instead of QR:`);
      console.log(`  Your printer may not support QR codes`);
      console.log(`  or needs QR feature enabled in settings\n`);
      
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
