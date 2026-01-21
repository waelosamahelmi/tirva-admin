import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";
import { useToast } from "@/hooks/use-toast";

export type PrinterMode = 'direct' | 'network' | 'cloudprnt';

export interface PrinterSettings {
  id: number;
  user_id: string;
  branch_id: number | null;
  printer_mode: PrinterMode;
  active_printer_id?: string;
  active_printer_mac?: string;
  active_printer_type?: 'star' | 'escpos';
  created_at: string;
  updated_at: string;
}

// Get printer settings for current user and branch
export function usePrinterSettings() {
  const { user, userBranch } = useSupabaseAuth();

  return useQuery<PrinterSettings | null>({
    queryKey: ["printer-settings", user?.id, userBranch],
    queryFn: async () => {
      if (!user) return null;

      console.log('🖨️ Fetching printer settings for user:', user.id, 'branch:', userBranch);

      let query = supabase
        .from('printer_settings')
        .select('*')
        .eq('user_id', user.id);

      // Handle NULL branch_id properly
      if (userBranch) {
        query = query.eq('branch_id', userBranch);
      } else {
        query = query.is('branch_id', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('❌ Failed to fetch printer settings:', error);
        throw error;
      }

      console.log('✅ Printer settings fetched:', data);
      return data;
    },
    enabled: !!user,
  });
}

// Update or create printer settings
export function useUpdatePrinterSettings() {
  const { user, userBranch } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: Partial<PrinterSettings>) => {
      if (!user) throw new Error('User not authenticated');

      console.log('💾 Saving printer settings:', settings);

      // First, try to fetch existing settings
      let query = supabase
        .from('printer_settings')
        .select('*')
        .eq('user_id', user.id);

      // Handle NULL branch_id properly
      if (userBranch) {
        query = query.eq('branch_id', userBranch);
      } else {
        query = query.is('branch_id', null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        // Update existing settings
        const { data, error } = await supabase
          .from('printer_settings')
          .update(settings)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to update printer settings:', error);
          throw error;
        }

        console.log('✅ Printer settings updated:', data);
        return data;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('printer_settings')
          .insert({
            user_id: user.id,
            branch_id: userBranch || null,
            ...settings,
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to create printer settings:', error);
          throw error;
        }

        console.log('✅ Printer settings created:', data);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printer-settings"] });
      toast({
        title: "Settings Saved",
        description: "Printer settings have been saved successfully",
      });
    },
    onError: (error) => {
      console.error('❌ Failed to save printer settings:', error);
      toast({
        title: "Failed to Save Settings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });
}



