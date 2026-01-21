import { Client as FTPClient } from 'basic-ftp';
import path from 'path';
import { Readable } from 'stream';
import sharp from 'sharp';

// Hostinger FTP Configuration
const FTP_CONFIG = {
  host: process.env.HOSTINGER_FTP_HOST || 'ftp.tirvankahvila.fi',
  user: process.env.HOSTINGER_FTP_USER,
  password: process.env.HOSTINGER_FTP_PASSWORD,
  secure: true, // Use FTPS (FTP over SSL) with cert validation disabled
  port: 21,
};

const IMAGE_CDN_URL = process.env.IMAGE_CDN_URL || 'https://images.tirvankahvila.fi';

/**
 * Upload image to Hostinger via FTP
 * @param file - Multer file object with buffer
 * @param folder - Target folder (e.g., 'menu-items', 'categories', 'banners')
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToHostinger(
  file: Express.Multer.File,
  folder: string = 'menu-items'
): Promise<string> {
  const client = new FTPClient();
  client.ftp.verbose = process.env.NODE_ENV === 'development';

  try {
    // Validate FTP credentials
    if (!FTP_CONFIG.user || !FTP_CONFIG.password) {
      throw new Error('Hostinger FTP credentials not configured. Please set HOSTINGER_FTP_USER and HOSTINGER_FTP_PASSWORD environment variables.');
    }

    console.log('?? Connecting to Hostinger FTP...');
    
    // Temporarily disable TLS certificate validation
    const originalTLSReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    // Connect to FTP server with FTPS
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: true,
      secureOptions: {
        rejectUnauthorized: false
      },
      port: FTP_CONFIG.port,
    });
    
    // Restore original TLS setting
    if (originalTLSReject) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTLSReject;
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }

    console.log('? Connected to Hostinger FTP');

    // Process image: optimize and convert to WebP
    console.log('??? Optimizing image...');
    const optimizedBuffer = await sharp(file.buffer)
      .resize(1200, 900, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomString}.webp`;

    // Build remote path structure: /public_html/uploads/YYYY/MM/folder/filename
    // Note: images subdomain points to /public_html, so files must be inside /public_html/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const remotePath = `/${year}/${month}/${folder}/${fileName}`;

    // Ensure directory exists (create if needed)
    const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
    console.log('?? Ensuring remote directory exists:', remoteDir);
    await client.ensureDir(remoteDir);

    // Upload file
    console.log('?? Uploading to:', remotePath);
    const readable = Readable.from(optimizedBuffer);
    await client.uploadFrom(readable, remotePath);

    console.log('? Image uploaded successfully to Hostinger');

    // Build public URL
    // Since images.tirvankahvila.fi points to /public_html, we need /uploads/... in the URL
    const publicUrl = `${IMAGE_CDN_URL}/uploads/${year}/${month}/${folder}/${fileName}`;
    console.log('?? Public URL:', publicUrl);

    return publicUrl;

  } catch (error) {
    console.error('? Error uploading to Hostinger:', error);
    throw new Error(`Failed to upload image to Hostinger: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Always close FTP connection
    client.close();
  }
}

/**
 * Delete image from Hostinger via FTP
 * @param imageUrl - Full URL of the image to delete
 * @returns True if deletion successful, false otherwise
 */
export async function deleteImageFromHostinger(imageUrl: string): Promise<boolean> {
  const client = new FTPClient();
  client.ftp.verbose = process.env.NODE_ENV === 'development';

  try {
    // Validate FTP credentials
    if (!FTP_CONFIG.user || !FTP_CONFIG.password) {
      console.warn('Hostinger FTP credentials not configured, skipping delete');
      return false;
    }

    // Extract path from URL
    // Example: https://images.tirvankahvila.fi/uploads/2024/11/menu-items/123456-abc123.webp
    // Extract: /uploads/2024/11/menu-items/123456-abc123.webp
    const url = new URL(imageUrl);
    const remotePath = url.pathname;

    console.log('??? Deleting image from Hostinger:', remotePath);

    // Connect to FTP server
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: FTP_CONFIG.secure,
      port: FTP_CONFIG.port,
    });

    // Delete file
    await client.remove(remotePath);
    console.log('? Image deleted successfully from Hostinger');

    return true;

  } catch (error) {
    console.error('? Error deleting from Hostinger:', error);
    return false;
  } finally {
    client.close();
  }
}

/**
 * Test FTP connection to Hostinger
 */
export async function testHostingerConnection(): Promise<boolean> {
  const client = new FTPClient();
  
  try {
    if (!FTP_CONFIG.user || !FTP_CONFIG.password) {
      console.error('? FTP credentials not configured');
      return false;
    }

    console.log('?? Testing Hostinger FTP connection...');
    
    await client.access({
      host: FTP_CONFIG.host,
      user: FTP_CONFIG.user,
      password: FTP_CONFIG.password,
      secure: FTP_CONFIG.secure,
      port: FTP_CONFIG.port,
    });

    console.log('? Hostinger FTP connection successful');
    
    // Test directory listing
    const list = await client.list('/');
    console.log('?? Root directory contents:', list.length, 'items');

    return true;

  } catch (error) {
    console.error('? Hostinger FTP connection failed:', error);
    return false;
  } finally {
    client.close();
  }
}
