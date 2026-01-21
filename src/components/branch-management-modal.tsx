import { useState } from "react";
import { useSupabaseBranches, useSupabaseCreateBranch, useSupabaseUpdateBranch, useSupabaseDeleteBranch } from "@/hooks/use-supabase-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-context";
import { Plus, Edit, Trash2, Save, X, MapPin, Phone, Mail } from "lucide-react";

interface BranchManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BranchManagementModal({ isOpen, onClose }: BranchManagementModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: branches, refetch } = useSupabaseBranches();
  const createBranch = useSupabaseCreateBranch();
  const updateBranch = useSupabaseUpdateBranch();
  const deleteBranch = useSupabaseDeleteBranch();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    address: "",
    city: "",
    postalCode: "",
    latitude: "",
    longitude: "",
    phone: "",
    email: "",
    displayOrder: 0,
    isActive: true,
    openingHours: {
      monday: { open: "10:30", close: "22:00", closed: false },
      tuesday: { open: "10:30", close: "22:00", closed: false },
      wednesday: { open: "10:30", close: "22:00", closed: false },
      thursday: { open: "10:30", close: "22:00", closed: false },
      friday: { open: "10:30", close: "23:00", closed: false },
      saturday: { open: "11:00", close: "23:00", closed: false },
      sunday: { open: "12:00", close: "21:00", closed: false },
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      nameEn: "",
      address: "",
      city: "",
      postalCode: "",
      latitude: "",
      longitude: "",
      phone: "",
      email: "",
      displayOrder: 0,
      isActive: true,
      openingHours: {
        monday: { open: "10:30", close: "22:00", closed: false },
        tuesday: { open: "10:30", close: "22:00", closed: false },
        wednesday: { open: "10:30", close: "22:00", closed: false },
        thursday: { open: "10:30", close: "22:00", closed: false },
        friday: { open: "10:30", close: "23:00", closed: false },
        saturday: { open: "11:00", close: "23:00", closed: false },
        sunday: { open: "12:00", close: "21:00", closed: false },
      },
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (branch: any) => {
    setFormData({
      name: branch.name,
      nameEn: branch.nameEn,
      address: branch.address,
      city: branch.city,
      postalCode: branch.postalCode,
      latitude: String(branch.latitude || ""),
      longitude: String(branch.longitude || ""),
      phone: branch.phone,
      email: branch.email || "",
      displayOrder: branch.displayOrder || 0,
      isActive: branch.isActive !== undefined ? branch.isActive : true,
      openingHours: branch.openingHours || {
        monday: { open: "10:30", close: "22:00", closed: false },
        tuesday: { open: "10:30", close: "22:00", closed: false },
        wednesday: { open: "10:30", close: "22:00", closed: false },
        thursday: { open: "10:30", close: "22:00", closed: false },
        friday: { open: "10:30", close: "23:00", closed: false },
        saturday: { open: "11:00", close: "23:00", closed: false },
        sunday: { open: "12:00", close: "21:00", closed: false },
      },
    });
    setEditingId(branch.id);
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.nameEn.trim() || !formData.address.trim() || 
        !formData.city.trim() || !formData.postalCode.trim() || !formData.phone.trim() ||
        !formData.latitude.trim() || !formData.longitude.trim()) {
      toast({
        title: t("Virhe", "Error"),
        description: t("Täytä kaikki pakolliset kentät", "Please fill all required fields"),
        variant: "destructive",
      });
      return;
    }

    try {
      const branchData = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      if (editingId) {
        await updateBranch.mutateAsync({
          id: editingId,
          data: branchData,
        });
        toast({
          title: t("Onnistui", "Success"),
          description: t("Toimipiste päivitetty", "Branch updated"),
        });
      } else {
        await createBranch.mutateAsync(branchData);
        toast({
          title: t("Onnistui", "Success"),
          description: t("Toimipiste luotu", "Branch created"),
        });
      }
      resetForm();
      refetch();
    } catch (error) {
      console.error('Branch save error:', error);
      toast({
        title: t("Virhe", "Error"),
        description: error instanceof Error ? error.message : t("Toiminto epäonnistui", "Operation failed"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("Haluatko varmasti poistaa tämän toimipisteen?", "Are you sure you want to delete this branch?"))) {
      return;
    }

    try {
      await deleteBranch.mutateAsync(id);
      toast({
        title: t("Onnistui", "Success"),
        description: t("Toimipiste poistettu", "Branch deleted"),
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
            {t("Hallitse toimipisteitä", "Manage Branches")}
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
                      placeholder={t("Esim. Lahti", "e.g. Lahti")}
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
                      placeholder="e.g. Lahti"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">
                      {t("Osoite", "Address")} *
                    </Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder={t("Esim. Kauppakatu 1", "e.g. Kauppakatu 1")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      {t("Kaupunki", "City")} *
                    </Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder={t("Esim. Lahti", "e.g. Lahti")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">
                      {t("Postinumero", "Postal Code")} *
                    </Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="15100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="latitude">
                      {t("Leveyspiiri", "Latitude")} *
                    </Label>
                    <Input
                      id="latitude"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="60.98267"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">
                      {t("Pituuspiiri", "Longitude")} *
                    </Label>
                    <Input
                      id="longitude"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="25.66151"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      {t("Puhelin", "Phone")} *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+358 3 123 4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {t("Sähköposti", "Email")}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="lahti@example.com"
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

                {/* Opening Hours Section */}
                <div className="space-y-4 border-t pt-4">
                  <Label className="text-base font-semibold">
                    {t("Aukioloajat", "Opening Hours")}
                  </Label>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(formData.openingHours).map(([day, hours]) => (
                      <div key={day} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-2 w-32">
                          <Switch
                            checked={!hours.closed}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              openingHours: {
                                ...formData.openingHours,
                                [day]: { ...hours, closed: !checked }
                              }
                            })}
                          />
                          <Label className="text-sm font-medium capitalize">
                            {t(
                              day === 'monday' ? 'Ma' : day === 'tuesday' ? 'Ti' : day === 'wednesday' ? 'Ke' :
                              day === 'thursday' ? 'To' : day === 'friday' ? 'Pe' : day === 'saturday' ? 'La' : 'Su',
                              day === 'monday' ? 'Mon' : day === 'tuesday' ? 'Tue' : day === 'wednesday' ? 'Wed' :
                              day === 'thursday' ? 'Thu' : day === 'friday' ? 'Fri' : day === 'saturday' ? 'Sat' : 'Sun'
                            )}
                          </Label>
                        </div>
                        {!hours.closed && (
                          <>
                            <Input
                              type="time"
                              value={hours.open}
                              onChange={(e) => setFormData({
                                ...formData,
                                openingHours: {
                                  ...formData.openingHours,
                                  [day]: { ...hours, open: e.target.value }
                                }
                              })}
                              className="w-32"
                            />
                            <span className="text-sm">-</span>
                            <Input
                              type="time"
                              value={hours.close}
                              onChange={(e) => setFormData({
                                ...formData,
                                openingHours: {
                                  ...formData.openingHours,
                                  [day]: { ...hours, close: e.target.value }
                                }
                              })}
                              className="w-32"
                            />
                          </>
                        )}
                        {hours.closed && (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t("Suljettu", "Closed")}
                          </span>
                        )}
                      </div>
                    ))}
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
              {t("Lisää uusi toimipiste", "Add New Branch")}
            </Button>
          )}

          {/* Branches List */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">
              {t("Nykyiset toimipisteet", "Current Branches")}
            </h3>
            {branches && branches.length > 0 ? (
              branches.map((branch: any) => (
                <Card key={branch.id} className={!branch.isActive ? "opacity-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="font-semibold text-lg">
                          {branch.name} / {branch.nameEn}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{branch.address}, {branch.postalCode} {branch.city}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>{branch.phone}</span>
                          </div>
                          {branch.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{branch.email}</span>
                            </div>
                          )}
                          <div className="text-xs">
                            {t("Koordinaatit", "Coordinates")}: {branch.latitude}, {branch.longitude}
                          </div>
                          {!branch.isActive && (
                            <div className="text-destructive font-medium">
                              {t("Ei aktiivinen", "Inactive")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(branch)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(branch.id)}
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
                  {t("Ei toimipisteitä", "No branches yet")}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



