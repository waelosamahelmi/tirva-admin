import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, MapPin, ArrowLeft, Moon, Sun, Globe, Menu, X, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useTheme } from "@/lib/theme-context";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  postal_code: string | null;
  icon: string;
  logo_url: string | null;
  region: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const iconOptions = [
  "MapPin", "Store", "ShoppingBag", "ShoppingCart", "Building", "Building2"
];

export default function LocationsAdmin() {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useSupabaseAuth();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState<Partial<Location>>({
    name: "",
    address: "",
    city: "",
    postal_code: "",
    icon: "MapPin",
    logo_url: "",
    region: "",
    display_order: 0,
    is_active: true,
  });

  // Fetch locations
  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Location[];
    },
  });

  // Create location
  const createMutation = useMutation({
    mutationFn: async (location: Partial<Location>) => {
      const { data, error } = await supabase
        .from("locations")
        .insert([location])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-admin"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: t("Onnistui!", "Success!"),
        description: t("Sijainti lisätty", "Location added"),
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: t("Virhe", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update location
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...location }: Partial<Location> & { id: number }) => {
      const { data, error } = await supabase
        .from("locations")
        .update(location)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-admin"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: t("Onnistui!", "Success!"),
        description: t("Sijainti päivitetty", "Location updated"),
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: t("Virhe", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete location
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations-admin"] });
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast({
        title: t("Onnistui!", "Success!"),
        description: t("Sijainti poistettu", "Location deleted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("Virhe", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      postal_code: "",
      icon: "MapPin",
      logo_url: "",
      region: "",
      display_order: 0,
      is_active: true,
    });
    setEditingLocation(null);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData(location);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm(t("Haluatko varmasti poistaa tämän sijainnin?", "Are you sure you want to delete this location?"))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - matching lounas-admin style */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {t("Ruokapisteet", "Food Locations", "مواقع الطعام", "Точки питания", "Matplatser")}
              </h1>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <Button
                  variant={language === "fi" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage("fi")}
                  className="text-xs"
                >
                  🇫🇮 FI
                </Button>
                <Button
                  variant={language === "en" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage("en")}
                  className="text-xs"
                >
                  🇺🇸 EN
                </Button>
                <Button
                  variant={language === "ar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage("ar")}
                  className="text-xs"
                >
                  🇸🇦 AR
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              <Button
                variant="outline"
                onClick={() => signOut()}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("Kirjaudu ulos", "Logout", "تسجيل الخروج", "Выход", "Logga ut")}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="px-4 py-3 space-y-3">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  {t("Kieli", "Language", "اللغة", "Язык", "Språk")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setLanguage("fi");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "fi" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇫🇮 FI
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("en");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "en" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇺🇸 EN
                  </button>
                  <button
                    onClick={() => {
                      setLanguage("ar");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2 rounded text-sm text-center ${
                      language === "ar" 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    🇸🇦 AR
                  </button>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={toggleTheme}
                className="w-full justify-start"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {theme === "dark" 
                  ? t("Vaalea teema", "Light Mode", "الوضع الفاتح", "Светлый режим", "Ljust läge")
                  : t("Tumma teema", "Dark Mode", "الوضع الداكن", "Тёмный режим", "Mörkt läge")
                }
              </Button>

              <Button
                variant="outline"
                onClick={() => signOut()}
                className="w-full justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("Kirjaudu ulos", "Logout", "تسجيل الخروج", "Выход", "Logga ut")}
              </Button>
            </div>
          </div>
        )}
      </header>
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-8 h-8" />
              {t("Ruokapisteiden hallinta", "Locations Management")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t("Lisää, muokkaa tai poista ruokapisteitä", "Add, edit or remove locations")}
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                {t("Lisää sijainti", "Add Location")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingLocation 
                    ? t("Muokkaa sijaintia", "Edit Location")
                    : t("Lisää uusi sijainti", "Add New Location")
                  }
                </DialogTitle>
                <DialogDescription>
                  {t("Täytä sijainnin tiedot", "Fill in the location details")}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">{t("Nimi", "Name")} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder={t("K-Citymarket Karisma", "K-Citymarket Karisma")}
                  />
                </div>

                <div>
                  <Label htmlFor="address">{t("Osoite", "Address")} *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    placeholder={t("Kauppiaankatu 2", "Kauppiaankatu 2")}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">{t("Kaupunki", "City")} *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      placeholder={t("Lahti", "Lahti")}
                    />
                  </div>

                  <div>
                    <Label htmlFor="postal_code">{t("Postinumero", "Postal Code")}</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code || ""}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      placeholder="15160"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="region">{t("Alue", "Region")}</Label>
                  <Input
                    id="region"
                    value={formData.region || ""}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder={t("Lahti", "Lahti")}
                  />
                </div>

                <div>
                  <Label htmlFor="logo_url">{t("Logo URL", "Logo URL")}</Label>
                  <Input
                    id="logo_url"
                    value={formData.logo_url || ""}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("Valinnainen kaupan logo", "Optional store logo")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="icon">{t("Ikoni", "Icon")}</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="display_order">{t("Näyttöjärjestys", "Display Order")}</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">{t("Aktiivinen", "Active")}</Label>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    {t("Peruuta", "Cancel")}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingLocation 
                      ? t("Päivitä", "Update")
                      : t("Lisää", "Add")
                    }
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">{t("Ladataan...", "Loading...")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {locations?.map((location) => (
              <Card key={location.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {location.name}
                        {!location.is_active && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {t("Ei aktiivinen", "Inactive")}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="space-y-1 mt-2">
                        <div>{location.address}</div>
                        <div>{location.city} {location.postal_code}</div>
                        {location.region && <div className="text-xs">{t("Alue", "Region")}: {location.region}</div>}
                        {location.logo_url && (
                          <div className="flex items-center gap-2 mt-2">
                            <img 
                              src={location.logo_url} 
                              alt={location.name}
                              className="w-16 h-16 object-contain bg-white rounded p-1"
                            />
                          </div>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(location)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(location.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>{t("Ikoni", "Icon")}: {location.icon}</div>
                    <div>{t("Järjestys", "Order")}: {location.display_order}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



