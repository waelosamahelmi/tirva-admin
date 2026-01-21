# CloudPRNT Integration Guide

## Overview

This implementation integrates **Star Micronics CloudPRNT** protocol into the tirva Admin App. CloudPRNT allows Star thermal printers (mC-Print3, TSP100IV, etc.) to poll a server for print jobs over HTTP, enabling remote printing without direct network connections from the admin app.

## Architecture

```
Admin App ? CloudPRNT Server ? Star Printer
    ?                ?               ?
  Submit Job     Queue Job       Poll Server
                                 Get Job Data
                                 Print Receipt
                                 Confirm Completion
```

## Features

### ? CloudPRNT Protocol Support
- **HTTP Polling**: Printers poll server every few seconds for jobs
- **Job Queue**: Server maintains queue of print jobs per printer
- **Job Confirmation**: Printers confirm successful/failed prints
- **MAC-based routing**: Jobs routed to specific printers by MAC address

### ? Modern Receipt Design
- **Logo**: Text-based tirva restaurant logo at top
- **QR Code**: Links to tirvankahvila.fi for customer feedback
- **Finnish Encoding**: Proper CP850 encoding for ä, ö, å characters
- **Structured Layout**:
  - Order number (large, prominent)
  - Customer information
  - Itemized list with toppings
  - Conditional pricing support (free toppings)
  - Subtotal, fees, discounts
  - Large total amount
  - Special instructions

### ? Dual Printer Support
- **Star Printers**: Native StarPRNT commands with QR codes
- **ESC/POS Printers**: Generic ESC/POS with QR support
- Auto-detection based on printer model/name

## Files Structure

```
tirva-app/
+-- server/
¦   +-- cloudprnt-server.ts         # CloudPRNT server implementation
+-- src/lib/printer/
¦   +-- cloudprnt-client.ts         # Client API for submitting jobs
¦   +-- modern-receipt-formatter.ts # Modern ESC/POS receipts
¦   +-- star-formatter.ts           # Enhanced Star printer formatter
¦   +-- receipt-graphics.ts         # QR code & graphics generation
¦   +-- escpos-formatter.ts         # Original ESC/POS formatter (updated)
¦   +-- printer-service.ts          # Main printer service
+-- README_CLOUDPRNT.md            # This file
```

## Setup Instructions

### 1. Printer Configuration

Configure your Star printer to poll the CloudPRNT server:

**For Star mC-Print3:**
1. Access printer web interface (find IP via Star Configuration utility)
2. Navigate to CloudPRNT settings
3. Set Server URL: `http://YOUR_SERVER_IP:5000/cloudprnt/PRINTER_MAC`
   - Replace `YOUR_SERVER_IP` with your server's IP address
   - Replace `PRINTER_MAC` with printer's MAC address (e.g., `00:11:62:12:34:56`)
4. Set polling interval: 5 seconds (recommended)
5. Enable CloudPRNT
6. Save and restart printer

**Example CloudPRNT URL:**
```
http://192.168.1.100:5000/cloudprnt/001162123456
```

### 2. Server Configuration

The CloudPRNT server is automatically started with the mobile backend:

```bash
npm run start:mobile
```

Server endpoints:
- `POST /cloudprnt/:mac` - Printer polls for jobs
- `GET /cloudprnt/:mac/:jobId` - Printer requests job data
- `DELETE /cloudprnt/:mac/:jobId` - Printer confirms completion
- `POST /cloudprnt-api/submit-job` - Admin app submits jobs
- `GET /cloudprnt-api/status` - Server status
- `GET /cloudprnt-api/printers` - List registered printers

### 3. Admin App Integration

Use the CloudPRNT client to submit print jobs:

```typescript
import { createCloudPRNTClient } from '@/lib/printer/cloudprnt-client';
import { ReceiptData } from '@/lib/printer/types';

// Create client
const cloudPRNT = createCloudPRNTClient('http://localhost:5000');

// Submit print job
const receiptData: ReceiptData = {
  orderNumber: '1234',
  timestamp: new Date(),
  customerName: 'John Doe',
  customerPhone: '+358-123-456-789',
  customerEmail: 'john@example.com',
  deliveryAddress: 'Vapaudenkatu 1\n45410 Utti',
  orderType: 'delivery',
  paymentMethod: 'card',
  items: [
    {
      name: 'Pizza Margherita',
      quantity: 2,
      unitPrice: 12.00,
      totalPrice: 24.00,
      toppings: [
        { name: 'Extra cheese', price: 2.00 },
        { name: 'Olives', price: 1.50 }
      ],
      notes: 'Size: large'
    }
  ],
  total: 24.00
};

const result = await cloudPRNT.submitJob(
  '001162123456',  // Printer MAC address
  receiptData,
  originalOrder,   // Optional: full order object
  'star'           // 'star' or 'escpos'
);

if (result.success) {
  console.log(`Job queued: ${result.jobId}`);
}
```

## Receipt Features

### Finnish Character Support

All text is encoded using **CP850 (Multilingual Latin I)** which properly supports:
- ä ? 0x84
- Ä ? 0x8E
- ö ? 0x94
- Ö ? 0x99
- å ? 0x86
- Å ? 0x8F

Example output:
```
Lisätäytteet:
  + Juusto
  + Paprika
  + Sipuli
```

### QR Code Integration

QR codes are generated using native printer commands:

**ESC/POS Printers:**
```typescript
// Model 2, Error correction M, size 6
GS ( k pL pH cn fn n [data]
```

**Star Printers:**
```typescript
// Model 2, Error correction M, cell size 4
ESC GS y S 0 model errorLevel cellSize dataLength [data]
```

The QR code links to `https://tirvankahvila.fi`

### Conditional Pricing

The receipt formatter supports:
- Free toppings (e.g., first 4 free on "Your Choice Pizza")
- Size-based pricing (family size = 2x topping price)
- Dynamic topping pricing based on menu item configuration

### Logo Options

Three logo approaches are supported:

1. **Text Logo** (default, most reliable):
```
+--------------------------------+
¦      Tirvan Kahvila         ¦
+--------------------------------+
```

2. **Large Text**:
```
tirva
kahvila
```

3. **Image Logo** (future enhancement):
   - Convert logo to monochrome bitmap
   - Use ESC * or Star raster graphics
   - Requires image file and conversion

## CloudPRNT Protocol Details

### POST Poll (Printer ? Server)
Printer sends status and asks for jobs:

```json
{
  "mac": "001162123456",
  "model": "mC-Print3",
  "statusCode": "online"
}
```

Server response when job available:
```json
{
  "jobReady": true,
  "mediaTypes": ["application/vnd.star.starprnt"],
  "jobToken": "job_1234567890_abc123",
  "deleteMethod": "DELETE"
}
```

Server response when no jobs:
```json
{
  "jobReady": false
}
```

### GET Job Data (Printer ? Server)
Printer requests job data using jobToken:

```
GET /cloudprnt/001162123456/job_1234567890_abc123
Accept: application/vnd.star.starprnt
```

Server responds with binary print data (StarPRNT or ESC/POS commands).

### DELETE Confirmation (Printer ? Server)
Printer confirms print completion:

```
DELETE /cloudprnt/001162123456/job_1234567890_abc123?code=success
```

## Troubleshooting

### Printer Not Polling

1. **Check printer network connection**:
   ```bash
   ping PRINTER_IP
   ```

2. **Verify CloudPRNT URL in printer settings**:
   - Must be `http://` (not https)
   - Include correct MAC address
   - Port 5000 (or your configured port)

3. **Check server logs**:
   ```bash
   npm run start:mobile
   # Look for "CloudPRNT Poll from printer..."
   ```

4. **Test server endpoint manually**:
   ```bash
   curl -X POST http://localhost:5000/cloudprnt/001162123456 \
     -H "Content-Type: application/json" \
     -d '{"mac":"001162123456","model":"mC-Print3"}'
   ```

### Jobs Not Printing

1. **Check if job was queued**:
   ```bash
   curl http://localhost:5000/cloudprnt-api/status
   ```

2. **Verify printer MAC address matches**:
   - Job MAC must match printer's MAC (case-insensitive)

3. **Check printer supports media type**:
   - Star printers: `application/vnd.star.starprnt`
   - ESC/POS: `application/vnd.star.line`

### Finnish Characters Not Displaying

1. **Verify CP850 encoding is set**:
   ```typescript
   // ESC/POS
   commands.push(ESC, 0x74, 0x02); // CP850
   
   // Star
   commands.push(ESC, 0x74, 0x10); // CP850
   ```

2. **Check character mapping**:
   - ä should print correctly, not as "a" or "?"
   - If wrong, printer may not support CP850

3. **Alternative encodings**:
   - CP437 (0x00) - Nordic, older printers
   - ISO-8859-1 (0x10) - Western European

### QR Code Not Printing

1. **Verify printer supports QR codes**:
   - mC-Print3: Yes (firmware 1.2+)
   - TSP100IV: Yes
   - Generic ESC/POS: May not support native QR

2. **Test QR command**:
   ```typescript
   // Try different QR models (1 or 2)
   // Try different sizes (3-8)
   ```

3. **Fallback to URL text**:
   If QR fails, URL is still printed as text

## Performance Optimization

### Reduce Polling Frequency
- Default: 5 seconds
- Slower (10s): Reduces network load
- Faster (2s): Quicker printing, more network traffic

### Job Cleanup
Jobs are automatically removed:
- 1 minute after completion
- 1 hour for old completed jobs (cleanup runs every 15 min)

### Pre-generate Print Data
Print data is generated when job is created (optional):

```typescript
const job = cloudPRNTServer.createJob(
  printerMac,
  receiptData,
  originalOrder,
  'star'
);
// Data is generated on first GET request
```

## Future Enhancements

### 1. MQTT Support
CloudPRNT Version MQTT for instant printing:
- Trigger POST via MQTT message
- Faster than polling
- Requires MQTT broker

### 2. Image Logo
Convert logo to bitmap and embed in receipt:
```typescript
import { imageUrlToBitmap } from './image-utils';

const logo = await imageUrlToBitmap('/logo.png', 384);
commands.push(...bitmapToESCPOS(logo));
```

### 3. Multiple Printers
Support printer groups:
- Kitchen printer (abridged receipt)
- Counter printer (full receipt)
- Label printer (order labels)

### 4. Job Priority
Implement priority queue:
- High: Urgent orders
- Normal: Standard orders
- Low: Reports, reprints

## API Reference

### CloudPRNTServer

```typescript
class CloudPRNTServer {
  // Create a print job
  createJob(
    printerMac: string,
    receiptData: ReceiptData,
    originalOrder?: any,
    printerType?: 'star' | 'escpos'
  ): string;

  // Get Express router
  getRouter(): Router;

  // Clean up old jobs
  cleanupOldJobs(): void;
}
```

### CloudPRNTClient

```typescript
class CloudPRNTClient {
  // Submit a print job
  async submitJob(
    printerMac: string,
    receiptData: ReceiptData,
    originalOrder?: any,
    printerType?: 'star' | 'escpos'
  ): Promise<CloudPRNTJobResponse>;

  // Get server status
  async getStatus(): Promise<any>;

  // List registered printers
  async listPrinters(): Promise<any[]>;
}
```

### ModernReceiptFormatter

```typescript
class ModernReceiptFormatter {
  // Generate modern receipt with QR code
  static generate(
    receiptData: ReceiptData,
    originalOrder?: any
  ): Uint8Array;
}
```

## Support

For issues or questions:
1. Check server logs for errors
2. Verify printer settings via web interface
3. Test with Star Configuration utility
4. Review CloudPRNT protocol documentation: https://star-m.jp/products/s_print/sdk/StarCloudPRNT/manual/en/

## License

This implementation is part of the tirva Restaurant Admin App.
