import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseToppings, useSupabaseCreateTopping, useSupabaseUpdateTopping, useSupabaseDeleteTopping } from "@/hooks/use-supabase-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComprehensiveToppingsDisplay } from "./comprehensive-toppings-display";

interface ToppingsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ToppingsManagementModal({ isOpen, onClose }: ToppingsManagementModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showCreateTopping, setShowCreateTopping] = useState(false);
  const [editingTopping, setEditingTopping] = useState<any>(null);

  const { data: toppings, isLoading } = useSupabaseToppings();
  const createToppingMutation = useSupabaseCreateTopping();
  const updateToppingMutation = useSupabaseUpdateTopping();
  const deleteToppingMutation = useSupabaseDeleteTopping({
    onSuccess: () => {
      toast({
        title: t("Onnistui", "Success"),
        description: t("Täyte poistettu", "Topping deleted"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytteen poistaminen epäonnistui", "Failed to delete topping"),
        variant: "destructive",
      });
    },
  });

  // Topping Form Component
  const ToppingForm = ({ topping, onSave, onCancel }: any) => {
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
      name: topping?.name || "",
      nameEn: topping?.nameEn || "",
      price: topping?.price || "0.00",
      category: topping?.category || "pizza",
      isActive: topping?.isActive ?? true,
      isRequired: topping?.isRequired ?? false,
      displayOrder: topping?.displayOrder || 1,
    });

    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t("Nimi (suomi)", "Name (Finnish)")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder={t("Esim. Tomaatti", "e.g. Tomato")}
              />
            </div>
            <div>
              <Label>{t("Nimi (englanti)", "Name (English)")}</Label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({...formData, nameEn: e.target.value})}
                placeholder={t("Esim. Tomato", "e.g. Tomato")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t("Hinta (€)", "Price (€)")}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>{t("Kategoria", "Category")}</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pizza">Pizza</SelectItem>
                  <SelectItem value="kebab">Kebab</SelectItem>
                  <SelectItem value="chicken">Chicken</SelectItem>
                  <SelectItem value="hotwings">Hot Wings</SelectItem>
                  <SelectItem value="burger">Burger</SelectItem>
                  <SelectItem value="drinks">Drinks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("Järjestys", "Display Order")}</Label>
              <Input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
              />
              <Label>{t("Aktiivinen", "Active")}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isRequired}
                onCheckedChange={(checked) => setFormData({...formData, isRequired: checked})}
              />
              <Label>{t("Pakollinen", "Required")}</Label>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={() => onSave(formData)}>
              {t("Tallenna", "Save")}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              {t("Peruuta", "Cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("Täytteiden hallinta", "Toppings Management")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <ComprehensiveToppingsDisplay
            onEdit={(topping) => setEditingTopping(topping)}
            onDelete={(id) => deleteToppingMutation.mutate(id)}
            onCreate={() => setShowCreateTopping(true)}
          />

          {showCreateTopping && (
            <ToppingForm 
              onSave={(data: any) => createToppingMutation.mutate(data)}
              onCancel={() => setShowCreateTopping(false)}
            />
          )}

          {editingTopping && (
            <ToppingForm 
              topping={editingTopping}
              onSave={(data: any) => updateToppingMutation.mutate({ id: editingTopping.id, data })}
              onCancel={() => setEditingTopping(null)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


