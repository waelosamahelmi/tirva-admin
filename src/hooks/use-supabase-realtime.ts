import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useSupabaseAuth } from '@/lib/supabase-auth-context';
import { useAndroid } from '@/lib/android-context';
import { useBackgroundSync } from '@/lib/background-sync';

interface UseSupabaseRealtimeOptions {
  onNewOrder?: (order: any) => void;
  onOrderUpdate?: (order: any) => void;
  onOrderDelete?: (id: number) => void;
}

export function useSupabaseRealtime(options: UseSupabaseRealtimeOptions = {}) {
  const { user } = useSupabaseAuth();
  const { isAndroid, enableBackgroundMode, keepAppActive, sendNotification, hasNotificationPermission } = useAndroid();
  const { enableRealtimeBackground } = useBackgroundSync();
  const [isConnected, setIsConnected] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(false);
  
  // Use refs to store the callback functions to avoid dependency changes
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // Keep track of subscription for background cleanup
  const subscriptionRef = useRef<any>(null);
  // Enable background mode for Android when starting realtime
  useEffect(() => {
    if (isAndroid && user && !backgroundMode) {
      console.log('📱 Enabling background mode for realtime subscriptions');
      enableBackgroundMode();
      keepAppActive();
      enableRealtimeBackground(); // Enable background sync
      setBackgroundMode(true);
    }
  }, [isAndroid, user, enableBackgroundMode, keepAppActive, enableRealtimeBackground, backgroundMode]);

  // Handle app visibility changes to maintain connection
  useEffect(() => {
    if (!isAndroid) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 App went to background, ensuring realtime stays active');
        // Re-enable background mode when app goes to background
        enableBackgroundMode();
        keepAppActive();
      } else {
        console.log('📱 App came to foreground');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAndroid, enableBackgroundMode, keepAppActive]);  useEffect(() => {
    if (!user) {
      setIsConnected(false);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      return;
    }

    console.log('🔌 Setting up Supabase realtime subscriptions for user:', user.email);

    // Subscribe to orders table changes
    const ordersSubscription = supabase
      .channel('orders_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🆕 New order received via Supabase realtime:', payload.new);
          
          // Send background notification for new orders
          if (isAndroid && hasNotificationPermission) {
            const order = payload.new;
            const title = 'New Order Received!';
            const message = `Order #${order.order_number || order.id} from ${order.customer_name || 'Customer'} - €${order.total_amount}`;
            
            console.log('📱 Sending background notification:', { title, message });
            sendNotification(title, message, "alert");
          }
          
          callbacksRef.current.onNewOrder?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔄 Order updated via Supabase realtime:', payload.new);
          
          // Send background notification for important status updates
          if (isAndroid && hasNotificationPermission && payload.new.status) {
            const order = payload.new;
            const statusMap: Record<string, string> = {
              'accepted': 'Order Accepted',
              'preparing': 'Order Being Prepared',
              'ready': 'Order Ready',
              'delivered': 'Order Delivered',
              'cancelled': 'Order Cancelled'
            };
            
            const title = statusMap[order.status] || 'Order Updated';
            const message = `Order #${order.order_number || order.id} - ${title}`;
            
            console.log('📱 Sending status update notification:', { title, message });
            sendNotification(title, message, "alert");
          }
          
          callbacksRef.current.onOrderUpdate?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🗑️ Order deleted via Supabase realtime:', payload.old);
          callbacksRef.current.onOrderDelete?.(payload.old.id);
        }
      )
      .subscribe((status) => {
        console.log('📡 Supabase realtime status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Supabase realtime connected and ready for background notifications');
          setIsConnected(true);
        } else if (status === 'CLOSED') {
          console.log('❌ Supabase realtime disconnected, attempting to reconnect...');
          setIsConnected(false);
          
          // Try to reconnect after a delay if we're in background mode
          if (backgroundMode && isAndroid) {
            setTimeout(() => {
              console.log('🔄 Attempting to reconnect realtime in background...');
              enableBackgroundMode();
              keepAppActive();
            }, 3000);
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Supabase realtime channel error');
          setIsConnected(false);
        }
      });

    subscriptionRef.current = ordersSubscription;

    return () => {
      console.log('🔌 Cleaning up Supabase realtime subscriptions');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user, isAndroid, hasNotificationPermission, sendNotification, backgroundMode, enableBackgroundMode, keepAppActive]); // Only depend on user and Android context

  // Function to send a test notification (for development)
  const sendTestNotification = async () => {
    if (!user) return;
    
    try {
      const testOrder = {
        customer_name: 'Test Customer',
        customer_email: 'test@example.com',
        customer_phone: '+358123456789',
        order_type: 'delivery',
        status: 'pending',
        subtotal: '15.00',
        delivery_fee: '3.50',
        total_amount: '18.50',
        delivery_address: 'Test Address 123, Helsinki',
        special_instructions: 'This is a test order for Supabase realtime',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([testOrder])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create test order:', error);
        throw error;
      }

      console.log('✅ Test order created:', data);
      return data;
    } catch (error) {
      console.error('❌ Test notification error:', error);
      throw error;
    }
  };

  return {
    isConnected,
    sendTestNotification,
    // Background sync functions
    enableBackgroundMode: () => {
      if (isAndroid) {
        enableBackgroundMode();
        keepAppActive();
        enableRealtimeBackground();
      }
    },
  };
}



