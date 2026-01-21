import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, handleSupabaseError, formatSupabaseResponse } from "@/lib/supabase-client";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";

// Get restaurant settings
export function useRestaurantSettings() {
  const { user } = useSupabaseAuth();
  
  return useQuery({
    queryKey: ["restaurant-settings"],
    queryFn: async () => {
      console.log('⚙️ Fetching restaurant settings from Supabase...');
      
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .single();

      if (error) {
        console.error('❌ Failed to fetch restaurant settings:', error);
        // Return default settings if none exist
        if (error.code === 'PGRST116') { // No rows returned
          return {
            isOpen: true,
            openingHours: "10:00-22:00",
            pickupHours: "10:00-10:29",
            deliveryHours: "11:00-21:00",
            lunchBuffetHours: "11:00-15:00",
            specialMessage: "",
            defaultPrinterId: null,
            printerAutoReconnect: true,
            printerTabSticky: true
          };
        }
        handleSupabaseError(error);
      }

      console.log('✅ Restaurant settings fetched successfully');
      const formatted = formatSupabaseResponse(data) || {};
      
      // Parse payment_methods if it's a string
      if (formatted.paymentMethods && typeof formatted.paymentMethods === 'string') {
        try {
          formatted.paymentMethods = JSON.parse(formatted.paymentMethods);
        } catch (e) {
          console.error('Failed to parse payment methods:', e);
        }
      }
      
      return formatted;
    },
    enabled: !!user,
  });
}

// Update restaurant settings
export function useUpdateRestaurantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: any) => {
      console.log('⚙️ Updating restaurant settings in Supabase:', settingsData);
      
      // Convert camelCase to snake_case for database
      const dbData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (settingsData.isOpen !== undefined) dbData.is_open = settingsData.isOpen;
      if (settingsData.openingHours !== undefined) dbData.opening_hours = settingsData.openingHours;
      if (settingsData.pickupHours !== undefined) dbData.pickup_hours = settingsData.pickupHours;
      if (settingsData.deliveryHours !== undefined) dbData.delivery_hours = settingsData.deliveryHours;
      if (settingsData.lunchBuffetHours !== undefined) dbData.lunch_buffet_hours = settingsData.lunchBuffetHours;
      if (settingsData.specialMessage !== undefined) dbData.special_message = settingsData.specialMessage;
      if (settingsData.defaultPrinterId !== undefined) dbData.default_printer_id = settingsData.defaultPrinterId;
      if (settingsData.printerAutoReconnect !== undefined) dbData.printer_auto_reconnect = settingsData.printerAutoReconnect;
      if (settingsData.printerTabSticky !== undefined) dbData.printer_tab_sticky = settingsData.printerTabSticky;
      if (settingsData.paymentMethods !== undefined) dbData.payment_methods = settingsData.paymentMethods;
      if (settingsData.stripeEnabled !== undefined) dbData.stripe_enabled = settingsData.stripeEnabled;
      if (settingsData.stripePublishableKey !== undefined) dbData.stripe_publishable_key = settingsData.stripePublishableKey;
      if (settingsData.stripeSecretKey !== undefined) dbData.stripe_secret_key = settingsData.stripeSecretKey;
      if (settingsData.stripeWebhookSecret !== undefined) dbData.stripe_webhook_secret = settingsData.stripeWebhookSecret;
      if (settingsData.stripeTestMode !== undefined) dbData.stripe_test_mode = settingsData.stripeTestMode;
      if (settingsData.stripeConnectAccountId !== undefined) dbData.stripe_connect_account_id = settingsData.stripeConnectAccountId;
      if (settingsData.stripeAccountEmail !== undefined) dbData.stripe_account_email = settingsData.stripeAccountEmail;
      if (settingsData.stripeAccountCountry !== undefined) dbData.stripe_account_country = settingsData.stripeAccountCountry;
      if (settingsData.stripePaymentMethodsConfig !== undefined) dbData.stripe_payment_methods_config = settingsData.stripePaymentMethodsConfig;
      if (settingsData.onlinePaymentServiceFee !== undefined) dbData.online_payment_service_fee = settingsData.onlinePaymentServiceFee;
      if (settingsData.onlinePaymentServiceFeeType !== undefined) dbData.online_payment_service_fee_type = settingsData.onlinePaymentServiceFeeType;
      
      // Try to update first, if no rows exist, insert
      const { data: existingData } = await supabase
        .from('restaurant_settings')
        .select('id')
        .single();

      let result;
      if (existingData) {
        // Update existing settings
        const { data, error } = await supabase
          .from('restaurant_settings')
          .update(dbData)
          .eq('id', existingData.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Failed to update restaurant settings:', error);
          handleSupabaseError(error);
        }
        
        result = data;
      } else {
        // Insert new settings with defaults
        const { data, error } = await supabase
          .from('restaurant_settings')
          .insert([{
            is_open: true,
            opening_hours: "10:00-22:00",
            pickup_hours: "10:00-10:29",
            delivery_hours: "11:00-21:00",
            lunch_buffet_hours: "11:00-15:00",
            special_message: "",
            ...dbData
          }])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Failed to create restaurant settings:', error);
          handleSupabaseError(error);
        }
        
        result = data;
      }

      console.log('✅ Restaurant settings updated successfully');
      return formatSupabaseResponse(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-settings"] });
    },
  });
}

// Update just printer settings
export function useUpdatePrinterSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (printerSettings: {
      defaultPrinterId?: string | null;
      printerAutoReconnect?: boolean;
      printerTabSticky?: boolean;
    }) => {
      console.log('🖨️ Updating printer settings in Supabase:', printerSettings);
      
      // Get existing settings first
      const { data: existingData } = await supabase
        .from('restaurant_settings')
        .select('*')
        .single();

      let result;
      if (existingData) {
        // Update existing settings
        const { data, error } = await supabase
          .from('restaurant_settings')
          .update({
            default_printer_id: printerSettings.defaultPrinterId,
            printer_auto_reconnect: printerSettings.printerAutoReconnect,
            printer_tab_sticky: printerSettings.printerTabSticky,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingData.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Failed to update printer settings:', error);
          handleSupabaseError(error);
        }
        
        result = data;
      } else {
        // Insert new settings with defaults
        const { data, error } = await supabase
          .from('restaurant_settings')
          .insert([{
            is_open: true,
            opening_hours: "10:00-22:00",
            pickup_hours: "10:00-10:29",
            delivery_hours: "11:00-21:00",
            lunch_buffet_hours: "11:00-15:00",
            special_message: "",
            default_printer_id: printerSettings.defaultPrinterId,
            printer_auto_reconnect: printerSettings.printerAutoReconnect ?? true,
            printer_tab_sticky: printerSettings.printerTabSticky ?? true,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) {
          console.error('❌ Failed to create restaurant settings:', error);
          handleSupabaseError(error);
        }
        
        result = data;
      }

      console.log('✅ Printer settings updated successfully');
      return formatSupabaseResponse(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-settings"] });
    },
  });
}
