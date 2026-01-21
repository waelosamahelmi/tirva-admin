import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, handleSupabaseError, formatSupabaseResponse } from "@/lib/supabase-client";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";

// Get all topping groups
export function useToppingGroups() {
  const { user } = useSupabaseAuth();
  
  return useQuery({
    queryKey: ["topping-groups"],
    queryFn: async () => {
      console.log('📋 Fetching topping groups...');
      
      const { data, error } = await supabase
        .from('topping_groups')
        .select(`
          *,
          topping_group_items (
            id,
            topping_id,
            display_order,
            toppings (*)
          )
        `)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('❌ Failed to fetch topping groups:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping groups fetched:', data?.length || 0);
      return formatSupabaseResponse(data) || [];
    },
    enabled: !!user,
  });
}

// Get category topping groups
export function useCategoryToppingGroups(categoryId?: number) {
  const { user } = useSupabaseAuth();
  
  return useQuery({
    queryKey: categoryId ? ["category-topping-groups", categoryId] : ["category-topping-groups"],
    queryFn: async () => {
      console.log('📋 Fetching category topping groups...', categoryId);
      
      let query = supabase
        .from('category_topping_groups')
        .select(`
          *,
          topping_groups (
            *,
            topping_group_items (
              *,
              toppings (*)
            )
          )
        `);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch category topping groups:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Category topping groups fetched:', data?.length || 0);
      return formatSupabaseResponse(data) || [];
    },
    enabled: !!user,
  });
}

// Create topping group
export function useCreateToppingGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      console.log('➕ Creating topping group:', data);
      
      const { data: result, error } = await supabase
        .from('topping_groups')
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create topping group:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping group created:', result);
      return formatSupabaseResponse(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topping-groups"] });
    },
  });
}

// Update topping group
export function useUpdateToppingGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('✏️ Updating topping group:', id, data);
      
      const { data: result, error } = await supabase
        .from('topping_groups')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update topping group:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping group updated:', result);
      return formatSupabaseResponse(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topping-groups"] });
    },
  });
}

// Delete topping group
export function useDeleteToppingGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      console.log('🗑️ Deleting topping group:', id);
      
      const { error } = await supabase
        .from('topping_groups')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to delete topping group:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping group deleted');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topping-groups"] });
    },
  });
}

// Assign topping group to category
export function useAssignToppingGroupToCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, toppingGroupId }: { categoryId: number; toppingGroupId: number }) => {
      console.log('➕ Assigning topping group to category:', { categoryId, toppingGroupId });
      
      const { data, error } = await supabase
        .from('category_topping_groups')
        .insert([{ category_id: categoryId, topping_group_id: toppingGroupId }])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to assign topping group:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping group assigned');
      return formatSupabaseResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-topping-groups"] });
    },
  });
}

// Remove topping group from category
export function useRemoveToppingGroupFromCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, toppingGroupId }: { categoryId: number; toppingGroupId: number }) => {
      console.log('➖ Removing topping group from category:', { categoryId, toppingGroupId });

      const { error } = await supabase
        .from('category_topping_groups')
        .delete()
        .eq('category_id', categoryId)
        .eq('topping_group_id', toppingGroupId);

      if (error) {
        console.error('❌ Failed to remove topping group:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping group removed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-topping-groups"] });
    },
  });
}

// Get menu item topping groups
export function useMenuItemToppingGroups(menuItemId?: number) {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: menuItemId ? ["menu-item-topping-groups", menuItemId] : ["menu-item-topping-groups"],
    queryFn: async () => {
      console.log('📋 Fetching menu item topping groups...', menuItemId);

      let query = supabase
        .from('menu_item_topping_groups')
        .select(`
          *,
          topping_groups (
            *,
            topping_group_items (
              *,
              toppings (*)
            )
          )
        `);

      if (menuItemId) {
        query = query.eq('menu_item_id', menuItemId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch menu item topping groups:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Menu item topping groups fetched:', data?.length || 0);
      return formatSupabaseResponse(data) || [];
    },
    enabled: !!user,
  });
}

// Assign topping group to menu item
export function useAssignToppingGroupToMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menuItemId, toppingGroupId }: { menuItemId: number; toppingGroupId: number }) => {
      console.log('➕ Assigning topping group to menu item:', { menuItemId, toppingGroupId });

      const { data, error } = await supabase
        .from('menu_item_topping_groups')
        .insert([{ menu_item_id: menuItemId, topping_group_id: toppingGroupId }])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to assign topping group:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping group assigned to menu item');
      return formatSupabaseResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-item-topping-groups"] });
    },
  });
}

// Remove topping group from menu item
export function useRemoveToppingGroupFromMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ menuItemId, toppingGroupId }: { menuItemId: number; toppingGroupId: number }) => {
      console.log('➖ Removing topping group from menu item:', { menuItemId, toppingGroupId });

      const { error } = await supabase
        .from('menu_item_topping_groups')
        .delete()
        .eq('menu_item_id', menuItemId)
        .eq('topping_group_id', toppingGroupId);

      if (error) {
        console.error('❌ Failed to remove topping group:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Topping group removed from menu item');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-item-topping-groups"] });
    },
  });
}



