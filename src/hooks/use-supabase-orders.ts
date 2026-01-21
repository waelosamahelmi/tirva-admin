import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, handleSupabaseError, formatSupabaseResponse } from "@/lib/supabase-client";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";

// Get all orders
export function useSupabaseOrders() {
  const { user, userBranch, loading } = useSupabaseAuth();
  
  return useQuery({
    queryKey: ["supabase-orders", userBranch],
    queryFn: async () => {
      console.log('📦 Fetching orders from Supabase...', { userBranch, loading });
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `);
      
      // Filter by user's branch if they have one assigned
      if (userBranch !== null && userBranch !== undefined) {
        query = query.eq('branch_id', userBranch);
        console.log('🏢 Filtering orders for branch:', userBranch);
      } else {
        console.log('⚠️ No branch filter applied - user has no branch assigned');
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch orders:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Orders fetched successfully:', data?.length || 0, 'orders');
      console.log('📋 Orders branch_id values:', data?.map(o => ({ id: o.id, orderNumber: o.order_number, branchId: o.branch_id })));
      return formatSupabaseResponse(data) || [];
    },
    enabled: !!user && !loading, // Wait for auth loading to complete before fetching orders
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Get single order by ID
export function useSupabaseOrder(id: number) {
  const { user } = useSupabaseAuth();
  
  return useQuery({
    queryKey: ["supabase-order", id],
    queryFn: async () => {
      console.log('📦 Fetching order from Supabase:', id);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Failed to fetch order:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Order fetched successfully:', data?.id);
      return formatSupabaseResponse(data);
    },
    enabled: !!user && !!id,
  });
}

// Create new order
export function useSupabaseCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: any) => {
      console.log('📦 Creating order in Supabase:', orderData);
      
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create order:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Order created successfully:', data?.id);
      return formatSupabaseResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-orders"] });
    },
  });
}

// Update order status
export function useSupabaseUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      console.log('📦 Updating order status in Supabase:', id, '->', status);
      
      const { data, error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update order status:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Order status updated successfully:', data?.id, data?.status);
      return formatSupabaseResponse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-orders"] });
    },
  });
}

// Delete order
export function useSupabaseDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      console.log('📦 Deleting order from Supabase:', id);
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Failed to delete order:', error);
        handleSupabaseError(error);
      }

      console.log('✅ Order deleted successfully:', id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supabase-orders"] });
    },
  });
}



