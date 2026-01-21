import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Store, Edit, Clock, MapPin } from "lucide-react";
import { Header } from "@/components/header";

interface Branch {
  id: number;
  name: string;
  name_en: string;
  address: string;
  city: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  is_active: boolean;
  display_order: number;
  opening_hours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  } | null;
  created_at: string;
  updated_at: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES_FI = {
  monday: 'Maanantai',
  tuesday: 'Tiistai',
  wednesday: 'Keskiviikko',
  thursday: 'Torstai',
  friday: 'Perjantai',
  saturday: 'Lauantai',
  sunday: 'Sunnuntai',
};
const DAY_NAMES_EN = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function BranchesAdmin() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Fetch branches
  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Branch[];
    },
  });

  // Update opening hours
  const updateHoursMutation = useMutation({
    mutationFn: async ({ id, opening_hours }: { id: number; opening_hours: any }) => {
      console.log('Updating hours for branch:', id, opening_hours);
      const { data, error } = await supabase
        .from("branches")
        .update({ opening_hours })
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating hours:', error);
        throw error;
      }
      console.log('Hours updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-admin"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({
        title: t("Onnistui!", "Success!"),
        description: t("Aukioloajat päivitetty", "Opening hours updated"),
      });
      setIsDialogOpen(false);
      setEditingBranch(null);
    },
    onError: (error) => {
      toast({
        title: t("Virhe", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update branch info
  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, ...branch }: Partial<Branch> & { id: number }) => {
      const { data, error } = await supabase
        .from("branches")
        .update(branch)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches-admin"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({
        title: t("Onnistui!", "Success!"),
        description: t("Toimipisteen tiedot päivitetty", "Branch info updated"),
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

  const handleEditHours = (branch: Branch) => {
    setEditingBranch(branch);
    setIsDialogOpen(true);
  };

  const handleSaveHours = (hours: any) => {
    if (!editingBranch) return;
    console.log('handleSaveHours called with:', hours);
    console.log('editingBranch:', editingBranch);
    updateHoursMutation.mutate({ id: editingBranch.id, opening_hours: hours });
  };

  const toggleBranchActive = (branch: Branch) => {
    updateBranchMutation.mutate({ id: branch.id, is_active: !branch.is_active });
  };

  const dayNames = language === 'en' ? DAY_NAMES_EN : DAY_NAMES_FI;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header onCartClick={() => setIsCartOpen(true)} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Store className="w-8 h-8" />
              {t("Toimipisteiden hallinta", "Branch Management")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t("Hallitse toimipisteitä ja aukioloaikoja", "Manage branches and opening hours")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">{t("Ladataan...", "Loading...")}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {branches?.map((branch) => (
              <Card key={branch.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-red-600" />
                        {branch.name}
                        {!branch.is_active && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {t("Ei aktiivinen", "Inactive")}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="space-y-1 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t("Osoite", "Address")}:</span>
                          {branch.address}, {branch.city} {branch.postal_code}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t("Puhelin", "Phone")}:</span>
                          {branch.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t("Sähköposti", "Email")}:</span>
                          {branch.email}
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={branch.is_active}
                        onCheckedChange={() => toggleBranchActive(branch)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditHours(branch)}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        {t("Aukioloajat", "Hours")}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {branch.opening_hours && DAYS.map((day) => {
                      const hours = branch.opening_hours![day as keyof typeof branch.opening_hours];
                      return (
                        <div key={day} className="flex flex-col p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {dayNames[day as keyof typeof dayNames]}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {hours.closed 
                              ? t("Suljettu", "Closed")
                              : `${hours.open} - ${hours.close}`
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Hours Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingBranch(null);
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("Muokkaa aukioloaikoja", "Edit Opening Hours")} - {editingBranch?.name}
              </DialogTitle>
              <DialogDescription>
                {t("Aseta aukioloajat jokaiselle viikonpäivälle", "Set opening hours for each day of the week")}
              </DialogDescription>
            </DialogHeader>

            {editingBranch && editingBranch.opening_hours && (
              <div className="space-y-4">
                {DAYS.map((day) => {
                  const hours = editingBranch.opening_hours![day as keyof typeof editingBranch.opening_hours];
                  return (
                    <div key={day} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-32">
                        <span className="font-medium">
                          {dayNames[day as keyof typeof dayNames]}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!hours.closed}
                          onCheckedChange={(checked) => {
                            const newHours = { ...editingBranch.opening_hours };
                            newHours[day as keyof typeof newHours] = {
                              ...hours,
                              closed: !checked,
                            };
                            setEditingBranch({ ...editingBranch, opening_hours: newHours });
                          }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {hours.closed ? t("Suljettu", "Closed") : t("Avoinna", "Open")}
                        </span>
                      </div>

                      {!hours.closed && (
                        <>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">{t("Avaus", "Open")}</Label>
                            <Input
                              type="time"
                              value={hours.open}
                              onChange={(e) => {
                                const newHours = { ...editingBranch.opening_hours };
                                newHours[day as keyof typeof newHours] = {
                                  ...hours,
                                  open: e.target.value,
                                };
                                setEditingBranch({ ...editingBranch, opening_hours: newHours });
                              }}
                              className="w-32"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">{t("Sulku", "Close")}</Label>
                            <Input
                              type="time"
                              value={hours.close}
                              onChange={(e) => {
                                const newHours = { ...editingBranch.opening_hours };
                                newHours[day as keyof typeof newHours] = {
                                  ...hours,
                                  close: e.target.value,
                                };
                                setEditingBranch({ ...editingBranch, opening_hours: newHours });
                              }}
                              className="w-32"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingBranch(null);
                }}
              >
                {t("Peruuta", "Cancel")}
              </Button>
              <Button 
                onClick={() => editingBranch && handleSaveHours(editingBranch.opening_hours)}
                disabled={updateHoursMutation.isPending}
              >
                {t("Tallenna", "Save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}



