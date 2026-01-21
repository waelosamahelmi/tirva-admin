/**
 * Star Printer Complete Test
 * Testing correct sizing order and QR code
 */

import net from 'net';

const ESC = 0x1B;
const LF = 0x0A;

function encode(text) {
  return Array.from(text).map(c => c.charCodeAt(0));
}

function generateCompleteTest() {
  const cmd = [];
  
  console.log('Building complete Star Line Mode test...\n');
  
  // Initialize
  cmd.push(ESC, 0x40);
  cmd.push(ESC, 0x1E, 0x61, 0x00); // Star Line Mode ON
  
  // Center align
  cmd.push(ESC, 0x1D, 0x61, 0x01);
  
  cmd.push(LF, LF);
  cmd.push(...encode('=== SIZE ORDER TEST ==='));
  cmd.push(LF, LF);
  
  // Test sizing with HEIGHT x WIDTH order
  console.log('? Testing ESC i [height] [width]');
  
  // Normal
  console.log('  ESC i 1 1 (height=1, width=1)');
  cmd.push(ESC, 0x69, 0x01, 0x01);
  cmd.push(...encode('1x1 Normal'));
  cmd.push(LF);
  
  // Tall (height=2, width=1)
  console.log('  ESC i 2 1 (height=2, width=1) = TALL');
  cmd.push(ESC, 0x69, 0x02, 0x01);
  cmd.push(...encode('2x1 TALL'));
  cmd.push(LF);
  
  // Wide (height=1, width=2)
  console.log('  ESC i 1 2 (height=1, width=2) = WIDE');
  cmd.push(ESC, 0x69, 0x01, 0x02);
  cmd.push(...encode('1x2 WIDE'));
  cmd.push(LF);
  
  // Large (height=2, width=2)
  console.log('  ESC i 2 2 (height=2, width=2) = LARGE');
  cmd.push(ESC, 0x69, 0x02, 0x02);
  cmd.push(...encode('2x2 LARGE'));
  cmd.push(LF);
  
  // Huge (height=3, width=3)
  console.log('  ESC i 3 3 (height=3, width=3) = HUGE');
  cmd.push(ESC, 0x69, 0x03, 0x03);
  cmd.push(...encode('3x3 HUGE'));
  cmd.push(LF);
  
  // Back to normal
  cmd.push(ESC, 0x69, 0x01, 0x01);
  cmd.push(LF, LF);
  
  // Test Bold
  console.log('? Testing emphasis (bold)');
  cmd.push(ESC, 0x45); // Emphasis ON
  cmd.push(...encode('BOLD TEXT'));
  cmd.push(ESC, 0x46); // Emphasis OFF
  cmd.push(LF, LF);
  
  // Combined: Large + Bold
  console.log('? Testing combined: 2x2 + Bold');
  cmd.push(ESC, 0x45); // Emphasis ON
  cmd.push(ESC, 0x69, 0x02, 0x02); // 2x2
  cmd.push(...encode('LARGE BOLD'));
  cmd.push(LF);
  cmd.push(ESC, 0x46); // Emphasis OFF
  cmd.push(ESC, 0x69, 0x01, 0x01); // Normal
  cmd.push(LF, LF, LF);
  
  // QR Code Test
  console.log('? Testing QR Code (Star native format)');
  cmd.push(...encode('=== QR CODE TEST ==='));
  cmd.push(LF, LF);
  
  // Star QR Code command: ESC GS y S 0 [model] [size] [ecc] [data]
  // Model 2 (recommended), Size 5 (medium), ECC L (low)
  const qrUrl = 'https://tirvankahvila.fi';
  const qrData = encode(qrUrl);
  const qrLength = qrData.length;
  
  // Star QR command format
  console.log(`  QR Data: "${qrUrl}" (${qrLength} bytes)`);
  console.log('  ESC GS y S 0 2 5 0 [length] [data]');
  
  cmd.push(ESC, 0x1D, 0x79, 0x53, 0x30); // QR code command
  cmd.push(0x02); // Model 2
  cmd.push(0x05); // Size 5 (medium)
  cmd.push(0x00); // Error correction L
  cmd.push(qrLength & 0xFF, (qrLength >> 8) & 0xFF); // Length (little-endian)
  cmd.push(...qrData); // URL data
  
  cmd.push(LF, LF);
  cmd.push(...encode(qrUrl));
  cmd.push(LF, LF, LF);
  
  // Feed and cut
  cmd.push(ESC, 0x64, 0x02);
  
  console.log('');
  return Buffer.from(cmd);
}

function sendToPrinter(host, port) {
  console.log(`???  ===== COMPLETE STAR TEST =====`);
  console.log(`?? Target: ${host}:${port}\n`);
  
  const receipt = generateCompleteTest();
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
    console.log(`?? Sending complete test...\n`);
    
    client.write(receipt, () => {
      console.log(`? Sent!\n`);
      console.log(`Check the receipt:`);
      console.log(`  1. "2x1 TALL" should be TALL (stretched vertically)`);
      console.log(`  2. "1x2 WIDE" should be WIDE (stretched horizontally)`);
      console.log(`  3. "2x2 LARGE" should be large (both directions)`);
      console.log(`  4. "3x3 HUGE" should be very large`);
      console.log(`  5. "BOLD TEXT" should be darker`);
      console.log(`  6. "LARGE BOLD" should be big AND dark`);
      console.log(`  7. QR code should appear and be scannable`);
      console.log(`     (scan it to verify it goes to tirvankahvila.fi)\n`);
      
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
