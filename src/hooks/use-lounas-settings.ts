import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LounasSettings {
  id: number;
  branch_id: number;
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  serves_sunday: boolean;
  serves_monday: boolean;
  serves_tuesday: boolean;
  serves_wednesday: boolean;
  serves_thursday: boolean;
  serves_friday: boolean;
  serves_saturday: boolean;
  info_text: string | null;
  info_text_en: string | null;
  info_text_ar: string | null;
  info_text_ru: string | null;
  info_text_sv: string | null;
  price_text: string | null;
  price_text_en: string | null;
  price_text_ar: string | null;
  price_text_ru: string | null;
  price_text_sv: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useLounasSettings(branchId?: number) {
  return useQuery({
    queryKey: ["lounas-settings", branchId],
    queryFn: async () => {
      let query = supabase
        .from("lounas_settings")
        .select("*");

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query.order("branch_id");

      if (error) throw error;
      return branchId ? (data?.[0] as LounasSettings | null) : (data as LounasSettings[]);
    },
    enabled: branchId !== undefined,
  });
}

export function useUpdateLounasSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<LounasSettings> & { branch_id: number }) => {
      const { data, error } = await supabase
        .from("lounas_settings")
        .upsert(settings, {
          onConflict: "branch_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data as LounasSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lounas-settings"] });
      queryClient.invalidateQueries({ queryKey: ["lounas-settings", data.branch_id] });
    },
  });
}

// Helper function to format time for display (HH:MM from HH:MM:SS)
export function formatTime(time: string): string {
  return time.substring(0, 5);
}

// Helper function to format time for database (HH:MM:SS from HH:MM)
export function formatTimeForDB(time: string): string {
  return `${time}:00`;
}



