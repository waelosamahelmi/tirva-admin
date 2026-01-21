import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Category, MenuItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
}

export function useMenuItems(categoryId?: number) {
  return useQuery<MenuItem[]>({
    queryKey: categoryId ? ["/api/menu-items", categoryId] : ["/api/menu-items"],
    queryFn: async () => {
      const url = categoryId ? `/api/menu-items?categoryId=${categoryId}` : "/api/menu-items";
      console.log('🍽️ Fetching menu items from:', url);
      
      const response = await apiRequest("GET", url);
      const data = await response.json();
      
      console.log('✅ Menu items fetched successfully:', data);
      return data;
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItem> }) => {
      const response = await apiRequest("PATCH", `/api/menu-items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MenuItem, 'id'>) => {
      const response = await apiRequest("POST", "/api/menu-items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    },
  });
}



