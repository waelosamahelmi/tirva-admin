# Star mC-Print3 Complete Style Guide
**Production-Ready Command Reference**

## Overview
This guide documents all **VERIFIED** Star Line Mode commands for the Star mC-Print3 thermal printer at `192.168.1.106:9100`. All commands have been tested and confirmed working.

---

## Table of Contents
1. [Command Reference](#command-reference)
2. [Initialization](#initialization)
3. [Text Sizing](#text-sizing)
4. [Text Alignment](#text-alignment)
5. [Text Emphasis (Bold)](#text-emphasis-bold)
6. [QR Codes (Method 3 - VERIFIED)](#qr-codes-method-3---verified)
7. [Paper Feed & Cut](#paper-feed--cut)
8. [Character Encoding](#character-encoding)
9. [Complete Receipt Template](#complete-receipt-template)
10. [Style Menu](#style-menu)

---

## Command Reference

### Essential Byte Codes
```javascript
const ESC = 0x1B;  // Escape character
const GS = 0x1D;   // Group Separator
const LF = 0x0A;   // Line Feed (newline)
```

### Command Summary
| Purpose | Command | Parameters | Notes |
|---------|---------|------------|-------|
| Initialize | `ESC @` | None | Reset printer |
| Star Line Mode | `ESC 0x1E 0x61 0x00` | None | Enable Star Line Mode |
| Text Size | `ESC i height width` | 1-8 for each | **Height first!** |
| Alignment | `ESC GS a align` | 0=left, 1=center, 2=right | - |
| Bold ON | `ESC E` | None | - |
| Bold OFF | `ESC F` | None | - |
| QR Code Setup | `ESC GS y S 0x30 0x00 size len_lo len_hi [data]` | See QR section | Method 3 only! |
| Feed & Cut | `ESC d n` | n = lines to feed | Usually 2-3 |

---

## Initialization

**Always start with these commands:**

```javascript
function init(cmd) {
  cmd.push(ESC, 0x40);              // Initialize printer
  cmd.push(ESC, 0x1E, 0x61, 0x00);  // Enable Star Line Mode
}
```

**Why:** Star Line Mode is required for all formatting commands. Without this, the printer defaults to plain text mode.

---

## Text Sizing

### Command Format
```javascript
ESC i [height] [width]
```

### Parameter Order
?? **CRITICAL:** Parameters are `height × width` (NOT width × height)

### Size Range
- **Minimum:** 1 (normal size)
- **Maximum:** 8 (8x normal)
- **Recommended:** 1-4 for most uses

### Size Examples

```javascript
function setSize(cmd, height, width) {
  cmd.push(ESC, 0x69, height, width);
}

// Usage examples:
setSize(cmd, 1, 1);  // Normal text (1x1)
setSize(cmd, 2, 1);  // Tall text (2x height, 1x width)
setSize(cmd, 1, 2);  // Wide text (1x height, 2x width)
setSize(cmd, 2, 2);  // Large text (2x2)
setSize(cmd, 3, 3);  // Extra large (3x3)
setSize(cmd, 4, 4);  // Huge text (4x4)
```

### Visual Size Chart

```
1x1: Normal       ? Body text, toppings, notes
1x2: Wide         ? Section headers
2x1: Tall         ? Prices (vertical emphasis)
2x2: Large        ? Item names, subtotals
3x3: Extra Large  ? Restaurant name, order number
4x4: Huge         ? Final total only
```

### Best Practices
- **1x1**: Default size for most text
- **2x2**: Item names and prices
- **3x3**: Headers, restaurant name
- **4x4**: Order number, final total (sparingly!)
- **Never use 5x5+**: Takes too much paper, hard to read

---

## Text Alignment

### Command Format
```javascript
ESC GS a [align]
```

### Alignment Values
- `0` = Left align
- `1` = Center align
- `2` = Right align

### Implementation

```javascript
function setAlign(cmd, align) {
  cmd.push(ESC, GS, 0x61, align);
}

// Usage:
setAlign(cmd, 0);  // Left
setAlign(cmd, 1);  // Center
setAlign(cmd, 2);  // Right
```

### Typical Usage Pattern

```javascript
// Header: Center aligned
setAlign(cmd, 1);
text(cmd, 'tirva kahvila');

// Items: Left aligned
setAlign(cmd, 0);
text(cmd, '1x Pizza Margherita');

// Prices: Right aligned
setAlign(cmd, 2);
text(cmd, '12.50€');
```

### Layout Patterns

#### Two-Column Layout (Item + Price)
```javascript
// Left column
setAlign(cmd, 0);
text(cmd, '1x Pizza');
newline(cmd);

// Right column (same line ideally, but requires manual spacing)
// Simpler approach: separate lines
setAlign(cmd, 2);
text(cmd, '12.50€');
newline(cmd);
```

---

## Text Emphasis (Bold)

### Commands
```javascript
ESC E  // Bold ON
ESC F  // Bold OFF
```

### Implementation

```javascript
function emphasisOn(cmd) {
  cmd.push(ESC, 0x45);
}

function emphasisOff(cmd) {
  cmd.push(ESC, 0x46);
}
```

### Usage Pattern

```javascript
// Bold item name
emphasisOn(cmd);
setSize(cmd, 2, 2);
text(cmd, 'Pizza Margherita');
newline(cmd);
emphasisOff(cmd);

// Normal topping
setSize(cmd, 1, 1);
text(cmd, '  + Extra cheese');
newline(cmd);
```

### Best Practices
- **Always turn off:** Don't forget `emphasisOff()` after bold sections
- **Combine with size:** Bold + large size = maximum emphasis
- **Use sparingly:** Too much bold loses impact

---

## QR Codes (Method 3 - VERIFIED)

### ?? CRITICAL: Method 3 Only!
Only **Method 3** (Star Alt syntax) works on Star mC-Print3. Methods 1 & 2 fail.

### Command Sequence

```javascript
function qrCode(cmd, data) {
  const bytes = encode(data);
  const len = bytes.length;
  
  // ESC GS y S 0x30 0x00 [size] [len_lo] [len_hi] [data]
  cmd.push(ESC, GS, 0x79, 0x53, 0x30, 0x00);  // Model 2
  cmd.push(8);                                  // Size (dots per module)
  cmd.push(len & 0xFF, (len >> 8) & 0xFF);     // Length (little endian)
  cmd.push(...bytes);                           // QR data
}
```

### Parameters Explained

| Byte | Value | Meaning |
|------|-------|---------|
| `0x30` | Fixed | Model parameter |
| `0x00` | Fixed | Model 2 |
| Size | `1-16` | Dots per module (8 recommended) |
| len_lo | Calculated | Length low byte |
| len_hi | Calculated | Length high byte |

### Size Recommendations
- **Size 5:** Small QR (50mm × 50mm approx)
- **Size 8:** Medium QR (80mm × 80mm) - **RECOMMENDED**
- **Size 10:** Large QR (100mm × 100mm)

### Data Format
Any text string:
- URLs: `https://tirvankahvila.fi`
- Order tracking: `https://order.example.com/track?id=1234`
- Phone numbers: `tel:+358400123456`
- Plain text: `Order #1234`

### Complete Example

```javascript
// Initialize
init(cmd);

// Center align QR
setAlign(cmd, 1);
newline(cmd, 2);

// QR code
qrCode(cmd, 'https://tirvankahvila.fi/order/1234');
newline(cmd, 2);

// Text below QR
setSize(cmd, 1, 1);
text(cmd, 'Scan for order tracking');
newline(cmd);
```

---

## Paper Feed & Cut

### Command Format
```javascript
ESC d [lines]
```

### Implementation

```javascript
function feedAndCut(cmd) {
  cmd.push(ESC, 0x64, 0x02);  // Feed 2 lines and cut
}
```

### Usage
- **End of receipt:** Always feed before cutting
- **Typical:** 2-3 lines of feed
- **Spacing:** Use `newline()` for spacing, `feedAndCut()` only at the end

```javascript
// End of receipt
text(cmd, 'Thank you!');
newline(cmd, 3);  // Spacing before cut
feedAndCut(cmd);   // Feed and cut
```

---

## Character Encoding

### Finnish Characters

**Problem:** Direct UTF-8 doesn't work for ä, ö, å.

**Solution:** Character code mapping

```javascript
function encode(text) {
  return Array.from(text).map(c => {
    const code = c.charCodeAt(0);
    
    // Finnish lowercase
    if (c === 'ä') return 0x7B;
    if (c === 'ö') return 0x7C;
    if (c === 'å') return 0x7D;
    
    // Finnish uppercase
    if (c === 'Ä') return 0x5B;
    if (c === 'Ö') return 0x5C;
    if (c === 'Å') return 0x5D;
    
    // Euro symbol
    if (c === '€') return 0x80;
    
    return code;
  });
}
```

### Extended Characters

| Character | Code | Notes |
|-----------|------|-------|
| ä | `0x7B` | a with diaeresis |
| ö | `0x7C` | o with diaeresis |
| å | `0x7D` | a with ring |
| Ä | `0x5B` | A with diaeresis |
| Ö | `0x5C` | O with diaeresis |
| Å | `0x5D` | A with ring |
| € | `0x80` | Euro symbol |

---

## Complete Receipt Template

See `test-complete-receipt.js` for full production-ready example with:
- Restaurant header (3x3 logo, 2x2 subtitle)
- Order number (4x4, huge)
- Customer info (1x1, left aligned)
- Item list (2x2 items, 1x1 toppings)
- Special instructions
- Totals breakdown (2x2)
- Final total (4x4, emphasized)
- QR code
- Footer

---

## Style Menu

### Recommended Styles by Section

#### 1. Header Styles

```javascript
// Restaurant Name - Maximum impact
setAlign(cmd, 1);
emphasisOn(cmd);
setSize(cmd, 3, 3);
text(cmd, 'tirva');
newline(cmd);
emphasisOff(cmd);

// Subtitle - Secondary emphasis
setSize(cmd, 2, 2);
text(cmd, 'kahvila');
newline(cmd);

// Contact Info - Normal
setSize(cmd, 1, 1);
text(cmd, 'Pasintie 2, 45410 Utti');
newline(cmd);
text(cmd, 'Puh: +358-3-589-9089');
newline(cmd, 2);
```

#### 2. Order Info Styles

```javascript
// Order Number - Huge and centered
setAlign(cmd, 1);
emphasisOn(cmd);
setSize(cmd, 4, 4);
text(cmd, '#1234');
newline(cmd);
emphasisOff(cmd);

// Date/Time - Normal, centered
setSize(cmd, 1, 1);
text(cmd, '30.11.2025 klo 14:30');
newline(cmd);

// Order Type - Medium bold
emphasisOn(cmd);
setSize(cmd, 2, 2);
text(cmd, 'KOTIINKULJETUS');
newline(cmd);
emphasisOff(cmd);
```

#### 3. Customer Info Styles

```javascript
// Section header
setAlign(cmd, 1);
emphasisOn(cmd);
text(cmd, 'ASIAKASTIEDOT');
newline(cmd);
emphasisOff(cmd);

// Customer details - left aligned
setAlign(cmd, 0);
emphasisOn(cmd);
text(cmd, 'Nimi: ');
emphasisOff(cmd);
text(cmd, 'Matti Meikalainen');
newline(cmd);

emphasisOn(cmd);
text(cmd, 'Puh: ');
emphasisOff(cmd);
text(cmd, '+358 40 123 4567');
newline(cmd);
```

#### 4. Item List Styles

```javascript
// Item name - Large and bold
setAlign(cmd, 0);
emphasisOn(cmd);
setSize(cmd, 2, 2);
text(cmd, '2x Pizza Margherita');
newline(cmd);
emphasisOff(cmd);

// Price - Right aligned, large, bold
setAlign(cmd, 2);
emphasisOn(cmd);
setSize(cmd, 2, 2);
text(cmd, '25.00€');
newline(cmd);
emphasisOff(cmd);

// Toppings - Normal, indented
setAlign(cmd, 0);
setSize(cmd, 1, 1);
text(cmd, '  Lisatteet:');
newline(cmd);
text(cmd, '    + Extra juusto');
setAlign(cmd, 2);
text(cmd, '+2.00€');
newline(cmd);

// Special instructions - Normal, italic (if supported)
setAlign(cmd, 0);
text(cmd, '  Huom: Hyvin paistettu');
newline(cmd);
```

#### 5. Totals Section Styles

```javascript
// Section divider
setAlign(cmd, 1);
text(cmd, '================================');
newline(cmd);

// Subtotals - Medium size
setAlign(cmd, 0);
setSize(cmd, 2, 2);
text(cmd, 'Valisumma:');
setAlign(cmd, 2);
text(cmd, '43.00€');
newline(cmd);

setAlign(cmd, 0);
text(cmd, 'Toimitus:');
setAlign(cmd, 2);
text(cmd, '3.50€');
newline(cmd);

// Grand Total - HUGE
setAlign(cmd, 0);
emphasisOn(cmd);
setSize(cmd, 3, 3);
text(cmd, 'YHTEENSA:');
newline(cmd);

setAlign(cmd, 2);
setSize(cmd, 4, 4);
text(cmd, '48.50€');
newline(cmd);
emphasisOff(cmd);
```

#### 6. Footer Styles

```javascript
// Thank you message - Center, normal
setAlign(cmd, 1);
setSize(cmd, 1, 1);
newline(cmd, 2);
text(cmd, 'Kiitos tilauksestasi!');
newline(cmd);
text(cmd, 'Tervetuloa uudelleen!');
newline(cmd, 2);

// QR Code - Centered
qrCode(cmd, 'https://tirvankahvila.fi');
newline(cmd, 2);

// URL - Small, centered
text(cmd, 'tirvankahvila.fi');
newline(cmd, 3);

// Cut
feedAndCut(cmd);
```

---

## Spacing & Layout Guidelines

### Vertical Spacing

```javascript
// Between sections: 2 blank lines
newline(cmd, 2);

// Between items: 1 blank line
newline(cmd);

// Before cut: 3 blank lines
newline(cmd, 3);
feedAndCut(cmd);
```

### Horizontal Spacing

- **Indentation:** Use spaces (`  ` or `    `)
- **Two-column:** Use alignment (left/right) on separate lines
- **Separators:** Dashes or equals signs (32-34 chars wide)

```javascript
// Separator examples
text(cmd, '--------------------------------');  // Light separator
text(cmd, '================================');  // Heavy separator
text(cmd, '- - - - - - - - - - - - - - - -');  // Dotted separator
```

---

## Common Pitfalls

### ? DON'T: Wrong parameter order
```javascript
setSize(cmd, 2, 3);  // width, height - WRONG!
```

### ? DO: Correct parameter order
```javascript
setSize(cmd, 3, 2);  // height, width - CORRECT!
```

---

### ? DON'T: Forget to turn off bold
```javascript
emphasisOn(cmd);
text(cmd, 'Bold text');
// Missing emphasisOff() - all subsequent text will be bold!
```

### ? DO: Always turn off
```javascript
emphasisOn(cmd);
text(cmd, 'Bold text');
emphasisOff(cmd);  // Clean state
```

---

### ? DON'T: Use wrong QR method
```javascript
// Method 1 or 2 - DOESN'T WORK on mC-Print3
```

### ? DO: Use Method 3 only
```javascript
// ESC GS y S 0x30 0x00 [size] [len_lo] [len_hi] [data]
qrCode(cmd, 'https://example.com');
```

---

### ? DON'T: Forget initialization
```javascript
const cmd = [];
setSize(cmd, 2, 2);  // Won't work without init!
```

### ? DO: Always initialize
```javascript
const cmd = [];
init(cmd);  // Enable Star Line Mode first
setSize(cmd, 2, 2);
```

---

## Quick Reference Card

```javascript
// Full receipt structure:
init(cmd);

// HEADER
setAlign(1); setSize(3,3); emphasisOn(); text('RESTAURANT'); emphasisOff();
setSize(1,1); text('Address & Phone');

// ORDER INFO
setSize(4,4); emphasisOn(); text('#1234'); emphasisOff();
setSize(1,1); text('Date & Time');

// CUSTOMER
setAlign(0); emphasisOn(); text('Name: '); emphasisOff(); text('Customer');

// ITEMS
setSize(2,2); emphasisOn(); text('2x Pizza'); emphasisOff();
setAlign(2); emphasisOn(); text('25.00€'); emphasisOff();

// TOTALS
setAlign(0); setSize(3,3); emphasisOn(); text('TOTAL:');
setAlign(2); setSize(4,4); text('48.50€'); emphasisOff();

// FOOTER
setAlign(1); setSize(1,1); text('Thank you!');
qrCode('https://example.com');
feedAndCut();
```

---

## Testing Commands

Use `test-complete-receipt.js` to test the full receipt:

```bash
node test-complete-receipt.js
```

Expected output:
- ? All text sizes (1x1 through 4x4)
- ? Bold emphasis on headers and totals
- ? Proper alignment (left/center/right)
- ? Finnish characters (ä, ö, å, €)
- ? QR code (scannable)
- ? Clean paper cut

---

## Implementation Checklist

When implementing Star printer support:

- [ ] Initialize with `init(cmd)`
- [ ] Use `ESC i height width` for sizing (height first!)
- [ ] Use `ESC GS a align` for alignment
- [ ] Use `ESC E / ESC F` for bold
- [ ] Use Method 3 QR only (`ESC GS y S 0x30 0x00`)
- [ ] Encode Finnish chars (ä?0x7B, ö?0x7C, å?0x7D)
- [ ] Always turn off bold after use
- [ ] Feed 2-3 lines before cutting
- [ ] Test with `test-complete-receipt.js` before deploying

---

## Next Steps

1. **Test locally:** Run `test-complete-receipt.js`
2. **Verify output:** Check all sizes, alignment, QR code
3. **Update production code:** Apply to `star-modern-receipt.ts`
4. **Deploy:** Test via CloudPRNT and TCP network printing
5. **Monitor:** Check real orders for formatting issues

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-30  
**Verified Printer:** Star mC-Print3 (192.168.1.106:9100)  
**Verified Commands:** All commands tested and working ?
