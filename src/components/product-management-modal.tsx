import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useCategories } from "@/hooks/use-menu";
import { useSupabaseBranches } from "@/hooks/use-supabase-menu";
import { useRestaurantConfig } from "@/hooks/use-restaurant-config";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Upload, Percent, Tag, Save, Trash2, Store } from "lucide-react";
import type { MenuItem } from "@shared/schema";
import { MenuItemToppingGroupAssignment } from "./menu-item-topping-group-assignment";

// Form-specific type with optional id and string dates for inputs
type MenuItemFormData = Omit<MenuItem, 'id' | 'offerStartDate' | 'offerEndDate'> & {
  id?: number;
  offerStartDate?: string | null;
  offerEndDate?: string | null;
};

interface ProductManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: MenuItem | null;
  onSave: (product: MenuItem) => Promise<void>;
  onDelete?: (productId: number) => Promise<void>;
}

export function ProductManagementModal({ 
  isOpen, 
  onClose, 
  product, 
  onSave, 
  onDelete 
}: ProductManagementModalProps) {
  const { t, language } = useLanguage();
  const { data: categories } = useCategories();
  const { data: branches } = useSupabaseBranches();
  const { data: restaurantConfig } = useRestaurantConfig();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<MenuItemFormData>({
    name: "",
    nameEn: "",
    price: "",
    categoryId: null,
    branchId: null,
    description: null,
    descriptionEn: null,
    imageUrl: null,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isAvailable: true,
    displayOrder: null,
    offerPrice: null,
    offerPercentage: null,
    offerStartDate: null,
    offerEndDate: null,
    hasConditionalPricing: false,
    includedToppingsCount: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showOfferSettings, setShowOfferSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        offerPrice: product.offerPrice || null,
        offerPercentage: product.offerPercentage || null,
        offerStartDate: product.offerStartDate ? product.offerStartDate.toISOString().split('T')[0] : null,
        offerEndDate: product.offerEndDate ? product.offerEndDate.toISOString().split('T')[0] : null,
      });
      setShowOfferSettings(!!(product.offerPrice || product.offerPercentage));
    } else {
      setFormData({
        name: "",
        nameEn: "",
        price: "",
        categoryId: null,
        branchId: null,
        description: null,
        descriptionEn: null,
        imageUrl: null,
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        isAvailable: true,
        displayOrder: null,
        offerPrice: null,
        offerPercentage: null,
        offerStartDate: null,
        offerEndDate: null,
        hasConditionalPricing: false,
        includedToppingsCount: 0,
      });
      setShowOfferSettings(false);
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.nameEn || !formData.price || !formData.categoryId) {
      toast({
        title: t("Virhe", "Error"),
        description: t("T‰yt‰ kaikki pakolliset kent‰t", "Please fill all required fields"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Clear offer fields if offer settings are disabled
      const dataToSave = showOfferSettings 
        ? formData 
        : {
            ...formData,
            offerPrice: null,
            offerPercentage: null,
            offerStartDate: null,
            offerEndDate: null,
          };
      
      console.log("?? MODAL: Saving product data:", dataToSave);
      console.log("?? MODAL: hasConditionalPricing:", dataToSave.hasConditionalPricing);
      console.log("?? MODAL: includedToppingsCount:", dataToSave.includedToppingsCount);
      
      await onSave(dataToSave as MenuItem);
      toast({
        title: t("Tallennettu", "Saved"),
        description: t("Tuote tallennettu onnistuneesti", "Product saved successfully"),
      });
      onClose();
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Tuotteen tallentaminen ep‰onnistui", "Failed to save product"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!product?.id || !onDelete) return;
    
    if (!confirm(t("Haluatko varmasti poistaa t‰m‰n tuotteen?", "Are you sure you want to delete this product?"))) {
      return;
    }

    setIsLoading(true);
    try {
      await onDelete(product.id);
      toast({
        title: t("Poistettu", "Deleted"),
        description: t("Tuote poistettu onnistuneesti", "Product deleted successfully"),
      });
      onClose();
    } catch (error) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Tuotteen poistaminen ep‰onnistui", "Failed to delete product"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOfferPrice = (percentage: number) => {
    if (!formData.price || !percentage) return;
    const originalPrice = parseFloat(formData.price);
    const discount = originalPrice * (percentage / 100);
    const offerPrice = originalPrice - discount;
    return offerPrice.toFixed(2);
  };

  const calculateOfferPercentage = (offerPrice: number) => {
    if (!formData.price || !offerPrice) return;
    const originalPrice = parseFloat(formData.price);
    if (offerPrice >= originalPrice) {
      return 0;
    } else {
      const discount = originalPrice - offerPrice;
      const percentage = (discount / originalPrice) * 100;
      return Math.round(percentage);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      console.log('?? Uploading image via server to Hostinger FTP...');
      
      // Get Supabase session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      // Create FormData for server upload
      const formDataToSend = new FormData();
      formDataToSend.append('image', file);
      formDataToSend.append('folder', 'menu-items');
      
      // Upload via server API (which uses Hostinger FTP)
      const API_URL = import.meta.env.VITE_API_URL || 'https://tirva-admin.fly.dev';
      const response = await fetch(`${API_URL}/api/upload-image`, {
        method: 'POST',
        body: formDataToSend,
        credentials: 'include',
        headers: session?.access_token ? {
          'Authorization': `Bearer ${session.access_token}`
        } : {}
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const { imageUrl } = await response.json();
      console.log('? Image uploaded successfully:', imageUrl);
      
      // Update form data with new image URL
      setFormData(prev => ({ 
        ...prev, 
        imageUrl: imageUrl 
      }));

      toast({
        title: t("Onnistui", "Success"),
        description: t("Kuva ladattu onnistuneesti", "Image uploaded successfully"),
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: t("Virhe", "Error"),
        description: t("Kuvan lataaminen ep‰onnistui", "Image upload failed"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {product ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>
              {product ? 
                t("Muokkaa tuotetta", "Edit Product") : 
                t("Lis‰‰ uusi tuote", "Add New Product")
              }
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold dark:text-white">
              {t("Perustiedot", "Basic Information")}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("Nimi (suomi)", "Name (Finnish)")} *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">
                  {t("Nimi (englanti)", "Name (English)")} *
                </Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {t("Hinta (Ä)", "Price (Ä)")} *
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.10"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">
                  {t("Kategoria", "Category")} *
                </Label>
                <Select 
                  value={formData.categoryId?.toString() || ""} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Valitse kategoria", "Select category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {language === "fi" ? category.name : category.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Branch Selection */}
            <div className="space-y-2">
              <Label htmlFor="branchId" className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                {t("Toimipiste", "Branch")}
              </Label>
              <Select
                value={formData.branchId?.toString() || "all"}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  branchId: value === "all" ? null : parseInt(value)
                }))}
              >
                <SelectTrigger id="branchId">
                  <SelectValue placeholder={t("Kaikki toimipisteet", "All branches")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("Kaikki toimipisteet (saatavilla kaikkialla)", "All branches (available everywhere)")}
                  </SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {language === "fi" ? branch.name : branch.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(
                  "Jos 'Kaikki toimipisteet' valitaan, tuote n‰kyy kaikissa toimipisteiss‰. Muuten tuote n‰kyy vain valitussa toimipisteess‰.",
                  "If 'All branches' is selected, the product will be available at all branches. Otherwise, it will only be available at the selected branch."
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">
                  {t("Kuvaus (suomi)", "Description (Finnish)")}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">
                  {t("Kuvaus (englanti)", "Description (English)")}
                </Label>
                <Textarea
                  id="descriptionEn"
                  value={formData.descriptionEn || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">
                {t("Kuvan URL", "Image URL")}
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="imageUrl"
                  value={formData.imageUrl || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <span className="w-4 h-4 animate-spin">?</span>
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              {formData.imageUrl && (
                <div className="mt-2">
                  <img 
                    src={formData.imageUrl} 
                    alt="Product preview" 
                    className="w-20 h-20 object-cover rounded-md border"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dietary Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold dark:text-white">
              {t("Ruokavalio", "Dietary Information")}
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="vegetarian"
                  checked={formData.isVegetarian || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVegetarian: checked }))}
                />
                <Label htmlFor="vegetarian">
                  {t("Kasvisruoka", "Vegetarian")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="vegan"
                  checked={formData.isVegan || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isVegan: checked }))}
                />
                <Label htmlFor="vegan">
                  {t("Vegaaniruoka", "Vegan")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="glutenFree"
                  checked={formData.isGlutenFree || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isGlutenFree: checked }))}
                />
                <Label htmlFor="glutenFree">
                  {t("Gluteeniton", "Gluten Free")}
                </Label>
              </div>
            </div>
          </div>

          {/* Promotional Offers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                {t("Tarjoukset", "Promotional Offers")}
              </h3>
              <Switch
                checked={showOfferSettings}
                onCheckedChange={setShowOfferSettings}
              />
            </div>

            {showOfferSettings && (
              <div className="space-y-4 p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offerPrice">
                      {t("Tarjoushinta (Ä)", "Offer Price (Ä)")}
                    </Label>
                    <Input
                      id="offerPrice"
                      type="number"
                      step="0.10"
                      value={formData.offerPrice || ""}
                      onChange={(e) => {
                        const offerPrice = e.target.value;
                        setFormData(prev => ({ ...prev, offerPrice }));
                        
                        if (offerPrice && formData.price) {
                          const percentage = calculateOfferPercentage(parseFloat(offerPrice));
                          if (percentage !== undefined) {
                            setFormData(prev => ({ ...prev, offerPrice, offerPercentage: percentage }));
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offerPercentage">
                      {t("Alennus (%)", "Discount (%)")}
                    </Label>
                    <Input
                      id="offerPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.offerPercentage || ""}
                      onChange={(e) => {
                        const percentage = parseInt(e.target.value) || null;
                        setFormData(prev => ({ ...prev, offerPercentage: percentage }));
                        
                        if (e.target.value && formData.price) {
                          const offerPrice = calculateOfferPrice(percentage || 0);
                          if (offerPrice !== undefined) {
                            setFormData(prev => ({ ...prev, offerPercentage: percentage, offerPrice }));
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="offerStartDate">
                      {t("Tarjous alkaa", "Offer Start Date")}
                    </Label>
                    <Input
                      id="offerStartDate"
                      type="datetime-local"
                      value={formData.offerStartDate || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, offerStartDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offerEndDate">
                      {t("Tarjous p‰‰ttyy", "Offer End Date")}
                    </Label>
                    <Input
                      id="offerEndDate"
                      type="datetime-local"
                      value={formData.offerEndDate || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, offerEndDate: e.target.value }))}
                    />
                  </div>
                </div>

                {formData.offerPrice && formData.price && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {t("S‰‰stˆ:", "Savings:")}
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      Ä{(parseFloat(formData.price) - parseFloat(formData.offerPrice)).toFixed(2)}
                      {formData.offerPercentage && ` (${formData.offerPercentage}%)`}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {!showOfferSettings && (formData.offerPrice || formData.offerPercentage) && (
              <div className="text-sm text-orange-600 dark:text-orange-400">
                {t("Tarjousasetukset poistetaan tallennettaessa", "Offer settings will be removed when saved")}
              </div>
            )}
          </div>

          {/* Conditional Pricing (Your Choice Items) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold dark:text-white flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  {t("Ehdollinen hinnoittelu", "Conditional Pricing")}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t(
                    "Asiakkaat voivat valita tietyn m‰‰r‰n lis‰t‰ytteit‰ ilmaiseksi",
                    "Customers can choose a certain number of toppings for free"
                  )}
                </p>
              </div>
              <Switch
                checked={formData.hasConditionalPricing || false}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  hasConditionalPricing: checked,
                  includedToppingsCount: checked ? (prev.includedToppingsCount || 1) : 0
                }))}
              />
            </div>

            {formData.hasConditionalPricing && (
              <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="space-y-2">
                  <Label htmlFor="includedToppingsCount">
                    {t("Ilmaisten lis‰t‰ytteiden m‰‰r‰", "Number of Free Toppings")}
                  </Label>
                  <Input
                    id="includedToppingsCount"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.includedToppingsCount || 0}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      includedToppingsCount: parseInt(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t(
                      "Esim. Jos m‰‰rit‰t 3, ensimm‰iset 3 lis‰t‰ytett‰ ovat ilmaisia. Loput maksavat normaalihintaan.",
                      "E.g. If you set 3, the first 3 toppings are free. Additional toppings are charged at regular price."
                    )}
                  </p>
                </div>

                {(formData.includedToppingsCount || 0) > 0 && (
                  <div className="flex items-center space-x-2 text-sm p-3 bg-green-100 dark:bg-green-900/30 rounded">
                    <span className="font-semibold text-green-800 dark:text-green-300">
                      ?? {t("Esimerkki:", "Example:")}
                    </span>
                    <span className="text-green-700 dark:text-green-400">
                      {t(
                        `Asiakas valitsee ${(formData.includedToppingsCount || 0) + 1} lis‰t‰ytett‰ ? ${formData.includedToppingsCount || 0} ilmaista + 1 maksullinen`,
                        `Customer selects ${(formData.includedToppingsCount || 0) + 1} toppings ? ${formData.includedToppingsCount || 0} free + 1 paid`
                      )}
                    </span>
                  </div>
                )}

                <div className="text-sm text-green-700 dark:text-green-300 p-3 bg-green-100 dark:bg-green-900/30 rounded">
                  <strong>{t("Huom:", "Note:")}</strong> {t(
                    "T‰m‰ toimii automaattisesti nettisivustolla, mobiilisovelluksessa ja kuitilla.",
                    "This works automatically on the website, mobile app, and receipts."
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold dark:text-white">
              {t("Asetukset", "Settings")}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={formData.isAvailable || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                />
                <Label htmlFor="available">
                  {t("Saatavilla", "Available")}
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayOrder">
                  {t("N‰yttˆj‰rjestys", "Display Order")}
                </Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={formData.displayOrder || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || null }))}
                />
              </div>
            </div>
          </div>

          {/* Topping Group Assignment - Only show for existing products */}
          {product && product.id && (
            <MenuItemToppingGroupAssignment
              menuItemId={product.id}
              menuItemName={formData.name}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {product && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{t("Poista", "Delete")}</span>
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {t("Peruuta", "Cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isLoading ? 
                    t("Tallennetaan...", "Saving...") : 
                    t("Tallenna", "Save")
                  }
                </span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}