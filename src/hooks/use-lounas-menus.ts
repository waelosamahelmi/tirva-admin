import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface LounasMenu {
  id: number;
  branch_id: number;
  week_number: number;
  year: number;
  day_of_week: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  name_ru?: string;
  name_sv?: string;
  description?: string;
  description_en?: string;
  description_ar?: string;
  description_ru?: string;
  description_sv?: string;
  price: string;
  is_lactose_free: boolean;
  is_gluten_free: boolean;
  is_vegan: boolean;
  is_milk_free: boolean;
  is_hot: boolean;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LounasMenuInput {
  branch_id: number;
  week_number: number;
  year: number;
  day_of_week: number;
  name: string;
  name_en?: string;
  name_ar?: string;
  name_ru?: string;
  name_sv?: string;
  description?: string;
  description_en?: string;
  description_ar?: string;
  description_ru?: string;
  description_sv?: string;
  price: string;
  is_lactose_free?: boolean;
  is_gluten_free?: boolean;
  is_vegan?: boolean;
  is_milk_free?: boolean;
  is_hot?: boolean;
  image_url?: string;
  display_order?: number;
  is_active?: boolean;
}

// Get current ISO week number
export function getCurrentWeek(): { week: number; year: number } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return { week, year: now.getFullYear() };
}

export function useLounasMenus(branchId?: number, weekNumber?: number, year?: number) {
  return useQuery({
    queryKey: ["lounas-menus", branchId, weekNumber, year],
    queryFn: async () => {
      let query = supabase
        .from("lounas_menus")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("display_order", { ascending: true });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }
      if (weekNumber !== undefined) {
        query = query.eq("week_number", weekNumber);
      }
      if (year !== undefined) {
        query = query.eq("year", year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LounasMenu[];
    },
  });
}

export function useCreateLounasMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (menu: LounasMenuInput) => {
      const { data, error } = await supabase
        .from("lounas_menus")
        .insert(menu)
        .select()
        .single();

      if (error) throw error;
      return data as LounasMenu;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lounas-menus"] });
    },
  });
}

export function useUpdateLounasMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<LounasMenuInput> }) => {
      const { data: result, error } = await supabase
        .from("lounas_menus")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as LounasMenu;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lounas-menus"] });
    },
  });
}

export function useDeleteLounasMenu() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("lounas_menus")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lounas-menus"] });
    },
  });
}



