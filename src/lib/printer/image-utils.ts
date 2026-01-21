/**
 * Image utilities for thermal printer
 * Converts images and QR codes to thermal printer format
 */

import QRCode from 'qrcode';

/**
 * Download and convert an image URL to grayscale bitmap for thermal printer
 */
export async function imageUrlToBitmap(
  imageUrl: string, 
  maxWidth: number = 384
): Promise<{ width: number; height: number; data: Uint8Array }> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Create an image element
    const img = await createImageBitmap(blob);
    
    // Calculate dimensions maintaining aspect ratio
    let width = img.width;
    let height = img.height;
    
    if (width > maxWidth) {
      height = Math.floor((height * maxWidth) / width);
      width = maxWidth;
    }
    
    // Create canvas to process image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw image
    ctx.drawImage(img, 0, 0, width, height);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    
    // Convert to grayscale and apply dithering
    const grayscale = new Uint8Array(width * height);
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // Convert to grayscale using luminance formula
      const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
      grayscale[i / 4] = gray;
    }
    
    // Apply Floyd-Steinberg dithering for better quality
    const dithered = floydSteinbergDithering(grayscale, width, height);
    
    return {
      width,
      height,
      data: dithered
    };
  } catch (error) {
    console.error('Error converting image:', error);
    throw error;
  }
}

/**
 * Generate QR code as bitmap for thermal printer
 */
export async function generateQRCodeBitmap(
  data: string,
  size: number = 200
): Promise<{ width: number; height: number; data: Uint8Array }> {
  try {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    // Convert data URL to bitmap
    return await dataUrlToBitmap(qrDataUrl, size);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Convert data URL to bitmap
 */
async function dataUrlToBitmap(
  dataUrl: string,
  maxWidth: number = 384
): Promise<{ width: number; height: number; data: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.floor((height * maxWidth) / width);
          width = maxWidth;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // Convert to grayscale
        const grayscale = new Uint8Array(width * height);
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const gray = Math.floor(0.299 * r + 0.587 * g + 0.114 * b);
          grayscale[i / 4] = gray;
        }
        
        // Apply dithering
        const dithered = floydSteinbergDithering(grayscale, width, height);
        
        resolve({ width, height, data: dithered });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Floyd-Steinberg dithering algorithm
 * Converts grayscale to black and white with better visual quality
 */
function floydSteinbergDithering(
  grayscale: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const result = new Uint8Array(width * height);
  const errors = new Float32Array(width * height);
  
  // Copy grayscale values to errors array
  for (let i = 0; i < grayscale.length; i++) {
    errors[i] = grayscale[i];
  }
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx];
      const newPixel = oldPixel < 128 ? 0 : 255;
      
      result[idx] = newPixel;
      const error = oldPixel - newPixel;
      
      // Distribute error to neighboring pixels
      if (x + 1 < width) {
        errors[idx + 1] += error * 7 / 16;
      }
      if (y + 1 < height) {
        if (x > 0) {
          errors[idx + width - 1] += error * 3 / 16;
        }
        errors[idx + width] += error * 5 / 16;
        if (x + 1 < width) {
          errors[idx + width + 1] += error * 1 / 16;
        }
      }
    }
  }
  
  return result;
}

/**
 * Convert bitmap to ESC/POS image command
 */
export function bitmapToESCPOS(bitmap: { width: number; height: number; data: Uint8Array }): number[] {
  const commands: number[] = [];
  const { width, height, data } = bitmap;
  
  // Calculate bytes per line (must be multiple of 8)
  const bytesPerLine = Math.ceil(width / 8);
  const paddedWidth = bytesPerLine * 8;
  
  // ESC * m nL nH d1...dk - Select bit image mode
  // Mode 33 = 24-dot double-density
  const xL = (paddedWidth) & 0xFF;
  const xH = (paddedWidth >> 8) & 0xFF;
  
  // Process image in horizontal stripes of 24 pixels (3 bytes) height
  for (let y = 0; y < height; y += 24) {
    const stripeHeight = Math.min(24, height - y);
    
    // GS v 0 - Print raster bit image
    commands.push(0x1D, 0x76, 0x30, 0x00); // GS v 0 m
    commands.push(xL, xH); // Width in dots
    
    const yL = stripeHeight & 0xFF;
    const yH = (stripeHeight >> 8) & 0xFF;
    commands.push(yL, yH); // Height in dots
    
    // Convert pixels to bytes
    for (let stripe = 0; stripe < stripeHeight; stripe++) {
      for (let x = 0; x < paddedWidth; x += 8) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const px = x + bit;
          const py = y + stripe;
          
          if (px < width && py < height) {
            const pixel = data[py * width + px];
            // Black pixel (0) should be 1 in the bitmap
            if (pixel < 128) {
              byte |= (1 << (7 - bit));
            }
          }
        }
        commands.push(byte);
      }
    }
    
    // Add line feed after each stripe
    commands.push(0x0A);
  }
  
  return commands;
}

/**
 * Create decorative line with icons (using ASCII characters)
 */
export function createDecorativeLine(char: string = '═', width: number = 48): string {
  return char.repeat(width);
}

/**
 * Create box drawing for sections
 */
export function createBox(content: string[], width: number = 48): string[] {
  const lines: string[] = [];
  lines.push('╔' + '═'.repeat(width - 2) + '╗');
  
  content.forEach(line => {
    const padding = width - 4 - line.length;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    lines.push('║ ' + ' '.repeat(leftPad) + line + ' '.repeat(rightPad) + ' ║');
  });
  
  lines.push('╚' + '═'.repeat(width - 2) + '╝');
  return lines;
}

/**
 * Icon replacements using Unicode box-drawing characters and symbols
 * These work well on most thermal printers
 */
export const ICONS = {
  PHONE: '☎',
  EMAIL: '✉',
  HOME: '⌂',
  LOCATION: '⚐',
  CLOCK: '⏰',
  CARD: '💳',
  CASH: '💵',
  CHECK: '✓',
  STAR: '★',
  HEART: '♥',
  DELIVERY: '🚚',
  PICKUP: '🏪',
  TABLE: '🍽',
  FOOD: '🍕',
  DRINK: '☕',
  RECEIPT: '📃',
  QR: '◈',
  ARROW_RIGHT: '→',
  ARROW_DOWN: '↓',
  BULLET: '•',
  BOX: '▪',
};



