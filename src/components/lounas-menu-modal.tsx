import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import {
  LounasMenu,
  useCreateLounasMenu,
  useUpdateLounasMenu,
} from "@/hooks/use-lounas-menus";
import { Leaf, Wheat, Droplet, Milk, Flame } from "lucide-react";

interface LounasMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menu?: LounasMenu | null;
  branchId: number;
  weekNumber: number;
  year: number;
  dayOfWeek: number;
}

export function LounasMenuModal({
  isOpen,
  onClose,
  menu,
  branchId,
  weekNumber,
  year,
  dayOfWeek,
}: LounasMenuModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const createMenu = useCreateLounasMenu();
  const updateMenu = useUpdateLounasMenu();

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    name_ar: "",
    name_ru: "",
    name_sv: "",
    description: "",
    description_en: "",
    description_ar: "",
    description_ru: "",
    description_sv: "",
    price: "",
    is_lactose_free: false,
    is_gluten_free: false,
    is_vegan: false,
    is_milk_free: false,
    is_hot: true,
    image_url: "",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    if (menu) {
      setFormData({
        name: menu.name || "",
        name_en: menu.name_en || "",
        name_ar: menu.name_ar || "",
        name_ru: menu.name_ru || "",
        name_sv: menu.name_sv || "",
        description: menu.description || "",
        description_en: menu.description_en || "",
        description_ar: menu.description_ar || "",
        description_ru: menu.description_ru || "",
        description_sv: menu.description_sv || "",
        price: menu.price || "",
        is_lactose_free: menu.is_lactose_free,
        is_gluten_free: menu.is_gluten_free,
        is_vegan: menu.is_vegan,
        is_milk_free: menu.is_milk_free,
        is_hot: menu.is_hot,
        image_url: menu.image_url || "",
        display_order: menu.display_order,
        is_active: menu.is_active,
      });
    } else {
      setFormData({
        name: "",
        name_en: "",
        name_ar: "",
        name_ru: "",
        name_sv: "",
        description: "",
        description_en: "",
        description_ar: "",
        description_ru: "",
        description_sv: "",
        price: "",
        is_lactose_free: false,
        is_gluten_free: false,
        is_vegan: false,
        is_milk_free: false,
        is_hot: true,
        image_url: "",
        display_order: 0,
        is_active: true,
      });
    }
  }, [menu]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytä pakolliset kentät", "Please fill required fields"),
        variant: "destructive",
      });
      return;
    }

    try {
      const menuData = {
        branch_id: branchId,
        week_number: weekNumber,
        year: year,
        day_of_week: dayOfWeek,
        name: formData.name,
        name_en: formData.name_en || undefined,
        name_ar: formData.name_ar || undefined,
        name_ru: formData.name_ru || undefined,
        name_sv: formData.name_sv || undefined,
        description: formData.description || undefined,
        description_en: formData.description_en || undefined,
        description_ar: formData.description_ar || undefined,
        description_ru: formData.description_ru || undefined,
        description_sv: formData.description_sv || undefined,
        price: formData.price,
        is_lactose_free: formData.is_lactose_free,
        is_gluten_free: formData.is_gluten_free,
        is_vegan: formData.is_vegan,
        is_milk_free: formData.is_milk_free,
        is_hot: formData.is_hot,
        image_url: formData.image_url || undefined,
        display_order: formData.display_order,
        is_active: formData.is_active,
      };

      if (menu) {
        await updateMenu.mutateAsync({ id: menu.id, data: menuData });
        toast({
          title: t("Onnistui", "Success"),
          description: t("Lounas päivitetty", "Lunch item updated"),
        });
      } else {
        await createMenu.mutateAsync(menuData);
        toast({
          title: t("Onnistui", "Success"),
          description: t("Lounas luotu", "Lunch item created"),
        });
      }
      onClose();
    } catch (error) {
      console.error("Lounas save error:", error);
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Toiminto epäonnistui", "Operation failed"),
        variant: "destructive",
      });
    }
  };

  const dayNames = {
    fi: ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"],
    en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {menu
              ? t("Muokkaa lounasta", "Edit Lunch Item")
              : t("Lisää lounas", "Add Lunch Item")}{" "}
            - {t(dayNames.fi[dayOfWeek], dayNames.en[dayOfWeek])}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t("Nimi (FI)", "Name (FI)")} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t("Esim. Broileri-riisi", "E.g. Chicken and rice")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Nimi (EN)", "Name (EN)")}</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Nimi (AR)", "Name (AR)")}</Label>
              <Input
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Nimi (RU)", "Name (RU)")}</Label>
              <Input
                value={formData.name_ru}
                onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Nimi (SV)", "Name (SV)")}</Label>
              <Input
                value={formData.name_sv}
                onChange={(e) => setFormData({ ...formData, name_sv: e.target.value })}
              />
            </div>
          </div>

          {/* Description Fields */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>{t("Kuvaus (FI)", "Description (FI)")}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Kuvaus (EN)", "Description (EN)")}</Label>
              <Textarea
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label>
              {t("Hinta", "Price")}
            </Label>
            <Input
              type="text"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder={t("Esim. 22 euroa / henkilö", "E.g. 22 euros per person")}
            />
          </div>

          {/* Dietary Tags */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-semibold">
              {t("Ruokavaliotiedot", "Dietary Information")}
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Switch
                  checked={formData.is_vegan}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_vegan: checked })
                  }
                />
                <Leaf className="h-4 w-4 text-green-600" />
                <Label className="text-sm">{t("Vegaani", "Vegan")}</Label>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Switch
                  checked={formData.is_gluten_free}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_gluten_free: checked })
                  }
                />
                <Wheat className="h-4 w-4 text-amber-600" />
                <Label className="text-sm">{t("Gluteeniton", "Gluten-free")}</Label>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Switch
                  checked={formData.is_lactose_free}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_lactose_free: checked })
                  }
                />
                <Droplet className="h-4 w-4 text-blue-600" />
                <Label className="text-sm">{t("Laktoositon", "Lactose-free")}</Label>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Switch
                  checked={formData.is_milk_free}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_milk_free: checked })
                  }
                />
                <Milk className="h-4 w-4 text-purple-600" />
                <Label className="text-sm">{t("Maidoton", "Milk-free")}</Label>
              </div>

              <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <Switch
                  checked={formData.is_hot}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_hot: checked })
                  }
                />
                <Flame className="h-4 w-4 text-red-600" />
                <Label className="text-sm">{t("Tulinen", "Hot")}</Label>
              </div>
            </div>
          </div>

          {/* Other Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Kuvan URL", "Image URL")}</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Järjestys", "Display Order")}</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label>{t("Aktiivinen", "Active")}</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("Peruuta", "Cancel")}
            </Button>
            <Button onClick={handleSave}>
              {t("Tallenna", "Save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



