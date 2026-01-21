import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useRestaurantConfig, useUpdateRestaurantConfig, useCreateRestaurantConfig, useActivateRestaurantConfig } from "@/hooks/use-restaurant-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Store, 
  Info, 
  Phone, 
  Mail, 
  MapPin,
  Clock,
  Truck,
  Palette,
  Image,
  Heart,
  Globe,
  Save,
  Plus,
  Trash2,
  CheckCircle
} from "lucide-react";

interface RestaurantSiteConfigProps {
  onClose?: () => void;
}

export function RestaurantSiteConfig({ onClose }: RestaurantSiteConfigProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const { data: restaurantConfig, isLoading } = useRestaurantConfig();
  const updateConfig = useUpdateRestaurantConfig();
  const createConfig = useCreateRestaurantConfig();
  const activateConfig = useActivateRestaurantConfig();

  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    nameEn: "",
    tagline: "",
    taglineEn: "",
    description: "",
    descriptionEn: "",
    
    // Contact
    phone: "",
    email: "",
    address: {
      street: "",
      postalCode: "",
      city: "",
      country: "Finland"
    },
    socialMedia: {
      facebook: "",
      instagram: "",
      twitter: "",
      tiktok: ""
    },
    
    // Hours
    hours: {
      general: {},
      pickup: {},
      delivery: {}
    },
    
    // Services
    services: {
      hasLunchBuffet: false,
      hasDelivery: true,
      hasPickup: true,
      hasDineIn: true,
      lunchBuffetHours: null
    },
    
    // Delivery Config
    deliveryConfig: {
      zones: [
        { maxDistance: 4, fee: 0.00 },
        { maxDistance: 5, fee: 4.00 },
        { maxDistance: 8, fee: 7.00 },
        { maxDistance: 10, fee: 10.00 }
      ],
      location: { lat: 60.9832, lng: 25.6608 }
    },
    
    // Theme
    theme: {
      // Legacy colors for backward compatibility
      primary: "#8B4513",
      secondary: "#FF8C00",
      accent: "#F5E6D3",
      success: "#16a34a",
      warning: "#ea580c",
      error: "#dc2626",
      background: "#ffffff",
      foreground: "#1f2937",
      
      // Light theme
      light: {
        background: "hsl(0, 0%, 100%)",
        foreground: "hsl(222.2, 84%, 4.9%)",
        card: "hsl(0, 0%, 100%)",
        cardForeground: "hsl(222.2, 84%, 4.9%)",
        popover: "hsl(0, 0%, 100%)",
        popoverForeground: "hsl(222.2, 84%, 4.9%)",
        primary: "#8B4513",
        primaryForeground: "hsl(0, 0%, 98%)",
        secondary: "hsl(210, 40%, 96%)",
        secondaryForeground: "hsl(222.2, 84%, 4.9%)",
        muted: "hsl(210, 40%, 96%)",
        mutedForeground: "hsl(215.4, 16.3%, 46.9%)",
        accent: "#FF8C00",
        accentForeground: "hsl(0, 0%, 98%)",
        destructive: "hsl(0, 84.2%, 60.2%)",
        destructiveForeground: "hsl(0, 0%, 98%)",
        border: "hsl(214.3, 31.8%, 91.4%)",
        input: "hsl(214.3, 31.8%, 91.4%)",
        ring: "#8B4513"
      },
      
      // Dark theme
      dark: {
        background: "hsl(30, 10%, 8%)",
        foreground: "hsl(0, 0%, 98%)",
        card: "hsl(30, 8%, 12%)",
        cardForeground: "hsl(0, 0%, 98%)",
        popover: "hsl(30, 10%, 8%)",
        popoverForeground: "hsl(0, 0%, 98%)",
        primary: "#8B4513",
        primaryForeground: "hsl(0, 0%, 98%)",
        secondary: "hsl(30, 5%, 18%)",
        secondaryForeground: "hsl(0, 0%, 98%)",
        muted: "hsl(30, 5%, 15%)",
        mutedForeground: "hsl(240, 5%, 64.9%)",
        accent: "hsl(30, 5%, 18%)",
        accentForeground: "hsl(0, 0%, 98%)",
        destructive: "hsl(0, 62.8%, 30.6%)",
        destructiveForeground: "hsl(0, 0%, 98%)",
        border: "hsl(30, 5%, 18%)",
        input: "hsl(30, 5%, 18%)",
        ring: "hsl(240, 4.9%, 83.9%)"
      }
    },
    
    // Logo
    logo: {
      icon: "Pizza",
      imageUrl: "",
      showText: true,
      backgroundColor: "#8B4513"
    },
    
    // About
    about: {
      story: "",
      storyEn: "",
      mission: "",
      missionEn: "",
      specialties: [],
      experience: "",
      experienceEn: ""
    },
    
    // Hero
    hero: {
      backgroundImage: "",
      videoUrl: "",
      features: []
    }
  });

  // Load existing config
  useEffect(() => {
    if (restaurantConfig) {
      setFormData({
        name: restaurantConfig.name || "",
        nameEn: restaurantConfig.nameEn || "",
        tagline: restaurantConfig.tagline || "",
        taglineEn: restaurantConfig.taglineEn || "",
        description: restaurantConfig.description || "",
        descriptionEn: restaurantConfig.descriptionEn || "",
        phone: restaurantConfig.phone || "",
        email: restaurantConfig.email || "",
        address: {
          ...formData.address,
          ...(typeof restaurantConfig.address === 'object' && restaurantConfig.address !== null 
            ? restaurantConfig.address 
            : {})
        },
        socialMedia: {
          ...formData.socialMedia,
          ...(typeof restaurantConfig.socialMedia === 'object' && restaurantConfig.socialMedia !== null 
            ? restaurantConfig.socialMedia 
            : {})
        },
        hours: {
          ...formData.hours,
          ...(typeof restaurantConfig.hours === 'object' && restaurantConfig.hours !== null 
            ? restaurantConfig.hours 
            : {})
        },
        services: {
          ...formData.services,
          ...(typeof restaurantConfig.services === 'object' && restaurantConfig.services !== null 
            ? restaurantConfig.services 
            : {})
        },
        deliveryConfig: {
          ...formData.deliveryConfig,
          ...(typeof restaurantConfig.deliveryConfig === 'object' && restaurantConfig.deliveryConfig !== null 
            ? restaurantConfig.deliveryConfig 
            : {})
        },
        theme: {
          ...formData.theme,
          ...(typeof restaurantConfig.theme === 'object' && restaurantConfig.theme !== null 
            ? restaurantConfig.theme 
            : {})
        },
        logo: {
          ...formData.logo,
          ...(typeof restaurantConfig.logo === 'object' && restaurantConfig.logo !== null 
            ? restaurantConfig.logo 
            : {})
        },
        about: {
          ...formData.about,
          ...(typeof restaurantConfig.about === 'object' && restaurantConfig.about !== null 
            ? restaurantConfig.about 
            : {})
        },
        hero: {
          ...formData.hero,
          ...(typeof restaurantConfig.hero === 'object' && restaurantConfig.hero !== null 
            ? restaurantConfig.hero 
            : {})
        },
      });
    }
  }, [restaurantConfig]);

  const handleSave = async () => {
    try {
      const configData = {
        ...formData,
        isActive: true
      };

      if (restaurantConfig?.id) {
        await updateConfig.mutateAsync({ 
          id: restaurantConfig.id, 
          ...configData 
        });
        toast({
          title: "Success",
          description: "Restaurant configuration updated successfully",
        });
      } else {
        await createConfig.mutateAsync(configData);
        toast({
          title: "Success", 
          description: "Restaurant configuration created successfully",
        });
      }
    } catch (error) {
      console.error("Error saving restaurant config:", error);
      toast({
        title: "Error",
        description: "Failed to save restaurant configuration",
        variant: "destructive",
      });
    }
  };

  const generateDayHours = (defaultOpen = "10:30", defaultClose = "10:29") => {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const hours = {};
    days.forEach(day => {
      hours[day] = { open: defaultOpen, close: defaultClose, closed: false };
    });
    return hours;
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6" />
            Restaurant Site Configuration
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateConfig.isPending || createConfig.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </div>
        {restaurantConfig && (
          <Badge variant="secondary" className="w-fit">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active Configuration
          </Badge>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="delivery">Delivery</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name (Finnish)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tirvan Kahvila"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Restaurant Name (English)</Label>
                <Input
                  id="nameEn"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="Tirvan Kahvila"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline (Finnish)</Label>
                <Input
                  id="tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="Laadukkaita aterioita Lahden sydämessä"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taglineEn">Tagline (English)</Label>
                <Input
                  id="taglineEn"
                  value={formData.taglineEn}
                  onChange={(e) => setFormData({ ...formData, taglineEn: e.target.value })}
                  placeholder="Quality meals in the heart of Lahti"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description (Finnish)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tirvan Kahvilassa tarjoamme laadukkaita aterioita..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Textarea
                  id="descriptionEn"
                  value={formData.descriptionEn}
                  onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                  placeholder="At Tirvan Kahvila we offer quality meals..."
                  rows={3}
                />
              </div>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+35835899089"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@tirvankahvila.fi"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, street: e.target.value }
                    })}
                    placeholder="Pasintie 2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={formData.address.postalCode}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, postalCode: e.target.value }
                    })}
                    placeholder="45410"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, city: e.target.value }
                    })}
                    placeholder="Lahti"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      address: { ...formData.address, country: e.target.value }
                    })}
                    placeholder="Finland"
                  />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Social Media</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook URL</Label>
                  <Input
                    id="facebook"
                    value={formData.socialMedia.facebook}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialMedia: { ...formData.socialMedia, facebook: e.target.value }
                    })}
                    placeholder="https://www.facebook.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram URL</Label>
                  <Input
                    id="instagram"
                    value={formData.socialMedia.instagram}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialMedia: { ...formData.socialMedia, instagram: e.target.value }
                    })}
                    placeholder="https://www.instagram.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter URL</Label>
                  <Input
                    id="twitter"
                    value={formData.socialMedia.twitter}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialMedia: { ...formData.socialMedia, twitter: e.target.value }
                    })}
                    placeholder="https://twitter.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok URL</Label>
                  <Input
                    id="tiktok"
                    value={formData.socialMedia.tiktok || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      socialMedia: { ...formData.socialMedia, tiktok: e.target.value }
                    })}
                    placeholder="https://www.tiktok.com/@..."
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Business Hours</h3>
                <Button 
                  onClick={() => {
                    const defaultHours = generateDayHours("10:30", "10:29");
                    setFormData({
                      ...formData,
                      hours: {
                        general: defaultHours,
                        pickup: defaultHours,
                        delivery: defaultHours
                      }
                    });
                  }}
                  variant="outline"
                  size="sm"
                >
                  Set Default Hours
                </Button>
              </div>
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                Configure opening hours for different services. These will be used to determine when orders can be placed.
                Each service can have different operating hours.
              </div>

              {/* Hours Configuration */}
              <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General Hours</TabsTrigger>
                  <TabsTrigger value="pickup">Pickup Hours</TabsTrigger>
                  <TabsTrigger value="delivery">Delivery Hours</TabsTrigger>
                </TabsList>

                {/* General Hours */}
                <TabsContent value="general" className="space-y-4">
                  <h4 className="font-medium">General Operating Hours</h4>
                  <div className="space-y-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="w-20 font-medium capitalize">{day}</div>
                        <Switch
                          checked={!formData.hours.general?.[day]?.closed}
                          onCheckedChange={(checked) => {
                            const newHours = { ...formData.hours };
                            if (!newHours.general) newHours.general = {};
                            if (!newHours.general[day]) newHours.general[day] = { open: "10:30", close: "10:29", closed: true };
                            newHours.general[day].closed = !checked;
                            setFormData({ ...formData, hours: newHours });
                          }}
                        />
                        <span className="text-sm text-gray-600 w-16">
                          {formData.hours.general?.[day]?.closed ? 'Closed' : 'Open'}
                        </span>
                        {!formData.hours.general?.[day]?.closed && (
                          <>
                            <Input
                              type="time"
                              value={formData.hours.general?.[day]?.open || "10:30"}
                              onChange={(e) => {
                                const newHours = { ...formData.hours };
                                if (!newHours.general) newHours.general = {};
                                if (!newHours.general[day]) newHours.general[day] = { open: "10:30", close: "10:29", closed: false };
                                newHours.general[day].open = e.target.value;
                                setFormData({ ...formData, hours: newHours });
                              }}
                              className="w-24"
                            />
                            <span className="text-gray-400">to</span>
                            <Input
                              type="time"
                              value={formData.hours.general?.[day]?.close || "10:29"}
                              onChange={(e) => {
                                const newHours = { ...formData.hours };
                                if (!newHours.general) newHours.general = {};
                                if (!newHours.general[day]) newHours.general[day] = { open: "10:30", close: "10:29", closed: false };
                                newHours.general[day].close = e.target.value;
                                setFormData({ ...formData, hours: newHours });
                              }}
                              className="w-24"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Pickup Hours */}
                <TabsContent value="pickup" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Pickup Service Hours</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newHours = { ...formData.hours };
                        newHours.pickup = { ...newHours.general };
                        setFormData({ ...formData, hours: newHours });
                      }}
                    >
                      Copy from General
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="w-20 font-medium capitalize">{day}</div>
                        <Switch
                          checked={!formData.hours.pickup?.[day]?.closed}
                          onCheckedChange={(checked) => {
                            const newHours = { ...formData.hours };
                            if (!newHours.pickup) newHours.pickup = {};
                            if (!newHours.pickup[day]) newHours.pickup[day] = { open: "10:30", close: "10:29", closed: true };
                            newHours.pickup[day].closed = !checked;
                            setFormData({ ...formData, hours: newHours });
                          }}
                        />
                        <span className="text-sm text-gray-600 w-16">
                          {formData.hours.pickup?.[day]?.closed ? 'Closed' : 'Open'}
                        </span>
                        {!formData.hours.pickup?.[day]?.closed && (
                          <>
                            <Input
                              type="time"
                              value={formData.hours.pickup?.[day]?.open || "10:30"}
                              onChange={(e) => {
                                const newHours = { ...formData.hours };
                                if (!newHours.pickup) newHours.pickup = {};
                                if (!newHours.pickup[day]) newHours.pickup[day] = { open: "10:30", close: "10:29", closed: false };
                                newHours.pickup[day].open = e.target.value;
                                setFormData({ ...formData, hours: newHours });
                              }}
                              className="w-24"
                            />
                            <span className="text-gray-400">to</span>
                            <Input
                              type="time"
                              value={formData.hours.pickup?.[day]?.close || "10:29"}
                              onChange={(e) => {
                                const newHours = { ...formData.hours };
                                if (!newHours.pickup) newHours.pickup = {};
                                if (!newHours.pickup[day]) newHours.pickup[day] = { open: "10:30", close: "10:29", closed: false };
                                newHours.pickup[day].close = e.target.value;
                                setFormData({ ...formData, hours: newHours });
                              }}
                              className="w-24"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Delivery Hours */}
                <TabsContent value="delivery" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Delivery Service Hours</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newHours = { ...formData.hours };
                        newHours.delivery = { ...newHours.general };
                        setFormData({ ...formData, hours: newHours });
                      }}
                    >
                      Copy from General
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                        <div className="w-20 font-medium capitalize">{day}</div>
                        <Switch
                          checked={!formData.hours.delivery?.[day]?.closed}
                          onCheckedChange={(checked) => {
                            const newHours = { ...formData.hours };
                            if (!newHours.delivery) newHours.delivery = {};
                            if (!newHours.delivery[day]) newHours.delivery[day] = { open: "10:30", close: "10:29", closed: true };
                            newHours.delivery[day].closed = !checked;
                            setFormData({ ...formData, hours: newHours });
                          }}
                        />
                        <span className="text-sm text-gray-600 w-16">
                          {formData.hours.delivery?.[day]?.closed ? 'Closed' : 'Open'}
                        </span>
                        {!formData.hours.delivery?.[day]?.closed && (
                          <>
                            <Input
                              type="time"
                              value={formData.hours.delivery?.[day]?.open || "10:30"}
                              onChange={(e) => {
                                const newHours = { ...formData.hours };
                                if (!newHours.delivery) newHours.delivery = {};
                                if (!newHours.delivery[day]) newHours.delivery[day] = { open: "10:30", close: "10:29", closed: false };
                                newHours.delivery[day].open = e.target.value;
                                setFormData({ ...formData, hours: newHours });
                              }}
                              className="w-24"
                            />
                            <span className="text-gray-400">to</span>
                            <Input
                              type="time"
                              value={formData.hours.delivery?.[day]?.close || "10:29"}
                              onChange={(e) => {
                                const newHours = { ...formData.hours };
                                if (!newHours.delivery) newHours.delivery = {};
                                if (!newHours.delivery[day]) newHours.delivery[day] = { open: "10:30", close: "10:29", closed: false };
                                newHours.delivery[day].close = e.target.value;
                                setFormData({ ...formData, hours: newHours });
                              }}
                              className="w-24"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Delivery Tab */}
          <TabsContent value="delivery" className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Options</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hasDelivery"
                    checked={formData.services.hasDelivery}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      services: { ...formData.services, hasDelivery: checked }
                    })}
                  />
                  <Label htmlFor="hasDelivery">Delivery</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hasPickup"
                    checked={formData.services.hasPickup}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      services: { ...formData.services, hasPickup: checked }
                    })}
                  />
                  <Label htmlFor="hasPickup">Pickup</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hasDineIn"
                    checked={formData.services.hasDineIn}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      services: { ...formData.services, hasDineIn: checked }
                    })}
                  />
                  <Label htmlFor="hasDineIn">Dine In</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hasLunchBuffet"
                    checked={formData.services.hasLunchBuffet}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      services: { ...formData.services, hasLunchBuffet: checked }
                    })}
                  />
                  <Label htmlFor="hasLunchBuffet">Lunch Buffet</Label>
                </div>
              </div>

              {/* Delivery Zones */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold">Delivery Zones</h4>
                <div className="space-y-2">
                  {formData.deliveryConfig.zones.map((zone, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <Label>Max Distance (km)</Label>
                        <Input
                          type="number"
                          value={zone.maxDistance}
                          onChange={(e) => {
                            const newZones = [...formData.deliveryConfig.zones];
                            newZones[index] = { ...zone, maxDistance: parseFloat(e.target.value) };
                            setFormData({
                              ...formData,
                              deliveryConfig: { ...formData.deliveryConfig, zones: newZones }
                            });
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Delivery Fee (€)</Label>
                        <Input
                          type="number"
                          step="0.50"
                          value={zone.fee}
                          onChange={(e) => {
                            const newZones = [...formData.deliveryConfig.zones];
                            newZones[index] = { ...zone, fee: parseFloat(e.target.value) };
                            setFormData({
                              ...formData,
                              deliveryConfig: { ...formData.deliveryConfig, zones: newZones }
                            });
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newZones = formData.deliveryConfig.zones.filter((_, i) => i !== index);
                          setFormData({
                            ...formData,
                            deliveryConfig: { ...formData.deliveryConfig, zones: newZones }
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={() => {
                    const newZones = [...formData.deliveryConfig.zones, { maxDistance: 5, fee: 5.00 }];
                    setFormData({
                      ...formData,
                      deliveryConfig: { ...formData.deliveryConfig, zones: newZones }
                    });
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Delivery Zone
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Brand Colors & Theme</h3>
                <Badge variant="outline">Complete Theme System</Badge>
              </div>
              
              {/* Primary Brand Colors */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-700">Primary Brand Colors</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={formData.theme.primary}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { 
                            ...formData.theme, 
                            primary: e.target.value,
                            light: { ...formData.theme.light, primary: e.target.value },
                            dark: { ...formData.theme.dark, primary: e.target.value }
                          }
                        })}
                        className="w-16 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.theme.primary}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { 
                            ...formData.theme, 
                            primary: e.target.value,
                            light: { ...formData.theme.light, primary: e.target.value },
                            dark: { ...formData.theme.dark, primary: e.target.value }
                          }
                        })}
                        placeholder="#8B4513"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={formData.theme.secondary}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { 
                            ...formData.theme, 
                            secondary: e.target.value
                          }
                        })}
                        className="w-16 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.theme.secondary}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { ...formData.theme, secondary: e.target.value }
                        })}
                        placeholder="#FF8C00"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={formData.theme.accent}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { 
                            ...formData.theme, 
                            accent: e.target.value,
                            light: { ...formData.theme.light, accent: e.target.value }
                          }
                        })}
                        className="w-16 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.theme.accent}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { 
                            ...formData.theme, 
                            accent: e.target.value,
                            light: { ...formData.theme.light, accent: e.target.value }
                          }
                        })}
                        placeholder="#F5E6D3"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="successColor">Success Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="successColor"
                        type="color"
                        value={formData.theme.success}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { ...formData.theme, success: e.target.value }
                        })}
                        className="w-16 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.theme.success}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { ...formData.theme, success: e.target.value }
                        })}
                        placeholder="#16a34a"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Colors */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-700">Status Colors</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="warningColor">Warning Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="warningColor"
                        type="color"
                        value={formData.theme.warning}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { ...formData.theme, warning: e.target.value }
                        })}
                        className="w-16 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.theme.warning}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { ...formData.theme, warning: e.target.value }
                        })}
                        placeholder="#ea580c"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="errorColor">Error Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="errorColor"
                        type="color"
                        value={formData.theme.error}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { ...formData.theme, error: e.target.value }
                        })}
                        className="w-16 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.theme.error}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { ...formData.theme, error: e.target.value }
                        })}
                        placeholder="#dc2626"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backgroundLight">Background (Light)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="backgroundLight"
                        type="color"
                        value={formData.theme.background}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { 
                            ...formData.theme, 
                            background: e.target.value,
                            light: { ...formData.theme.light, background: `hsl(0, 0%, ${e.target.value === '#ffffff' ? '100%' : '95%'})` }
                          }
                        })}
                        className="w-16 h-10 p-1 rounded"
                      />
                      <Input
                        value={formData.theme.background}
                        onChange={(e) => setFormData({
                          ...formData,
                          theme: { 
                            ...formData.theme, 
                            background: e.target.value,
                            light: { ...formData.theme.light, background: e.target.value }
                          }
                        })}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Preview */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-700">Theme Preview</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Theme Preview */}
                  <div className="p-4 border rounded-lg" style={{ backgroundColor: formData.theme.background }}>
                    <h5 className="font-medium mb-3" style={{ color: formData.theme.foreground }}>Light Theme</h5>
                    <div className="space-y-2">
                      <div 
                        className="px-3 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.theme.primary }}
                      >
                        Primary Button
                      </div>
                      <div 
                        className="px-3 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.theme.secondary }}
                      >
                        Secondary Button
                      </div>
                      <div 
                        className="px-3 py-2 rounded text-gray-800 text-sm"
                        style={{ backgroundColor: formData.theme.accent }}
                      >
                        Accent Background
                      </div>
                      <div 
                        className="px-3 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.theme.success }}
                      >
                        Success Status
                      </div>
                    </div>
                  </div>

                  {/* Dark Theme Preview */}
                  <div className="p-4 border rounded-lg bg-gray-900 text-white">
                    <h5 className="font-medium mb-3">Dark Theme</h5>
                    <div className="space-y-2">
                      <div 
                        className="px-3 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.theme.primary }}
                      >
                        Primary Button
                      </div>
                      <div 
                        className="px-3 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.theme.secondary }}
                      >
                        Secondary Button
                      </div>
                      <div 
                        className="px-3 py-2 rounded text-gray-800 text-sm"
                        style={{ backgroundColor: formData.theme.accent }}
                      >
                        Accent Background
                      </div>
                      <div 
                        className="px-3 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: formData.theme.success }}
                      >
                        Success Status
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Theme Settings */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-700">Advanced Theme Settings</h4>
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  <strong>Note:</strong> The theme system includes both legacy colors (for backward compatibility) and modern light/dark theme definitions. 
                  Changes to primary colors will automatically update both light and dark themes.
                </div>
              </div>

              {/* Logo Configuration */}
              <div className="space-y-4">
                <h4 className="text-md font-semibold">Logo Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="logoIcon">Logo Icon</Label>
                    <Input
                      id="logoIcon"
                      value={formData.logo.icon}
                      onChange={(e) => setFormData({
                        ...formData,
                        logo: { ...formData.logo, icon: e.target.value }
                      })}
                      placeholder="Pizza"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoImageUrl">Logo Image URL</Label>
                    <Input
                      id="logoImageUrl"
                      value={formData.logo.imageUrl}
                      onChange={(e) => setFormData({
                        ...formData,
                        logo: { ...formData.logo, imageUrl: e.target.value }
                      })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showLogoText"
                    checked={formData.logo.showText}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      logo: { ...formData.logo, showText: checked }
                    })}
                  />
                  <Label htmlFor="showLogoText">Show Restaurant Name with Logo</Label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-6">
              {/* About Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">About Section</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="story">Story (Finnish)</Label>
                    <Textarea
                      id="story"
                      value={formData.about.story}
                      onChange={(e) => setFormData({
                        ...formData,
                        about: { ...formData.about, story: e.target.value }
                      })}
                      placeholder="Tell your restaurant's story..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storyEn">Story (English)</Label>
                    <Textarea
                      id="storyEn"
                      value={formData.about.storyEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        about: { ...formData.about, storyEn: e.target.value }
                      })}
                      placeholder="Tell your restaurant's story in English..."
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mission">Mission (Finnish)</Label>
                    <Textarea
                      id="mission"
                      value={formData.about.mission}
                      onChange={(e) => setFormData({
                        ...formData,
                        about: { ...formData.about, mission: e.target.value }
                      })}
                      placeholder="What's your mission..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="missionEn">Mission (English)</Label>
                    <Textarea
                      id="missionEn"
                      value={formData.about.missionEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        about: { ...formData.about, missionEn: e.target.value }
                      })}
                      placeholder="What's your mission in English..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Hero Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Hero Section</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroImage">Background Image URL</Label>
                    <Input
                      id="heroImage"
                      value={formData.hero.backgroundImage}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, backgroundImage: e.target.value }
                      })}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heroVideo">Video URL (optional)</Label>
                    <Input
                      id="heroVideo"
                      value={formData.hero.videoUrl}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: { ...formData.hero, videoUrl: e.target.value }
                      })}
                      placeholder="https://videos.pexels.com/..."
                    />
                  </div>
                </div>
              </div>

              {/* Specialties Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Restaurant Specialties</h3>
                  <Button
                    onClick={() => {
                      const newSpecialty = {
                        title: "",
                        titleEn: "",
                        description: "",
                        descriptionEn: "",
                        icon: "Pizza"
                      };
                      setFormData({
                        ...formData,
                        about: {
                          ...formData.about,
                          specialties: [...(formData.about.specialties || []), newSpecialty]
                        }
                      });
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Specialty
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.about.specialties?.map((specialty, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium">Specialty {index + 1}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newSpecialties = formData.about.specialties?.filter((_, i) => i !== index);
                            setFormData({
                              ...formData,
                              about: { ...formData.about, specialties: newSpecialties }
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Title (Finnish)</Label>
                          <Input
                            value={specialty.title}
                            onChange={(e) => {
                              const newSpecialties = [...(formData.about.specialties || [])];
                              newSpecialties[index] = { ...specialty, title: e.target.value };
                              setFormData({
                                ...formData,
                                about: { ...formData.about, specialties: newSpecialties }
                              });
                            }}
                            placeholder="Premium Pizzat"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Title (English)</Label>
                          <Input
                            value={specialty.titleEn}
                            onChange={(e) => {
                              const newSpecialties = [...(formData.about.specialties || [])];
                              newSpecialties[index] = { ...specialty, titleEn: e.target.value };
                              setFormData({
                                ...formData,
                                about: { ...formData.about, specialties: newSpecialties }
                              });
                            }}
                            placeholder="Premium Pizzas"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (Finnish)</Label>
                          <Textarea
                            value={specialty.description}
                            onChange={(e) => {
                              const newSpecialties = [...(formData.about.specialties || [])];
                              newSpecialties[index] = { ...specialty, description: e.target.value };
                              setFormData({
                                ...formData,
                                about: { ...formData.about, specialties: newSpecialties }
                              });
                            }}
                            placeholder="Huippulaadukkaita pizzoja tuoreista aineksista"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description (English)</Label>
                          <Textarea
                            value={specialty.descriptionEn}
                            onChange={(e) => {
                              const newSpecialties = [...(formData.about.specialties || [])];
                              newSpecialties[index] = { ...specialty, descriptionEn: e.target.value };
                              setFormData({
                                ...formData,
                                about: { ...formData.about, specialties: newSpecialties }
                              });
                            }}
                            placeholder="Premium quality pizzas made from fresh ingredients"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Icon Name</Label>
                          <Input
                            value={specialty.icon}
                            onChange={(e) => {
                              const newSpecialties = [...(formData.about.specialties || [])];
                              newSpecialties[index] = { ...specialty, icon: e.target.value };
                              setFormData({
                                ...formData,
                                about: { ...formData.about, specialties: newSpecialties }
                              });
                            }}
                            placeholder="Pizza"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {(!formData.about.specialties || formData.about.specialties.length === 0) && (
                    <div className="text-center p-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="space-y-2">
                        <Heart className="w-12 h-12 mx-auto text-gray-400" />
                        <p>No specialties added yet</p>
                        <p className="text-sm">Add your restaurant's signature dishes and specialties</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Experience Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Experience Description</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Experience (Finnish)</Label>
                    <Input
                      id="experience"
                      value={formData.about.experience}
                      onChange={(e) => setFormData({
                        ...formData,
                        about: { ...formData.about, experience: e.target.value }
                      })}
                      placeholder="Laadukasta ruokaa Lahdessa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experienceEn">Experience (English)</Label>
                    <Input
                      id="experienceEn"
                      value={formData.about.experienceEn}
                      onChange={(e) => setFormData({
                        ...formData,
                        about: { ...formData.about, experienceEn: e.target.value }
                      })}
                      placeholder="Quality food in Lahti"
                    />
                  </div>
                </div>
              </div>

              {/* Hero Features */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Hero Features</h3>
                  <Button
                    onClick={() => {
                      const newFeature = {
                        title: "",
                        titleEn: "",
                        color: "#FF8C00"
                      };
                      setFormData({
                        ...formData,
                        hero: {
                          ...formData.hero,
                          features: [...(formData.hero.features || []), newFeature]
                        }
                      });
                    }}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Feature
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.hero.features?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <Input
                        value={feature.title}
                        onChange={(e) => {
                          const newFeatures = [...(formData.hero.features || [])];
                          newFeatures[index] = { ...feature, title: e.target.value };
                          setFormData({
                            ...formData,
                            hero: { ...formData.hero, features: newFeatures }
                          });
                        }}
                        placeholder="Premium pizzat"
                        className="flex-1"
                      />
                      <Input
                        value={feature.titleEn}
                        onChange={(e) => {
                          const newFeatures = [...(formData.hero.features || [])];
                          newFeatures[index] = { ...feature, titleEn: e.target.value };
                          setFormData({
                            ...formData,
                            hero: { ...formData.hero, features: newFeatures }
                          });
                        }}
                        placeholder="Premium pizzas"
                        className="flex-1"
                      />
                      <Input
                        type="color"
                        value={feature.color}
                        onChange={(e) => {
                          const newFeatures = [...(formData.hero.features || [])];
                          newFeatures[index] = { ...feature, color: e.target.value };
                          setFormData({
                            ...formData,
                            hero: { ...formData.hero, features: newFeatures }
                          });
                        }}
                        className="w-16"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newFeatures = formData.hero.features?.filter((_, i) => i !== index);
                          setFormData({
                            ...formData,
                            hero: { ...formData.hero, features: newFeatures }
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}