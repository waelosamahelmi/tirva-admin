import { useState, useEffect } from "react";
import { usePromotions, useCreatePromotion, useUpdatePromotion, useDeletePromotion, useTogglePromotionStatus } from "@/hooks/use-promotions";
import { useSupabaseCategories, useSupabaseBranches } from "@/hooks/use-supabase-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { Plus, Edit, Trash2, Save, X, Tag, Store, Calendar, Percent, DollarSign } from "lucide-react";

interface PromotionsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PromotionsManagementModal({ isOpen, onClose }: PromotionsManagementModalProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { data: promotions, refetch } = usePromotions();
  const { data: categories } = useSupabaseCategories();
  const { data: branches } = useSupabaseBranches();
  const createPromotion = useCreatePromotion();
  const updatePromotion = useUpdatePromotion();
  const deletePromotion = useDeletePromotion();
  const toggleStatus = useTogglePromotionStatus();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    description: "",
    descriptionEn: "",
    discountType: "percentage",
    discountValue: "",
    categoryId: null as number | null,
    branchId: null as number | null,
    startDate: "",
    endDate: "",
    isActive: true,
    minOrderAmount: "0",
    maxDiscountAmount: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      description: "",
      descriptionEn: "",
      discountType: "percentage",
      discountValue: "",
      categoryId: null,
      branchId: null,
      startDate: "",
      endDate: "",
      isActive: true,
      minOrderAmount: "0",
      maxDiscountAmount: "",
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (promotion: any) => {
    setFormData({
      name: promotion.name,
      nameEn: promotion.nameEn,
      description: promotion.description || "",
      descriptionEn: promotion.descriptionEn || "",
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      categoryId: promotion.categoryId,
      branchId: promotion.branchId,
      startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().slice(0, 16) : "",
      endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().slice(0, 16) : "",
      isActive: promotion.isActive,
      minOrderAmount: promotion.minOrderAmount || "0",
      maxDiscountAmount: promotion.maxDiscountAmount || "",
    });
    setEditingId(promotion.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.nameEn.trim() || !formData.discountValue) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytä pakolliset kentät", "Please fill required fields"),
        variant: "destructive",
      });
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Valitse alku- ja loppupäivä", "Please select start and end dates"),
        variant: "destructive",
      });
      return;
    }

    try {
      const data = {
        name: formData.name,
        name_en: formData.nameEn,
        description: formData.description || null,
        description_en: formData.descriptionEn || null,
        discount_type: formData.discountType,
        discount_value: parseFloat(formData.discountValue),
        category_id: formData.categoryId,
        branch_id: formData.branchId,
        start_date: new Date(formData.startDate).toISOString(),
        end_date: new Date(formData.endDate).toISOString(),
        is_active: formData.isActive,
        min_order_amount: parseFloat(formData.minOrderAmount) || 0,
        max_discount_amount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
      };

      if (editingId) {
        await updatePromotion.mutateAsync({ id: editingId, data });
        toast({
          title: t("Onnistui", "Success"),
          description: t("Tarjous päivitetty", "Promotion updated"),
        });
      } else {
        await createPromotion.mutateAsync(data);
        toast({
          title: t("Onnistui", "Success"),
          description: t("Tarjous luotu", "Promotion created"),
        });
      }
      resetForm();
      refetch();
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Toiminto epäonnistui", "Operation failed"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("Haluatko varmasti poistaa tämän tarjouksen?", "Are you sure you want to delete this promotion?"))) {
      return;
    }

    try {
      await deletePromotion.mutateAsync(id);
      toast({
        title: t("Onnistui", "Success"),
        description: t("Tarjous poistettu", "Promotion deleted"),
      });
      refetch();
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Poisto epäonnistui", "Deletion failed"),
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await toggleStatus.mutateAsync({ id, isActive: !currentStatus });
      toast({
        title: t("Onnistui", "Success"),
        description: t("Tarjouksen tila päivitetty", "Promotion status updated"),
      });
      refetch();
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Päivitys epäonnistui", "Update failed"),
        variant: "destructive",
      });
    }
  };

  const isPromotionActive = (promotion: any) => {
    if (!promotion.isActive) return false;
    const now = new Date();
    const start = new Date(promotion.startDate);
    const end = new Date(promotion.endDate);
    return now >= start && now <= end;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Tag className="w-6 h-6" />
            {t("Hallitse tarjouksia", "Manage Promotions")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("Nimi (Suomi)", "Name (Finnish)")} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t("Esim. Kesätarjous", "e.g. Summer Sale")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">{t("Nimi (Englanti)", "Name (English)")} *</Label>
                    <Input
                      id="nameEn"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="e.g. Summer Sale"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("Kuvaus (Suomi)", "Description (Finnish)")}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionEn">{t("Kuvaus (Englanti)", "Description (English)")}</Label>
                    <Textarea
                      id="descriptionEn"
                      value={formData.descriptionEn}
                      onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">{t("Alennustyyppi", "Discount Type")} *</Label>
                    <Select
                      value={formData.discountType}
                      onValueChange={(value) => setFormData({ ...formData, discountType: value })}
                    >
                      <SelectTrigger id="discountType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4" />
                            {t("Prosentti", "Percentage")}
                          </div>
                        </SelectItem>
                        <SelectItem value="fixed">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            {t("Kiinteä summa", "Fixed Amount")}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      {formData.discountType === "percentage" 
                        ? t("Alennus (%)", "Discount (%)")
                        : t("Alennus (€)", "Discount (€)")
                      } *
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      step="0.01"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    />
                  </div>
                  {formData.discountType === "percentage" && (
                    <div className="space-y-2">
                      <Label htmlFor="maxDiscountAmount">{t("Maks. alennus (€)", "Max Discount (€)")}</Label>
                      <Input
                        id="maxDiscountAmount"
                        type="number"
                        step="0.01"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">{t("Kategoria", "Category")}</Label>
                    <Select
                      value={formData.categoryId?.toString() || "all"}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value === "all" ? null : parseInt(value) })}
                    >
                      <SelectTrigger id="categoryId">
                        <SelectValue placeholder={t("Kaikki kategoriat", "All categories")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("Kaikki kategoriat", "All categories")}</SelectItem>
                        {categories?.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {language === "fi" ? category.name : category.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchId">{t("Toimipiste", "Branch")}</Label>
                    <Select
                      value={formData.branchId?.toString() || "all"}
                      onValueChange={(value) => setFormData({ ...formData, branchId: value === "all" ? null : parseInt(value) })}
                    >
                      <SelectTrigger id="branchId">
                        <SelectValue placeholder={t("Kaikki toimipisteet", "All branches")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("Kaikki toimipisteet", "All branches")}</SelectItem>
                        {branches?.map((branch: any) => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>
                            {language === "fi" ? branch.name : branch.nameEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">{t("Alkupäivä", "Start Date")} *</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t("Loppupäivä", "End Date")} *</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minOrderAmount">{t("Min. tilausmäärä (€)", "Min. Order (€)")}</Label>
                    <Input
                      id="minOrderAmount"
                      type="number"
                      step="0.01"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">{t("Aktiivinen", "Active")}</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    {t("Tallenna", "Save")}
                  </Button>
                  <Button onClick={resetForm} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    {t("Peruuta", "Cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add New Button */}
          {!isAdding && !editingId && (
            <Button onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {t("Lisää uusi tarjous", "Add New Promotion")}
            </Button>
          )}

          {/* Promotions List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">{t("Tarjoukset", "Promotions")}</h3>
            {promotions && promotions.length > 0 ? (
              promotions.map((promotion: any) => (
                <Card key={promotion.id} className={!isPromotionActive(promotion) ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-lg">{promotion.name}</h4>
                          {isPromotionActive(promotion) && (
                            <Badge className="bg-green-500">{t("Aktiivinen", "Active")}</Badge>
                          )}
                          {!promotion.isActive && (
                            <Badge variant="secondary">{t("Pois päältä", "Disabled")}</Badge>
                          )}
                          <Badge variant="outline">
                            {promotion.discountType === "percentage" 
                              ? `${promotion.discountValue}%`
                              : `${promotion.discountValue}€`
                            }
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                          </div>
                          {promotion.categories && (
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4" />
                              {language === "fi" ? promotion.categories.name : promotion.categories.nameEn}
                            </div>
                          )}
                          {!promotion.categoryId && <div className="text-xs">{t("Kaikki kategoriat", "All categories")}</div>}
                          {promotion.branches && (
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4" />
                              {language === "fi" ? promotion.branches.name : promotion.branches.nameEn}
                            </div>
                          )}
                          {!promotion.branchId && <div className="text-xs">{t("Kaikki toimipisteet", "All branches")}</div>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(promotion.id, promotion.isActive)}
                        >
                          {promotion.isActive ? t("Poista", "Disable") : t("Aktivoi", "Enable")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(promotion)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(promotion.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {t("Ei tarjouksia", "No promotions yet")}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



