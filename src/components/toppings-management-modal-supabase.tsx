import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseToppings, useSupabaseCreateTopping, useSupabaseUpdateTopping, useSupabaseDeleteTopping, useSupabaseCategories } from "@/hooks/use-supabase-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Topping } from "../../shared/schema";

interface ToppingsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToppingFormData {
  name: string;
  nameEn: string;
  nameAr?: string;
  price: string;
  category: string;
  type: string;
  isActive: boolean;
  isRequired: boolean;
  displayOrder: number;
}

interface ToppingsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToppingsManagementModal({ isOpen, onClose }: ToppingsManagementModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingTopping, setEditingTopping] = useState<Topping | null>(null);
  const [formData, setFormData] = useState<ToppingFormData>({
    name: "",
    nameEn: "",
    nameAr: "",
    price: "0.00",
    category: "pizza",
    type: "topping",
    isActive: true,
    isRequired: false,
    displayOrder: 0,
  });

  const { data: toppings, isLoading } = useSupabaseToppings();
  const { data: categories } = useSupabaseCategories();
  const createToppingMutation = useSupabaseCreateTopping();
  const updateToppingMutation = useSupabaseUpdateTopping();
  const deleteToppingMutation = useSupabaseDeleteTopping();

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      nameAr: "",
      price: "0.00",
      category: "pizza",
      type: "topping",
      isActive: true,
      isRequired: false,
      displayOrder: 0,
    });
  };
  const handleEditTopping = (topping: Topping) => {
    setEditingTopping(topping);
    setFormData({
      name: topping.name,
      nameEn: topping.nameEn,
      nameAr: topping.nameAr || "",
      price: topping.price.toString(),
      category: topping.category,
      type: topping.type,
      isActive: topping.isActive ?? true,
      isRequired: topping.isRequired ?? false,
      displayOrder: topping.displayOrder ?? 0,
    });
    setShowFormDialog(true);
  };

  const handleCreateNew = () => {
    setEditingTopping(null);
    resetForm();
    setShowFormDialog(true);
  };

  const closeFormDialog = () => {
    setShowFormDialog(false);
    setEditingTopping(null);
    resetForm();
  };

  const handleCreateTopping = async () => {
    try {
      await createToppingMutation.mutateAsync({
        ...formData,
        price: parseFloat(formData.price),
      });
      closeFormDialog();
      toast({
        title: t("Onnistui", "Success"),
        description: t("Täyte luotu", "Topping created"),
      });
    } catch (error) {
      console.error('Failed to create topping:', error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytteen luominen epäonnistui", "Failed to create topping"),
        variant: "destructive",
      });
    }
  };

  const handleUpdateTopping = async () => {
    if (!editingTopping) return;

    try {
      await updateToppingMutation.mutateAsync({
        id: editingTopping.id,
        data: {
          ...formData,
          price: parseFloat(formData.price),
        }
      });
      closeFormDialog();
      toast({
        title: t("Onnistui", "Success"),
        description: t("Täyte päivitetty", "Topping updated"),
      });
    } catch (error) {
      console.error('Failed to update topping:', error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytteen päivittäminen epäonnistui", "Failed to update topping"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopping = async (id: number) => {
    try {
      await deleteToppingMutation.mutateAsync(id);
      toast({
        title: t("Onnistui", "Success"),
        description: t("Täyte poistettu", "Topping deleted"),
      });
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytteen poistaminen epäonnistui", "Failed to delete topping"),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("Täytteiden hallinta", "Toppings Management", "إدارة الإضافات")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">
              {t("Kaikki täytteet", "All Toppings", "جميع الإضافات")}
            </h3>
            <Button onClick={handleCreateNew}>
              {t("Luo uusi täyte", "Create New Topping", "إنشاء إضافة جديدة")}
            </Button>
          </div>          {/* Toppings List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">
                {t("Ladataan täytteitä...", "Loading toppings...", "جاري تحميل الإضافات...")}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {toppings?.map((topping: Topping) => (
                <Card key={topping.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-lg">{topping.name}</h4>
                      <p className="text-sm text-gray-600">{topping.nameEn}</p>
                      {topping.nameAr && (
                        <p className="text-sm text-gray-600">{topping.nameAr}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Badge variant={topping.isActive ? "default" : "secondary"}>
                          {topping.isActive ? t("Aktiivinen", "Active") : t("Ei aktiivinen", "Inactive")}
                        </Badge>
                        <Badge variant="outline">{topping.category}</Badge>
                        <Badge variant="outline">{topping.type}</Badge>
                        <Badge variant="outline">€{topping.price}</Badge>
                        {topping.isRequired && (
                          <Badge variant="destructive">{t("Pakollinen", "Required")}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTopping(topping)}
                      >
                        {t("Muokkaa", "Edit")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTopping(topping.id)}
                      >
                        {t("Poista", "Delete")}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

        </div>
      </DialogContent>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={closeFormDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTopping
                ? t("Muokkaa täytettä", "Edit Topping")
                : t("Luo uusi täyte", "Create New Topping")
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t("Nimi (FI)", "Name (FI)")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("Esim. Pepperoni", "e.g. Pepperoni")}
                />
              </div>

              <div>
                <Label htmlFor="nameEn">{t("Nimi (EN)", "Name (EN)")}</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="e.g. Pepperoni"
                />
              </div>

              <div>
                <Label htmlFor="nameAr">{t("Nimi (AR)", "Name (AR)")}</Label>
                <Input
                  id="nameAr"
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  placeholder="مثال: بيبروني"
                />
              </div>

              <div>
                <Label htmlFor="price">{t("Hinta", "Price")}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="category">{t("Kategoria", "Category")}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.name.toLowerCase()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type">{t("Tyyppi", "Type")}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topping">Topping</SelectItem>
                    <SelectItem value="sauce">Sauce</SelectItem>
                    <SelectItem value="extra">Extra</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                    <SelectItem value="spice">Spice</SelectItem>
                    <SelectItem value="drink">Drink</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="displayOrder">{t("Järjestys", "Display Order")}</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{t("Aktiivinen", "Active")}</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isRequired"
                  checked={formData.isRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                />
                <Label htmlFor="isRequired">{t("Pakollinen", "Required")}</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={editingTopping ? handleUpdateTopping : handleCreateTopping}
                disabled={!formData.name || !formData.nameEn}
              >
                {editingTopping ? t("Päivitä", "Update") : t("Luo", "Create")}
              </Button>
              <Button variant="outline" onClick={closeFormDialog}>
                {t("Peruuta", "Cancel")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}



