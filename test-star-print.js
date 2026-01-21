/**
 * Star Printer Test Script
 * Send test receipts directly to Star mC-Print3 at 192.168.1.106:9100
 * 
 * Usage: node test-star-print.js
 */

import net from 'net';

// ESC/POS & Star Command constants
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

/**
 * Encode text with CP850 for Finnish characters
 */
function encode(text) {
  const bytes = [];
  
  for (const char of text) {
    switch (char) {
      case 'ä': bytes.push(0x84); break;
      case 'Ä': bytes.push(0x8E); break;
      case 'ö': bytes.push(0x94); break;
      case 'Ö': bytes.push(0x99); break;
      case 'å': bytes.push(0x86); break;
      case 'Å': bytes.push(0x8F); break;
      case 'é': bytes.push(0x82); break;
      case '€': bytes.push(0xEE); break;
      default:
        const code = char.charCodeAt(0);
        bytes.push(code < 128 ? code : 0x3F);
    }
  }
  
  return bytes;
}

/**
 * Generate modern Star receipt
 */
function generateReceipt() {
  const cmd = [];
  
  // Initialize printer
  cmd.push(ESC, 0x40); // ESC @ - Reset
  cmd.push(ESC, 0x74, 0x02); // Set CP850 code page
  
  // Center alignment
  cmd.push(ESC, 0x61, 0x01);
  
  // 2 blank lines
  cmd.push(LF, LF);
  
  // Restaurant name - 3x3 bold
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(GS, 0x21, 0x22); // 3x3 size
  cmd.push(...encode('tirva'));
  cmd.push(LF);
  
  // Subtitle - 2x2 bold
  cmd.push(GS, 0x21, 0x11); // 2x2 size
  cmd.push(...encode('pizzeria'));
  cmd.push(LF);
  cmd.push(ESC, 0x45, 0x00); // Bold off
  
  // Normal size
  cmd.push(GS, 0x21, 0x00);
  cmd.push(LF);
  
  // Address & phone
  cmd.push(...encode('Pasintie 2, 45410 Utti'));
  cmd.push(LF);
  cmd.push(...encode('+358 41 3152619'));
  cmd.push(LF, LF);
  
  // Separator
  cmd.push(...encode('--------------------------------'));
  cmd.push(LF, LF);
  
  // Order Number - 3x3 bold
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(GS, 0x21, 0x22); // 3x3 size
  cmd.push(...encode('#TEST-1234'));
  cmd.push(LF);
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(GS, 0x21, 0x00); // Normal size
  cmd.push(LF);
  
  // Date & time
  const now = new Date();
  const date = now.toLocaleDateString('fi-FI');
  const time = now.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  cmd.push(...encode(`${date} klo ${time}`));
  cmd.push(LF, LF);
  
  // Order type - 2x2 bold
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(GS, 0x21, 0x11); // 2x2 size
  cmd.push(...encode('KOTIINKULJETUS'));
  cmd.push(LF);
  cmd.push(GS, 0x21, 0x00); // Normal size
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(LF);
  
  // Payment method
  cmd.push(...encode('Maksutapa: Kortti'));
  cmd.push(LF, LF);
  
  // Separator
  cmd.push(...encode('--------------------------------'));
  cmd.push(LF, LF);
  
  // Customer info section
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(ESC, 0x2D, 0x01); // Underline on
  cmd.push(...encode('ASIAKASTIEDOT'));
  cmd.push(LF);
  cmd.push(ESC, 0x2D, 0x00); // Underline off
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(LF);
  
  // Left align for customer details
  cmd.push(ESC, 0x61, 0x00);
  
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(...encode('Nimi: '));
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(...encode('Matti Meikäläinen'));
  cmd.push(LF);
  
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(...encode('Puh: '));
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(...encode('+358 40 123 4567'));
  cmd.push(LF);
  
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(...encode('Osoite:'));
  cmd.push(LF);
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(...encode('  Esimerkkikatu 123'));
  cmd.push(LF);
  cmd.push(...encode('  45410 Utti'));
  cmd.push(LF, LF);
  
  // Center align
  cmd.push(ESC, 0x61, 0x01);
  cmd.push(...encode('--------------------------------'));
  cmd.push(LF, LF);
  
  // Items section
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(ESC, 0x2D, 0x01); // Underline on
  cmd.push(...encode('TUOTTEET'));
  cmd.push(LF);
  cmd.push(ESC, 0x2D, 0x00); // Underline off
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(...encode('================================'));
  cmd.push(LF, LF);
  
  // Left align for items
  cmd.push(ESC, 0x61, 0x00);
  
  // Item 1 - 2x2 size
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(GS, 0x21, 0x11); // 2x2 size
  cmd.push(...encode('2x Pizza Margherita'));
  cmd.push(...encode('                '));
  cmd.push(...encode('25.00€'));
  cmd.push(LF);
  cmd.push(GS, 0x21, 0x00); // Normal size
  cmd.push(ESC, 0x45, 0x00); // Bold off
  
  // Toppings
  cmd.push(...encode('  Lisätteet:'));
  cmd.push(LF);
  cmd.push(...encode('    + Extra juusto'));
  cmd.push(...encode('                  '));
  cmd.push(...encode('+2.00€'));
  cmd.push(LF);
  cmd.push(...encode('    + Oliivit'));
  cmd.push(LF, LF);
  
  // Item separator
  cmd.push(...encode('- - - - - - - - - - - - - - - -'));
  cmd.push(LF);
  
  // Item 2 - 2x2 size
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(GS, 0x21, 0x11); // 2x2 size
  cmd.push(...encode('1x Coca-Cola 0.5L'));
  cmd.push(...encode('                  '));
  cmd.push(...encode('3.50€'));
  cmd.push(LF);
  cmd.push(GS, 0x21, 0x00); // Normal size
  cmd.push(ESC, 0x45, 0x00); // Bold off
  
  cmd.push(...encode('- - - - - - - - - - - - - - - -'));
  cmd.push(LF, LF);
  
  // Center align for totals
  cmd.push(ESC, 0x61, 0x01);
  cmd.push(...encode('================================'));
  cmd.push(LF);
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(ESC, 0x2D, 0x01); // Underline on
  cmd.push(...encode('YHTEENVETO'));
  cmd.push(LF);
  cmd.push(ESC, 0x2D, 0x00); // Underline off
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(...encode('================================'));
  cmd.push(LF, LF);
  
  // Left align for totals breakdown
  cmd.push(ESC, 0x61, 0x00);
  cmd.push(GS, 0x21, 0x11); // 2x2 size
  
  cmd.push(...encode('Välisumma:'));
  cmd.push(...encode('        '));
  cmd.push(...encode('30.50€'));
  cmd.push(LF);
  
  cmd.push(...encode('Toimitusmaksu:'));
  cmd.push(...encode('    '));
  cmd.push(...encode('3.00€'));
  cmd.push(LF, LF);
  
  // Total - 3x3 bold
  cmd.push(ESC, 0x45, 0x01); // Bold on
  cmd.push(GS, 0x21, 0x22); // 3x3 size
  cmd.push(...encode('YHTEENSÄ:'));
  cmd.push(...encode('   '));
  cmd.push(...encode('33.50€'));
  cmd.push(LF);
  cmd.push(ESC, 0x45, 0x00); // Bold off
  cmd.push(GS, 0x21, 0x00); // Normal size
  
  // Center align
  cmd.push(ESC, 0x61, 0x01);
  cmd.push(LF, LF);
  cmd.push(...encode('================================'));
  cmd.push(LF, LF);
  
  // Thank you message
  cmd.push(...encode('Kiitos tilauksestasi!'));
  cmd.push(LF);
  cmd.push(...encode('Tervetuloa uudelleen!'));
  cmd.push(LF, LF);
  
  // QR Code
  const url = 'https://tirvankahvila.fi';
  const qrData = encode(url);
  const pL = (qrData.length + 3) % 256;
  const pH = Math.floor((qrData.length + 3) / 256);
  
  // QR Model
  cmd.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  // QR Size
  cmd.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08);
  // Error correction
  cmd.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30);
  // Store data
  cmd.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...qrData);
  // Print QR
  cmd.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
  
  cmd.push(LF, LF);
  cmd.push(...encode('tirvankahvila.fi'));
  cmd.push(LF, LF, LF);
  
  // Cut paper
  cmd.push(GS, 0x56, 0x00);
  
  return Buffer.from(cmd);
}

/**
 * Send receipt to printer
 */
function sendToPrinter(host, port) {
  console.log(`\n???  ===== STAR PRINTER TEST =====`);
  console.log(`?? Target: ${host}:${port}`);
  console.log(`?? Using StarModernReceipt format`);
  console.log(`?? CP850 encoding for Finnish characters\n`);
  
  const receipt = generateReceipt();
  console.log(`?? Generated ${receipt.length} bytes of print data`);
  
  const client = new net.Socket();
  
  client.setTimeout(5000);
  
  client.on('timeout', () => {
    console.error('? Connection timeout');
    client.destroy();
    process.exit(1);
  });
  
  client.on('error', (err) => {
    console.error(`? Error: ${err.message}`);
    process.exit(1);
  });
  
  client.on('connect', () => {
    console.log(`? Connected to ${host}:${port}`);
    console.log(`?? Sending receipt...`);
    
    client.write(receipt, () => {
      console.log(`? Receipt sent successfully!`);
      console.log(`??  Waiting for printer to process...\n`);
      
      setTimeout(() => {
        client.end();
        console.log(`? ===== TEST COMPLETE =====\n`);
        console.log(`Check your printer for the receipt!\n`);
        process.exit(0);
      }, 1000);
    });
  });
  
  console.log(`?? Connecting to printer...`);
  client.connect(port, host);
}

// Run the test
const PRINTER_HOST = '192.168.1.106';
const PRINTER_PORT = 9100;

sendToPrinter(PRINTER_HOST, PRINTER_PORT);
