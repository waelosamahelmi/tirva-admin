import { useState, useEffect } from "react";
import { useSupabaseCategories, useSupabaseCreateCategory, useSupabaseUpdateCategory, useSupabaseDeleteCategory } from "@/hooks/use-supabase-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { Plus, Edit, Trash2, Save, X, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { CategoryToppingGroupAssignment } from "./category-topping-group-assignment";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryManagementModal({ isOpen, onClose }: CategoryManagementModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: categories, refetch } = useSupabaseCategories();
  const createCategory = useSupabaseCreateCategory();
  const updateCategory = useSupabaseUpdateCategory();
  const deleteCategory = useSupabaseDeleteCategory();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    displayOrder: 0,
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      displayOrder: 0,
      isActive: true,
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (category: any) => {
    setFormData({
      name: category.name,
      nameEn: category.nameEn,
      displayOrder: category.displayOrder || 0,
      isActive: category.isActive !== undefined ? category.isActive : true,
    });
    setEditingId(category.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.nameEn.trim()) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytä molemmat nimet", "Please fill both names"),
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingId) {
        await updateCategory.mutateAsync({
          id: editingId,
          data: formData,
        });
        toast({
          title: t("Onnistui", "Success"),
          description: t("Kategoria päivitetty", "Category updated"),
        });
      } else {
        await createCategory.mutateAsync(formData);
        toast({
          title: t("Onnistui", "Success"),
          description: t("Kategoria luotu", "Category created"),
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
    if (!confirm(t("Haluatko varmasti poistaa tämän kategorian?", "Are you sure you want to delete this category?"))) {
      return;
    }

    try {
      await deleteCategory.mutateAsync(id);
      toast({
        title: t("Onnistui", "Success"),
        description: t("Kategoria poistettu", "Category deleted"),
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {t("Hallitse kategorioita", "Manage Categories")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {t("Nimi (Suomi)", "Name (Finnish)")} *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t("Esim. Pizzat", "e.g. Pizzas")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">
                      {t("Nimi (Englanti)", "Name (English)")} *
                    </Label>
                    <Input
                      id="nameEn"
                      value={formData.nameEn}
                      onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                      placeholder="e.g. Pizzas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayOrder">
                      {t("Järjestys", "Display Order")}
                    </Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">
                      {t("Aktiivinen", "Active")}
                    </Label>
                  </div>
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
              {t("Lisää uusi kategoria", "Add New Category")}
            </Button>
          )}

          {/* Categories List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              {t("Nykyiset kategoriat", "Current Categories")}
            </h3>
            {categories && categories.length > 0 ? (
              categories.map((category: any) => (
                <Card key={category.id} className={!category.isActive ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-semibold">
                            {category.name} / {category.nameEn}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("Järjestys", "Order")}: {category.displayOrder || 0}
                            {!category.isActive && ` • ${t("Ei aktiivinen", "Inactive")}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedCategoryId(expandedCategoryId === category.id ? null : category.id)}
                        >
                          {expandedCategoryId === category.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Topping Group Assignment - shown when expanded */}
                    {expandedCategoryId === category.id && (
                      <CategoryToppingGroupAssignment
                        categoryId={category.id}
                        categoryName={category.name}
                      />
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {t("Ei kategorioita", "No categories yet")}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



