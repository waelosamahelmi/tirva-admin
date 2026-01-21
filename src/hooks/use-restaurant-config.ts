import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, handleSupabaseError, formatSupabaseResponse } from "@/lib/supabase-client";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";
import { RestaurantConfig, InsertRestaurantConfig } from "../../shared/schema";

// Transform camelCase fields to snake_case for database
function transformToDatabase(formData: any): any {
  const result: any = {};
  
  // Only include fields that are explicitly provided
  if (formData.name !== undefined) result.name = formData.name;
  if (formData.nameEn !== undefined) result.name_en = formData.nameEn;
  if (formData.tagline !== undefined) result.tagline = formData.tagline;
  if (formData.taglineEn !== undefined) result.tagline_en = formData.taglineEn;
  if (formData.description !== undefined) result.description = formData.description;
  if (formData.descriptionEn !== undefined) result.description_en = formData.descriptionEn;
  if (formData.phone !== undefined) result.phone = formData.phone;
  if (formData.email !== undefined) result.email = formData.email;
  if (formData.address !== undefined) result.address = formData.address;
  if (formData.socialMedia !== undefined) result.social_media = formData.socialMedia;
  if (formData.hours !== undefined) result.hours = formData.hours;
  if (formData.services !== undefined) result.services = formData.services;
  if (formData.deliveryConfig !== undefined) result.delivery_config = formData.deliveryConfig;
  if (formData.theme !== undefined) result.theme = formData.theme;
  if (formData.logo !== undefined) result.logo = formData.logo;
  if (formData.about !== undefined) result.about = formData.about;
  if (formData.hero !== undefined) result.hero = formData.hero;
  // Always ensure is_active is true
  result.is_active = true;
  
  return result;
}

// Transform snake_case database fields to camelCase
function transformFromDatabase(dbData: any): RestaurantConfig {
  if (!dbData) return dbData;
  
  return {
    id: dbData.id,
    name: dbData.name,
    nameEn: dbData.name_en,
    tagline: dbData.tagline,
    taglineEn: dbData.tagline_en,
    description: dbData.description,
    descriptionEn: dbData.description_en,
    phone: dbData.phone,
    email: dbData.email,
    address: dbData.address,
    socialMedia: dbData.social_media,
    hours: dbData.hours,
    services: dbData.services,
    deliveryConfig: dbData.delivery_config,
    theme: dbData.theme,
    logo: dbData.logo,
    about: dbData.about,
    hero: dbData.hero,
    isActive: dbData.is_active,
    createdAt: dbData.created_at,
    updatedAt: dbData.updated_at,
  };
}

// Get active restaurant config
export function useRestaurantConfig() {
  const { user } = useSupabaseAuth();
  
  return useQuery({
    queryKey: ["restaurant-config"],
    queryFn: async () => {
      console.log('🏪 Fetching restaurant config from Supabase...');
      
      const { data, error } = await supabase
        .from('restaurant_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('❌ Failed to fetch restaurant config:', error);
        // Return null if no active config exists
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        handleSupabaseError(error);
      }

      console.log('✅ Restaurant config fetched successfully');
      return transformFromDatabase(data);
    },
    enabled: !!user,
  });
}

// Get all restaurant configs (for management)
export function useAllRestaurantConfigs() {
  const { user } = useSupabaseAuth();
  
  return useQuery({
    queryKey: ["restaurant-configs-all"],
    queryFn: async () => {
      console.log('🏪 Fetching all restaurant configs from Supabase...');
      
      const { data, error } = await supabase
        .from('restaurant_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch restaurant configs:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Restaurant configs fetched successfully');
      return data?.map(transformFromDatabase) || [];
    },
    enabled: !!user,
  });
}

// Create restaurant config
export function useCreateRestaurantConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (configData: any) => {
      console.log('🏪 Creating restaurant config...', configData);

      // Transform camelCase to snake_case for database
      const dbData = transformToDatabase(configData);

      const { data, error } = await supabase
        .from('restaurant_config')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create restaurant config:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Restaurant config created successfully');
      return transformFromDatabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-config"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-configs-all"] });
    },
  });
}

// Update restaurant config
export function useUpdateRestaurantConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...configData }: { id: string } & any) => {
      console.log('🏪 Updating restaurant config...', { id, configData });

      // Transform camelCase to snake_case for database  
      const dbData = transformToDatabase(configData);

      const { data, error } = await supabase
        .from('restaurant_config')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update restaurant config:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Restaurant config updated successfully');
      return transformFromDatabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-config"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-configs-all"] });
    },
  });
}

// Delete restaurant config
export function useDeleteRestaurantConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🏪 Deleting restaurant config...', id);

      const { error } = await supabase
        .from('restaurant_config')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to delete restaurant config:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Restaurant config deleted successfully');
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-config"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-configs-all"] });
    },
  });
}

// Activate restaurant config (deactivates all others)
export function useActivateRestaurantConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('🏪 Activating restaurant config...', id);

      // First, deactivate all configs
      const { error: deactivateError } = await supabase
        .from('restaurant_config')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (deactivateError) {
        console.error('❌ Failed to deactivate restaurant configs:', deactivateError);
        handleSupabaseError(deactivateError);
      }

      // Then activate the selected config
      const { data, error } = await supabase
        .from('restaurant_config')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to activate restaurant config:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Restaurant config activated successfully');
      return transformFromDatabase(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-config"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-configs-all"] });
    },
  });
}