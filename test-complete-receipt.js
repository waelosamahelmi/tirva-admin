/**
 * Star Printer Complete Receipt - Production Ready
 * Using verified Star Line Mode commands
 * 
 * Verified commands:
 * - ESC i height width (size: 1-8 for each dimension)
 * - ESC GS a n (align: 0=left, 1=center, 2=right)
 * - ESC E / ESC F (emphasis on/off)
 * - ESC GS y S (QR code Method 3 - VERIFIED WORKING)
 * - ESC d n (feed and cut)
 */

import net from 'net';

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

// Character encoding methods for testing
function encodeMethod1(text) {
  // Method 1: Code Page 437 (original IBM PC)
  return Array.from(text).map(c => {
    if (c === 'ä') return 0x84;
    if (c === 'ö') return 0x94;
    if (c === 'å') return 0x86;
    if (c === 'Ä') return 0x8E;
    if (c === 'Ö') return 0x99;
    if (c === 'Å') return 0x8F;
    return c.charCodeAt(0);
  });
}

function encodeMethod2(text) {
  // Method 2: Code Page 850 (Multilingual Latin 1)
  return Array.from(text).map(c => {
    if (c === 'ä') return 0x83;
    if (c === 'ö') return 0x94;
    if (c === 'å') return 0x86;
    if (c === 'Ä') return 0x8E;
    if (c === 'Ö') return 0x99;
    if (c === 'Å') return 0x8F;
    return c.charCodeAt(0);
  });
}

function encodeMethod3(text) {
  // Method 3: Code Page 865 (Nordic)
  return Array.from(text).map(c => {
    if (c === 'ä') return 0x84;
    if (c === 'ö') return 0x94;
    if (c === 'å') return 0x86;
    if (c === 'Ä') return 0x8E;
    if (c === 'Ö') return 0x99;
    if (c === 'Å') return 0x8F;
    return c.charCodeAt(0);
  });
}

function encodeMethod4(text) {
  // Method 4: ISO 8859-1 (Latin-1)
  return Array.from(text).map(c => {
    if (c === 'ä') return 0xE4;
    if (c === 'ö') return 0xF6;
    if (c === 'å') return 0xE5;
    if (c === 'Ä') return 0xC4;
    if (c === 'Ö') return 0xD6;
    if (c === 'Å') return 0xC5;
    return c.charCodeAt(0);
  });
}

function encodeMethod5(text) {
  // Method 5: ASCII substitution
  return Array.from(text).map(c => {
    if (c === 'ä') return 0x7B; // {
    if (c === 'ö') return 0x7C; // |
    if (c === 'å') return 0x7D; // }
    if (c === 'Ä') return 0x5B; // [
    if (c === 'Ö') return 0x5C; // \
    if (c === 'Å') return 0x5D; // ]
    return c.charCodeAt(0);
  });
}

function encodeMethod6(text) {
  // Method 6: Windows-1252 (Western European)
  return Array.from(text).map(c => {
    if (c === 'ä') return 0xE4;
    if (c === 'ö') return 0xF6;
    if (c === 'å') return 0xE5;
    if (c === 'Ä') return 0xC4;
    if (c === 'Ö') return 0xD6;
    if (c === 'Å') return 0xC5;
    return c.charCodeAt(0);
  });
}

function encodeMethod7(text) {
  // Method 7: Star Printer Nordic character set
  return Array.from(text).map(c => {
    if (c === 'ä') return 0x91;
    if (c === 'ö') return 0x92;
    if (c === 'å') return 0x93;
    if (c === 'Ä') return 0x8E;
    if (c === 'Ö') return 0x99;
    if (c === 'Å') return 0x8F;
    return c.charCodeAt(0);
  });
}

function encodeMethod8(text) {
  // Method 8: Just use UTF-8 as-is (might work!)
  return Array.from(Buffer.from(text, 'utf8'));
}

// Use method 1 as default
const encode = encodeMethod1;

// Style functions
function init(cmd) {
  cmd.push(ESC, 0x40); // Initialize
  cmd.push(ESC, 0x1E, 0x61, 0x00); // Star Line Mode ON
}

function setSize(cmd, height, width) {
  cmd.push(ESC, 0x69, height, width);
}

function setAlign(cmd, align) {
  // 0=left, 1=center, 2=right
  cmd.push(ESC, GS, 0x61, align);
}

function emphasisOn(cmd) {
  cmd.push(ESC, 0x45);
}

function emphasisOff(cmd) {
  cmd.push(ESC, 0x46);
}

function text(cmd, str) {
  cmd.push(...encode(str));
}

function newline(cmd, count = 1) {
  for (let i = 0; i < count; i++) cmd.push(LF);
}

function qrCodeBig(cmd, url) {
  // METHOD 3: Star QR with different syntax - BIG SIZE
  const urlBytes = encode(url);
  
  // QR Code command: ESC GS y S
  cmd.push(ESC, 0x1D, 0x79, 0x53);
  cmd.push(0x30); // Function 0 - Model
  cmd.push(0x02); // Model 2
  
  cmd.push(ESC, 0x1D, 0x79, 0x53);
  cmd.push(0x31); // Function 1 - Module size
  cmd.push(0x08); // Size 8 (BIG)
  
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
}

function feedAndCut(cmd) {
  cmd.push(ESC, 0x64, 0x02);
}

function generateCompleteReceipt() {
  const cmd = [];
  
  init(cmd);
  
  // -------------------------------------------------------
  // HEADER - Restaurant Logo & Info
  // -------------------------------------------------------
  setAlign(cmd, 1); // Center
  newline(cmd, 2);
  
  // Restaurant name - LARGE (2x2)
  emphasisOn(cmd);
  setSize(cmd, 2, 2);
  text(cmd, 'tirva');
  newline(cmd);
  emphasisOff(cmd);
  
  // Subtitle - MEDIUM (2x2)
  emphasisOn(cmd);
  setSize(cmd, 2, 2);
  text(cmd, 'pizzeria');
  newline(cmd);
  emphasisOff(cmd);
  
  // Contact info - SMALLER THAN NORMAL (would be 0.5x0.5 but min is 1x1, use 1x1)
  // Note: Can't go smaller than 1x1, so using normal size
  setSize(cmd, 1, 1);
  newline(cmd);
  text(cmd, 'Pasintie 2, 45410 Utti');
  newline(cmd);
  text(cmd, 'Puh: +358-3-589-9089');
  newline(cmd);
  
  text(cmd, '===================='); // 8 less = signs (was 28, now 20)
  newline(cmd);
  
  // -------------------------------------------------------
  // ORDER INFO
  // -------------------------------------------------------
  
  // Order number - 1x1 BOLD
  emphasisOn(cmd);
  setSize(cmd, 1, 1);
  text(cmd, '#1234');
  newline(cmd);
  emphasisOff(cmd);
  
  // Date & time - 1x1 normal
  setSize(cmd, 1, 1);
  const now = new Date();
  const date = '30.11.2025';
  const time = now.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
  text(cmd, date + ' klo ' + time);
  newline(cmd);
  
  // Order type (delivery or pickup) - 1x1 normal
  setSize(cmd, 1, 1);
  text(cmd, 'KOTIINKULJETUS');
  newline(cmd);
  
  // Payment - BOLD (method should be bold)
  emphasisOn(cmd);
  text(cmd, 'Maksutapa: Kortti');
  newline(cmd);
  emphasisOff(cmd);
  
  text(cmd, '===================='); // 8 less
  newline(cmd);
  
  // -------------------------------------------------------
  // CUSTOMER INFO
  // -------------------------------------------------------
  setAlign(cmd, 0); // Left align
  
  // Titles normal, info bold
  setSize(cmd, 1, 1);
  text(cmd, 'Nimi: ');
  emphasisOn(cmd);
  text(cmd, 'Matti Meikalainen');
  emphasisOff(cmd);
  newline(cmd);
  
  text(cmd, 'Puh: ');
  emphasisOn(cmd);
  text(cmd, '+358 40 123 4567');
  emphasisOff(cmd);
  newline(cmd);
  
  text(cmd, 'Osoite:');
  newline(cmd);
  emphasisOn(cmd);
  text(cmd, '  Esimerkkikatu 123');
  newline(cmd);
  text(cmd, '  45410 Utti');
  newline(cmd);
  emphasisOff(cmd);
  
  setAlign(cmd, 1); // Center
  text(cmd, '===================='); // 8 less
  newline(cmd);
  
  // -------------------------------------------------------
  // ITEMS
  // -------------------------------------------------------
  setAlign(cmd, 0); // Left align
  
  // Item 1: Pizza with toppings
  // Product name - 1x1 BOLD
  emphasisOn(cmd);
  setSize(cmd, 1, 1);
  text(cmd, '2x Pizza Margherita');
  newline(cmd);
  emphasisOff(cmd);
  
  // Price - 1x1 NORMAL (right aligned)
  setAlign(cmd, 2);
  setSize(cmd, 1, 1);
  text(cmd, '25.00');
  text(cmd, String.fromCharCode(0x80)); // Euro
  newline(cmd);
  
  setAlign(cmd, 0); // Left
  // Lisatteet - 1x1
  setSize(cmd, 1, 1);
  text(cmd, '  Lisatteet:');
  newline(cmd);
  text(cmd, '    + Extra juusto');
  setAlign(cmd, 2);
  text(cmd, '+2.00');
  text(cmd, String.fromCharCode(0x80));
  newline(cmd);
  
  setAlign(cmd, 0);
  text(cmd, '    + Oliivit');
  newline(cmd);
  text(cmd, '  Huom: Hyvin paistettu');
  newline(cmd);
  
  text(cmd, '- - - - - - - - -'); // 4 dashes less (was 17 groups, now 13)
  newline(cmd);
  
  // Item 2: Drink
  emphasisOn(cmd);
  setSize(cmd, 1, 1);
  text(cmd, '1x Coca-Cola 0.5L');
  newline(cmd);
  emphasisOff(cmd);
  
  setAlign(cmd, 2);
  setSize(cmd, 1, 1);
  text(cmd, '3.50');
  text(cmd, String.fromCharCode(0x80));
  newline(cmd);
  
  setAlign(cmd, 0);
  text(cmd, '- - - - - - - - -');
  newline(cmd);
  
  // Item 3: Kebab
  emphasisOn(cmd);
  setSize(cmd, 1, 1);
  text(cmd, '1x Kebab-annos');
  newline(cmd);
  emphasisOff(cmd);
  
  setAlign(cmd, 2);
  setSize(cmd, 1, 1);
  text(cmd, '12.50');
  text(cmd, String.fromCharCode(0x80));
  newline(cmd);
  
  setAlign(cmd, 0);
  text(cmd, '  Lisatteet:');
  newline(cmd);
  text(cmd, '    + Valkosipulikastike');
  newline(cmd);
  text(cmd, '    + Chili (Vahva)');
  newline(cmd);
  
  text(cmd, '- - - - - - - - -');
  newline(cmd);
  
  // -------------------------------------------------------
  // SPECIAL INSTRUCTIONS
  // -------------------------------------------------------
  setAlign(cmd, 1); // Center
  text(cmd, '====================');
  newline(cmd);
  
  setAlign(cmd, 0); // Left
  text(cmd, 'Soita ovikello kaksi kertaa.');
  newline(cmd);
  text(cmd, 'Jata tilaus rappukaytan eteen.');
  newline(cmd);
  
  // -------------------------------------------------------
  // TOTALS
  // -------------------------------------------------------
  setAlign(cmd, 1); // Center
  text(cmd, '====================');
  newline(cmd);
  
  setAlign(cmd, 0); // Left
  
  // Subtotals - 1x1 BOLD
  emphasisOn(cmd);
  setSize(cmd, 1, 1);
  text(cmd, 'Valisumma:');
  emphasisOff(cmd);
  setAlign(cmd, 2);
  text(cmd, '43.00');
  text(cmd, String.fromCharCode(0x80));
  newline(cmd);
  
  setAlign(cmd, 0);
  emphasisOn(cmd);
  text(cmd, 'Toimitus:');
  emphasisOff(cmd);
  setAlign(cmd, 2);
  text(cmd, '3.50');
  text(cmd, String.fromCharCode(0x80));
  newline(cmd);
  
  setAlign(cmd, 0);
  emphasisOn(cmd);
  text(cmd, 'Pientilaus:');
  emphasisOff(cmd);
  setAlign(cmd, 2);
  text(cmd, '2.00');
  text(cmd, String.fromCharCode(0x80));
  newline(cmd);
  
  // Grand total - 2x2 BOLD
  setAlign(cmd, 0);
  emphasisOn(cmd);
  setSize(cmd, 2, 2);
  text(cmd, 'YHTEENSA:');
  newline(cmd);
  setAlign(cmd, 2);
  text(cmd, '48.50');
  text(cmd, String.fromCharCode(0x80));
  newline(cmd);
  emphasisOff(cmd);
  setSize(cmd, 1, 1);
  
  // -------------------------------------------------------
  // FOOTER & QR CODE
  // -------------------------------------------------------
  newline(cmd);
  setAlign(cmd, 1); // Center
  text(cmd, '====================');
  newline(cmd);
  
  text(cmd, 'Kiitos tilauksestasi!');
  newline(cmd);
  text(cmd, 'Tervetuloa uudelleen!');
  newline(cmd);
  
  // QR Code - BIG
  qrCodeBig(cmd, 'https://tirvankahvila.fi');
  newline(cmd, 2);
  
  text(cmd, 'tirvankahvila.fi');
  newline(cmd, 2);
  
  // -------------------------------------------------------
  // CHARACTER ENCODING TESTS
  // -------------------------------------------------------
  setAlign(cmd, 0); // Left
  text(cmd, '====================');
  newline(cmd);
  emphasisOn(cmd);
  text(cmd, 'ENCODING TESTS:');
  newline(cmd);
  emphasisOff(cmd);
  text(cmd, 'Expected: ä ö å Ä Ö Å');
  newline(cmd, 2);
  
  // Test Method 1
  text(cmd, 'M1-CP437: ');
  cmd.push(...encodeMethod1('ä ö å Ä Ö Å'));
  newline(cmd);
  
  // Test Method 2
  text(cmd, 'M2-CP850: ');
  cmd.push(...encodeMethod2('ä ö å Ä Ö Å'));
  newline(cmd);
  
  // Test Method 3
  text(cmd, 'M3-CP865: ');
  cmd.push(...encodeMethod3('ä ö å Ä Ö Å'));
  newline(cmd);
  
  // Test Method 4
  text(cmd, 'M4-ISO88: ');
  cmd.push(...encodeMethod4('ä ö å Ä Ö Å'));
  newline(cmd);
  
  // Test Method 5
  text(cmd, 'M5-ASCII: ');
  cmd.push(...encodeMethod5('ä ö å Ä Ö Å'));
  newline(cmd);
  
  // Test Method 6
  text(cmd, 'M6-Win12: ');
  cmd.push(...encodeMethod6('ä ö å Ä Ö Å'));
  newline(cmd);
  
  // Test Method 7
  text(cmd, 'M7-NORD: ');
  cmd.push(...encodeMethod7('ä ö å Ä Ö Å'));
  newline(cmd);
  
  // Test Method 8
  text(cmd, 'M8-UTF8: ');
  cmd.push(...encodeMethod8('ä ö å Ä Ö Å'));
  newline(cmd);
  
  newline(cmd, 2);
  text(cmd, 'Tell which method works!');
  newline(cmd, 3);
  
  // Cut
  feedAndCut(cmd);
  
  return Buffer.from(cmd);
}

function sendToPrinter(host, port) {
  console.log(`\n???  ===== PRODUCTION RECEIPT TEST =====`);
  console.log(`?? Target: ${host}:${port}`);
  console.log(`?? Star Line Mode with verified commands\n`);
  
  const receipt = generateCompleteReceipt();
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
    console.log(`?? Sending complete receipt...\n`);
    
    client.write(receipt, () => {
      console.log(`? Receipt sent!\n`);
      console.log(`Expected output:`);
      console.log(`  ? tirva logo (2x2 size)`);
      console.log(`  ? Address/phone (1x1, cannot go smaller)`);
      console.log(`  ? Order #1234 (1x1 bold)`);
      console.log(`  ? Delivery/Payment (1x1, payment BOLD)`);
      console.log(`  ? Customer titles normal, info BOLD`);
      console.log(`  ? Products (1x1 bold) + prices (1x1 normal)`);
      console.log(`  ? Lisätteet (1x1)`);
      console.log(`  ? Shorter dashes and equals`);
      console.log(`  ? Subtotals (1x1 bold labels)`);
      console.log(`  ? Final total (2x2 bold)`);
      console.log(`  ? BIG QR code ? tirvankahvila.fi`);
      console.log(`  ? Finnish character tests (8 methods)`);
      console.log(``);
      console.log(`?? CHECK WHICH ENCODING METHOD WORKS:`);
      console.log(`   M1-CP437: Code Page 437 (IBM PC)`);
      console.log(`   M2-CP850: Code Page 850 (Multilingual)`);
      console.log(`   M3-CP865: Code Page 865 (Nordic)`);
      console.log(`   M4-ISO88: ISO 8859-1 (Latin-1)`);
      console.log(`   M5-ASCII: ASCII character substitution`);
      console.log(`   M6-Win12: Windows-1252 (Western European)`);
      console.log(`   M7-NORD: Star Nordic character set`);
      console.log(`   M8-UTF8: Direct UTF-8`);
      console.log(``);
      
      setTimeout(() => {
        client.end();
        console.log(`? ===== COMPLETE =====\n`);
        process.exit(0);
      }, 1000);
    });
  });
  
  console.log(`?? Connecting...`);
  client.connect(port, host);
}

sendToPrinter('192.168.1.106', 9100);
