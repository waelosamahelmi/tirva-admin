import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn('Missing Cloudinary environment variables. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file');
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

// Upload image to Cloudinary from buffer
export async function uploadImageToCloudinary(
  file: Express.Multer.File, 
  restaurantName: string = 'default-restaurant',
  folder: string = 'menu'
): Promise<string> {
  try {
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary not configured. Please check environment variables.');
    }

    console.log('?? Uploading image to Cloudinary...');

    // Create a sanitized restaurant name for folder structure
    const sanitizedRestaurantName = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Create folder path: restaurant-name/folder (e.g., "tirvan-kahvila/menu")
    const folderPath = `${sanitizedRestaurantName}/${folder}`;

    // Convert buffer to stream
    const stream = Readable.from(file.buffer);

    // Upload to Cloudinary
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          quality: 'auto',
          fetch_format: 'auto',
          resource_type: 'image',
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Upload failed - no result'));
          }
        }
      );

      stream.pipe(uploadStream);
    });

    console.log('? Image uploaded successfully to Cloudinary folder:', folderPath);
    console.log('?? Image URL:', result.secure_url);
    return result.secure_url;

  } catch (error) {
    console.error('? Error uploading image to Cloudinary:', error);
    throw error;
  }
}

// Delete image from Cloudinary
export async function deleteImageFromCloudinary(imageUrl: string): Promise<boolean> {
  try {
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('Cloudinary not configured, skipping delete');
      return false;
    }

    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    // Get the public_id (everything after version, without extension)
    const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');

    console.log('??? Deleting image from Cloudinary:', publicId);

    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log('? Image deleted successfully from Cloudinary');
      return true;
    } else {
      console.warn('?? Image deletion result:', result);
      return false;
    }

  } catch (error) {
    console.error('? Error deleting image from Cloudinary:', error);
    return false;
  }
}

// Test Cloudinary connection
export async function testCloudinaryConnection(): Promise<boolean> {
  try {
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('Cloudinary not configured');
      return false;
    }

    // Simple API call to test connection
    const result = await cloudinary.api.ping();
    console.log('? Cloudinary connection test successful:', result);
    return true;

  } catch (error) {
    console.error('? Cloudinary connection test failed:', error);
    return false;
  }
}

export { cloudinary };