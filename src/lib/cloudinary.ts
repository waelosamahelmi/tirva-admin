// Cloudinary configuration and upload utilities
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = import.meta.env.VITE_CLOUDINARY_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY) {
  console.warn('Missing Cloudinary environment variables. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_API_KEY to your .env file');
}

if (!API_URL) {
  console.warn('Missing API URL. Please add VITE_API_URL or VITE_SERVER_URL to your .env file');
}

// Upload image via our server to Cloudinary
export async function uploadImageToCloudinary(file: File, restaurantName?: string, folder = 'menu'): Promise<string> {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size too large. Maximum size is 10MB.');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
    }

    console.log('📸 Uploading image via server to Cloudinary...');

    // Get Supabase session token
    const { supabase } = await import('./supabase-client');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required. Please log in.');
    }

    // Create form data for upload
    const formData = new FormData();
    formData.append('image', file);
    formData.append('restaurantName', restaurantName || 'default-restaurant');
    formData.append('folder', folder);

    // Upload via our server endpoint with Bearer token
    const response = await fetch(`${API_URL}/api/upload-image`, {
      method: 'POST',
      body: formData,
      credentials: 'include', // For session-based auth if available
      headers: {
        'Authorization': `Bearer ${session.access_token}`, // Supabase JWT token
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`);
    }

    const data = await response.json();
    
    console.log('✅ Image uploaded successfully to Cloudinary:', data.imageUrl);
    return data.imageUrl;

  } catch (error) {
    console.error('❌ Error uploading image to Cloudinary:', error);
    throw error;
  }
}

// Delete image from Cloudinary
export async function deleteImageFromCloudinary(imageUrl: string): Promise<boolean> {
  try {
    if (!CLOUDINARY_CLOUD_NAME) {
      console.warn('Cloudinary cloud name not configured, skipping delete');
      return false;
    }

    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL');
    }

    // Get the public_id (everything after version)
    const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove file extension

    console.log('🗑️ Deleting image from Cloudinary:', publicId);

    // Note: Deleting from Cloudinary requires server-side implementation with API secret
    // For now, we'll just log the deletion attempt
    console.log('⚠️ Image deletion from Cloudinary requires server-side implementation');
    
    return true;
  } catch (error) {
    console.error('❌ Error deleting image from Cloudinary:', error);
    return false;
  }
}

// Update image (delete old and upload new)
export async function updateImageInCloudinary(
  oldImageUrl: string | null, 
  newFile: File, 
  restaurantName?: string,
  folder = 'menu'
): Promise<string> {
  try {
    // Get Supabase session token
    const { supabase } = await import('./supabase-client');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Authentication required. Please log in.');
    }

    // Delete old image if it exists and is from Cloudinary
    if (oldImageUrl && oldImageUrl.includes('cloudinary.com')) {
      try {
        await deleteImageFromCloudinary(oldImageUrl);
      } catch (error) {
        console.warn('⚠️ Failed to delete old image, continuing with upload:', error);
      }
    }

    // Upload new image
    return await uploadImageToCloudinary(newFile, restaurantName, folder);

  } catch (error) {
    console.error('❌ Error updating image in Cloudinary:', error);
    throw error;
  }
}


