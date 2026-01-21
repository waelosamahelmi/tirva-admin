import { useState, useEffect } from "react";
import {
  useToppingGroups,
  useCreateToppingGroup,
  useUpdateToppingGroup,
  useDeleteToppingGroup,
} from "@/hooks/use-topping-groups";
import { 
  useSupabaseToppings,
  useSupabaseCreateTopping,
  useSupabaseUpdateTopping,
  useSupabaseDeleteTopping,
} from "@/hooks/use-supabase-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { Plus, Edit, Trash2, Save, X, ArrowLeft, CheckSquare, Circle, Pizza } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ToppingGroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewMode = 'groups-list' | 'group-detail' | 'toppings-list' | 'topping-detail';

export function ToppingGroupManagementModal({ isOpen, onClose }: ToppingGroupManagementModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: toppingGroups, refetch } = useToppingGroups();
  const { data: allToppings, refetch: refetchToppings } = useSupabaseToppings();
  const createGroup = useCreateToppingGroup();
  const updateGroup = useUpdateToppingGroup();
  const deleteGroup = useDeleteToppingGroup();
  const createTopping = useSupabaseCreateTopping();
  const updateTopping = useSupabaseUpdateTopping();
  const deleteTopping = useSupabaseDeleteTopping();

  const [viewMode, setViewMode] = useState<ViewMode>('groups-list');
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingToppingId, setEditingToppingId] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activeTab, setActiveTab] = useState<'groups' | 'toppings'>('groups');

  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    isRequired: false,
    maxSelections: 1,
    minSelections: 0,
    displayOrder: 0,
    selectionType: "checkbox" as "checkbox" | "radio",
  });

  const [toppingFormData, setToppingFormData] = useState({
    name: "",
    nameEn: "",
    price: "0.00",
    category: "pizza",
    isActive: true,
    displayOrder: 0,
  });

  const [selectedToppingIds, setSelectedToppingIds] = useState<number[]>([]);

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      isRequired: false,
      maxSelections: 1,
      minSelections: 0,
      displayOrder: 0,
      selectionType: "checkbox",
    });
    setToppingFormData({
      name: "",
      nameEn: "",
      price: "0.00",
      category: "pizza",
      isActive: true,
      displayOrder: 0,
    });
    setSelectedToppingIds([]);
    setEditingGroupId(null);
    setEditingToppingId(null);
    setIsCreatingNew(false);
    setViewMode(activeTab === 'groups' ? 'groups-list' : 'toppings-list');
  };

  const handleCreateNew = () => {
    resetForm();
    setIsCreatingNew(true);
    setViewMode('group-detail');
  };

  const handleEditGroup = (group: any) => {
    setFormData({
      name: group.name,
      nameEn: group.nameEn || group.name_en,
      isRequired: group.isRequired || group.is_required || false,
      maxSelections: group.maxSelections || group.max_selections || 1,
      minSelections: group.minSelections || group.min_selections || 0,
      displayOrder: group.displayOrder || group.display_order || 0,
      selectionType: (group.selectionType || group.selection_type || "checkbox") as "checkbox" | "radio",
    });

    const toppingIds = group.toppingGroupItems?.map((item: any) => item.toppingId || item.topping_id) || [];
    setSelectedToppingIds(toppingIds);

    setEditingGroupId(group.id);
    setIsCreatingNew(false);
    setViewMode('group-detail');
  };

  const handleBackToList = () => {
    setViewMode(activeTab === 'groups' ? 'groups-list' : 'toppings-list');
    resetForm();
  };

  // Topping management functions
  const handleCreateNewTopping = () => {
    resetForm();
    setIsCreatingNew(true);
    setViewMode('topping-detail');
  };

  const handleEditTopping = (topping: any) => {
    setToppingFormData({
      name: topping.name,
      nameEn: topping.nameEn || topping.name_en || "",
      price: topping.price?.toString() || "0.00",
      category: topping.category || "pizza",
      isActive: topping.isActive ?? topping.is_active ?? true,
      displayOrder: topping.displayOrder || topping.display_order || 0,
    });
    setEditingToppingId(topping.id);
    setIsCreatingNew(false);
    setViewMode('topping-detail');
  };

  const handleSaveTopping = async () => {
    if (!toppingFormData.name.trim()) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytä nimi", "Please fill in the name"),
        variant: "destructive",
      });
      return;
    }

    try {
      const toppingData = {
        name: toppingFormData.name,
        name_en: toppingFormData.nameEn,
        price: parseFloat(toppingFormData.price) || 0,
        category: toppingFormData.category,
        is_active: toppingFormData.isActive,
        display_order: toppingFormData.displayOrder,
      };

      if (editingToppingId) {
        await updateTopping.mutateAsync({ id: editingToppingId, data: toppingData });
        toast({
          title: t("Onnistui", "Success"),
          description: t("Täyte päivitetty", "Topping updated"),
        });
      } else {
        await createTopping.mutateAsync(toppingData);
        toast({
          title: t("Onnistui", "Success"),
          description: t("Täyte luotu", "Topping created"),
        });
      }

      refetchToppings();
      resetForm();
    } catch (error) {
      console.error('Save topping error:', error);
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Toiminto epäonnistui", "Operation failed"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteTopping = async (id: number) => {
    if (!confirm(t("Haluatko varmasti poistaa tämän täytteen?", "Are you sure you want to delete this topping?"))) {
      return;
    }

    try {
      await deleteTopping.mutateAsync(id);
      toast({
        title: t("Onnistui", "Success"),
        description: t("Täyte poistettu", "Topping deleted"),
      });
      refetchToppings();
      if (editingToppingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error('❌ Failed to delete topping:', error);
      
      // Show specific error message if topping is in use
      const errorMessage = error instanceof Error ? error.message : '';
      const isInUse = errorMessage.includes('used in existing orders') || 
                      errorMessage.includes('referenced in existing data');
      
      toast({
        title: t("Virhe", "Error"),
        description: isInUse 
          ? t(
              "Täytettä ei voi poistaa, koska sitä on käytetty tilauksissa. Voit merkitä sen ei-aktiiviseksi sen sijaan.",
              "Cannot delete topping because it's used in orders. You can mark it as inactive instead."
            )
          : t("Poisto epäonnistui", "Delete failed"),
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.nameEn.trim()) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytä kaikki pakolliset kentät", "Please fill all required fields"),
        variant: "destructive",
      });
      return;
    }

    try {
      const groupData = {
        name: formData.name,
        name_en: formData.nameEn,
        is_required: formData.isRequired,
        max_selections: formData.maxSelections,
        min_selections: formData.minSelections,
        display_order: formData.displayOrder,
        selection_type: formData.selectionType,
      };

      let groupId: number;

      if (editingGroupId) {
        // Update existing group
        const result = await updateGroup.mutateAsync({
          id: editingGroupId,
          data: groupData,
        });
        groupId = editingGroupId;

        toast({
          title: t("Onnistui", "Success"),
          description: t("Täydennysryhmä päivitetty", "Topping group updated"),
        });
      } else {
        // Create new group
        const result = await createGroup.mutateAsync(groupData);
        groupId = result.id;

        toast({
          title: t("Onnistui", "Success"),
          description: t("Täydennysryhmä luotu", "Topping group created"),
        });
      }

      // Update topping group items
      await updateToppingGroupItems(groupId, selectedToppingIds);

      resetForm();
      refetch();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Toiminto epäonnistui", "Operation failed"),
        variant: "destructive",
      });
    }
  };

  const updateToppingGroupItems = async (groupId: number, toppingIds: number[]) => {
    // Delete existing items
    await supabase
      .from('topping_group_items')
      .delete()
      .eq('topping_group_id', groupId);

    // Insert new items
    if (toppingIds.length > 0) {
      const items = toppingIds.map((toppingId, index) => ({
        topping_group_id: groupId,
        topping_id: toppingId,
        display_order: index,
      }));

      const { error } = await supabase
        .from('topping_group_items')
        .insert(items);

      if (error) {
        throw error;
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("Haluatko varmasti poistaa tämän täydennysryhmän?", "Are you sure you want to delete this topping group?"))) {
      return;
    }

    try {
      await deleteGroup.mutateAsync(id);
      toast({
        title: t("Onnistui", "Success"),
        description: t("Täydennysryhmä poistettu", "Topping group deleted"),
      });
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Poisto epäonnistui", "Delete failed"),
        variant: "destructive",
      });
    }
  };

  const toggleToppingSelection = (toppingId: number) => {
    setSelectedToppingIds(prev =>
      prev.includes(toppingId)
        ? prev.filter(id => id !== toppingId)
        : [...prev, toppingId]
    );
  };

  // Auto-adjust selection type based on max selections
  useEffect(() => {
    if (formData.maxSelections === 1) {
      setFormData(prev => ({ ...prev, selectionType: "radio" }));
    }
  }, [formData.maxSelections]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            {(viewMode === 'group-detail' || viewMode === 'topping-detail') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {t("Täytteiden hallinta", "Toppings Management")}
          </DialogTitle>
        </DialogHeader>

        {(viewMode === 'groups-list' || viewMode === 'toppings-list') && (
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'groups' | 'toppings');
            setViewMode(value === 'groups' ? 'groups-list' : 'toppings-list');
          }} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="groups">{t("Ryhmät", "Groups")}</TabsTrigger>
              <TabsTrigger value="toppings">{t("Täytteet", "Toppings")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Groups List View */}
          {viewMode === 'groups-list' && (
            <>
              <Button onClick={handleCreateNew} className="w-full" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                {t("Lisää uusi täydennysryhmä", "Add New Topping Group")}
              </Button>

              <div className="space-y-3">
                {toppingGroups?.map((group: any) => (
                  <Card 
                    key={group.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleEditGroup(group)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold">{group.name}</h3>
                            {group.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                {t("Pakollinen", "Required")}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {group.selection_type === 'radio' ? (
                                <><Circle className="w-3 h-3 mr-1" /> {t("Yksi valinta", "Single choice")}</>
                              ) : (
                                <><CheckSquare className="w-3 h-3 mr-1" /> {t("Monta valintaa", "Multiple choice")}</>
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mb-2">{group.name_en}</p>
                          <div className="flex gap-4 text-sm text-gray-600">
                            <span>
                              {t("Täytteitä", "Toppings")}: <strong>{group.toppingGroupItems?.length || 0}</strong>
                            </span>
                            <span>
                              {t("Min", "Min")}: <strong>{group.min_selections}</strong>
                            </span>
                            <span>
                              {t("Max", "Max")}: <strong>{group.max_selections}</strong>
                            </span>
                            <span>
                              {t("Järjestys", "Order")}: <strong>{group.display_order}</strong>
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditGroup(group);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {toppingGroups?.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center text-gray-500">
                      <p className="text-lg">{t("Ei vielä täydennysryhmiä.", "No topping groups yet.")}</p>
                      <p className="text-sm mt-2">
                        {t("Klikkaa 'Lisää uusi' aloittaaksesi.", "Click 'Add New' to get started.")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Group Detail View */}
          {viewMode === 'group-detail' && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-xl">
                  {editingGroupId
                    ? t("Muokkaa täydennysryhmää", "Edit Topping Group")
                    : t("Lisää uusi täydennysryhmä", "Add New Topping Group")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    {t("Perustiedot", "Basic Information")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t("Nimi (FI)", "Name (FI)")}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t("Esim. Pizzan täytteet", "E.g. Pizza Toppings")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nameEn">{t("Nimi (EN)", "Name (EN)")}</Label>
                      <Input
                        id="nameEn"
                        value={formData.nameEn}
                        onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                        placeholder="E.g. Pizza Toppings"
                      />
                    </div>
                  </div>
                </div>

                {/* Selection Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    {t("Valinta-asetukset", "Selection Settings")}
                  </h3>

                  <div>
                    <Label className="mb-3 block">{t("Valintatyyppi", "Selection Type")}</Label>
                    <RadioGroup 
                      value={formData.selectionType} 
                      onValueChange={(value: "checkbox" | "radio") => setFormData({ ...formData, selectionType: value })}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 border rounded-lg p-3">
                        <RadioGroupItem value="checkbox" id="checkbox" />
                        <Label htmlFor="checkbox" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-primary" />
                            <div>
                              <div className="font-semibold">{t("Monivalinta", "Multiple Choice")}</div>
                              <div className="text-xs text-gray-500">
                                {t("Asiakas voi valita useita täytteitä", "Customer can select multiple toppings")}
                              </div>
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 border rounded-lg p-3">
                        <RadioGroupItem value="radio" id="radio" />
                        <Label htmlFor="radio" className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <Circle className="w-5 h-5 text-primary" />
                            <div>
                              <div className="font-semibold">{t("Yksi valinta", "Single Choice")}</div>
                              <div className="text-xs text-gray-500">
                                {t("Asiakas voi valita vain yhden täytteen", "Customer can select only one topping")}
                              </div>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="minSelections">{t("Minimi valinta", "Min Selections")}</Label>
                      <Input
                        id="minSelections"
                        type="number"
                        min="0"
                        value={formData.minSelections}
                        onChange={(e) => setFormData({ ...formData, minSelections: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxSelections">{t("Maksimi valinta", "Max Selections")}</Label>
                      <Input
                        id="maxSelections"
                        type="number"
                        min="1"
                        value={formData.maxSelections}
                        onChange={(e) => setFormData({ ...formData, maxSelections: parseInt(e.target.value) || 1 })}
                        disabled={formData.selectionType === 'radio'}
                      />
                      {formData.selectionType === 'radio' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t("Automaattisesti 1 radiopainikkeille", "Automatically 1 for radio buttons")}
                        </p>
                      )}
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

                  <div className="flex items-center space-x-2 bg-amber-50 p-3 rounded-lg">
                    <Switch
                      id="isRequired"
                      checked={formData.isRequired}
                      onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                    />
                    <Label htmlFor="isRequired" className="cursor-pointer">
                      {t("Pakollinen valinta", "Required Selection")}
                    </Label>
                  </div>
                </div>

                {/* Toppings Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    {t("Täytteet ryhmässä", "Toppings in Group")}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                    {allToppings?.map((topping: any) => (
                      <div
                        key={topping.id}
                        onClick={() => toggleToppingSelection(topping.id)}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                          selectedToppingIds.includes(topping.id)
                            ? 'border-primary bg-primary/20 shadow-md'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }`}
                      >
                        <div className="font-semibold">{topping.name}</div>
                        <div className="text-sm text-gray-600">{topping.nameEn || topping.name_en}</div>
                        <div className="text-sm font-medium text-primary mt-1">€{topping.price}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    {t("Valittu", "Selected")}: <strong>{selectedToppingIds.length}</strong> {t("täytettä", "toppings")}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handleSave} className="flex-1" size="lg">
                    <Save className="w-5 h-5 mr-2" />
                    {t("Tallenna", "Save")}
                  </Button>
                  {editingGroupId && (
                    <Button 
                      onClick={async () => {
                        if (confirm(t("Haluatko varmasti poistaa tämän täydennysryhmän?", "Are you sure you want to delete this topping group?"))) {
                          try {
                            await deleteGroup.mutateAsync(editingGroupId);
                            toast({
                              title: t("Onnistui", "Success"),
                              description: t("Täydennysryhmä poistettu", "Topping group deleted"),
                            });
                            resetForm();
                            refetch();
                          } catch (error) {
                            toast({
                              title: t("Virhe", "Error"),
                              description: t("Poisto epäonnistui", "Delete failed"),
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                      variant="destructive"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      {t("Poista", "Delete")}
                    </Button>
                  )}
                  <Button onClick={handleBackToList} variant="outline" size="lg">
                    <X className="w-5 h-5 mr-2" />
                    {t("Peruuta", "Cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Toppings List View */}
          {viewMode === 'toppings-list' && (
            <>
              <Button onClick={handleCreateNewTopping} className="w-full" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                {t("Lisää uusi täyte", "Add New Topping")}
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allToppings?.map((topping: any) => (
                  <Card 
                    key={topping.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleEditTopping(topping)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{topping.name}</h3>
                            {!topping.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                {t("Ei aktiivinen", "Inactive")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{topping.name_en || topping.nameEn}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold text-primary">€{topping.price}</span>
                            <Badge variant="outline" className="text-xs">
                              {topping.category}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTopping(topping);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(!allToppings || allToppings.length === 0) && (
                  <Card className="col-span-full">
                    <CardContent className="p-12 text-center text-gray-500">
                      <Pizza className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">{t("Ei vielä täytteitä.", "No toppings yet.")}</p>
                      <p className="text-sm mt-2">
                        {t("Klikkaa 'Lisää uusi' aloittaaksesi.", "Click 'Add New' to get started.")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* Topping Detail View */}
          {viewMode === 'topping-detail' && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-xl">
                  {editingToppingId
                    ? t("Muokkaa täytettä", "Edit Topping")
                    : t("Lisää uusi täyte", "Add New Topping")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">
                    {t("Perustiedot", "Basic Information")}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="toppingName">{t("Nimi (FI)", "Name (FI)")} *</Label>
                      <Input
                        id="toppingName"
                        value={toppingFormData.name}
                        onChange={(e) => setToppingFormData({ ...toppingFormData, name: e.target.value })}
                        placeholder={t("Esim. Pepperoni", "E.g. Pepperoni")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="toppingNameEn">{t("Nimi (EN)", "Name (EN)")}</Label>
                      <Input
                        id="toppingNameEn"
                        value={toppingFormData.nameEn}
                        onChange={(e) => setToppingFormData({ ...toppingFormData, nameEn: e.target.value })}
                        placeholder="E.g. Pepperoni"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="toppingPrice">{t("Hinta (€)", "Price (€)")} *</Label>
                      <Input
                        id="toppingPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={toppingFormData.price}
                        onChange={(e) => setToppingFormData({ ...toppingFormData, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="toppingCategory">{t("Kategoria", "Category")}</Label>
                      <Input
                        id="toppingCategory"
                        value={toppingFormData.category}
                        onChange={(e) => setToppingFormData({ ...toppingFormData, category: e.target.value })}
                        placeholder="pizza"
                      />
                    </div>
                    <div>
                      <Label htmlFor="toppingOrder">{t("Järjestys", "Display Order")}</Label>
                      <Input
                        id="toppingOrder"
                        type="number"
                        value={toppingFormData.displayOrder}
                        onChange={(e) => setToppingFormData({ ...toppingFormData, displayOrder: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-green-50 p-3 rounded-lg">
                    <Switch
                      id="toppingActive"
                      checked={toppingFormData.isActive}
                      onCheckedChange={(checked) => setToppingFormData({ ...toppingFormData, isActive: checked })}
                    />
                    <Label htmlFor="toppingActive" className="cursor-pointer">
                      {t("Aktiivinen", "Active")}
                    </Label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button onClick={handleSaveTopping} className="flex-1" size="lg">
                    <Save className="w-5 h-5 mr-2" />
                    {t("Tallenna", "Save")}
                  </Button>
                  {editingToppingId && (
                    <Button 
                      onClick={() => handleDeleteTopping(editingToppingId)}
                      variant="destructive"
                    >
                      <Trash2 className="w-5 h-5 mr-2" />
                      {t("Poista", "Delete")}
                    </Button>
                  )}
                  <Button onClick={handleBackToList} variant="outline" size="lg">
                    <X className="w-5 h-5 mr-2" />
                    {t("Peruuta", "Cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}



