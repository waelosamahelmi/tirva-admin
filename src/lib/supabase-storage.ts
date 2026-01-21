import { supabase } from './supabase-client';

// Test storage connection
export async function testStorageConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('❌ Storage connection test failed:', error);
      return false;
    }
    
    const menuImagesBucket = data.find(bucket => bucket.id === 'menu-images');
    if (!menuImagesBucket) {
      console.error('❌ menu-images bucket not found. Please create it in Supabase dashboard.');
      return false;
    }
    
    console.log('✅ Storage connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Storage connection test error:', error);
    return false;
  }
}

// Upload image to Supabase storage
export async function uploadMenuItemImage(file: File, menuItemId?: number): Promise<string> {
  try {
    // Test storage connection first
    const isConnected = await testStorageConnection();
    if (!isConnected) {
      throw new Error('Storage not properly configured. Please check the setup instructions.');
    }

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = menuItemId ? `menu-item-${menuItemId}/${fileName}` : `temp/${fileName}`;

    console.log('📸 Uploading image to Supabase storage:', filePath);

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    console.log('✅ Image uploaded successfully:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('❌ Error uploading image:', error);
    throw error;
  }
}

// Delete image from Supabase storage
export async function deleteMenuItemImage(imageUrl: string): Promise<void> {
  try {
    // Extract the file path from the URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(-2).join('/'); // Get the last two parts (folder/filename)

    console.log('🗑️ Deleting image from Supabase storage:', filePath);

    const { error } = await supabase.storage
      .from('menu-images')
      .remove([filePath]);

    if (error) {
      console.error('❌ Storage delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    console.log('✅ Image deleted successfully');

  } catch (error) {
    console.error('❌ Error deleting image:', error);
    throw error;
  }
}

// Update image (delete old and upload new)
export async function updateMenuItemImage(oldImageUrl: string | null, newFile: File, menuItemId?: number): Promise<string> {
  try {
    // Delete old image if it exists
    if (oldImageUrl) {
      try {
        await deleteMenuItemImage(oldImageUrl);
      } catch (error) {
        console.warn('⚠️ Failed to delete old image, continuing with upload:', error);
      }
    }

    // Upload new image
    return await uploadMenuItemImage(newFile, menuItemId);

  } catch (error) {
    console.error('❌ Error updating image:', error);
    throw error;
  }
}



