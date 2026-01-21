import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useRestaurantConfig, useUpdateRestaurantConfig } from "@/hooks/use-restaurant-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Palette,
  Layout,
  Save,
  Eye,
  Check,
  Home,
  Menu as MenuIcon,
  Info,
  ShoppingCart,
  CreditCard,
  LayoutTemplate,
  Navigation,
  Footprints,
  Loader2,
  Monitor,
  RefreshCw,
  Sun,
  Moon
} from "lucide-react";

interface ThemeLayoutSettingsProps {
  onClose?: () => void;
}

type LayoutVariant = 'variant1' | 'variant2' | 'variant3';
type PageType = 'home' | 'menu' | 'about' | 'header' | 'footer' | 'cart' | 'checkout';

interface PageLayoutVariants {
  home: LayoutVariant;
  menu: LayoutVariant;
  about: LayoutVariant;
  header: LayoutVariant;
  footer: LayoutVariant;
  cart: LayoutVariant;
  checkout: LayoutVariant;
}

interface LayoutOption {
  id: LayoutVariant;
  name: string;
  description: string;
  thumbnail: string;
  features: string[];
}

const layoutOptions: Record<PageType, LayoutOption[]> = {
  home: [
    {
      id: 'variant1',
      name: 'Modern Gradient',
      description: 'Bold gradients with large hero section and animated cards',
      thumbnail: '🎨',
      features: ['Large hero with video', 'Animated gradient cards', 'Featured items showcase']
    },
    {
      id: 'variant2',
      name: 'Minimalist Clean',
      description: 'Clean white space with subtle shadows and elegant typography',
      thumbnail: '✨',
      features: ['Minimal design', 'Subtle animations', 'Focus on content']
    },
    {
      id: 'variant3',
      name: 'Classic Restaurant',
      description: 'Traditional restaurant layout with warm colors and classic fonts',
      thumbnail: '🍽️',
      features: ['Warm color palette', 'Classic typography', 'Traditional layout']
    }
  ],
  menu: [
    {
      id: 'variant1',
      name: 'Grid View',
      description: 'Modern card-based grid layout with large images',
      thumbnail: '📱',
      features: ['Card-based layout', 'Large images', 'Quick add to cart']
    },
    {
      id: 'variant2',
      name: 'List View',
      description: 'Compact list layout showing more items at once',
      thumbnail: '📋',
      features: ['Compact design', 'More items visible', 'Detailed descriptions']
    },
    {
      id: 'variant3',
      name: 'Magazine Style',
      description: 'Editorial layout with featured items and sections',
      thumbnail: '📰',
      features: ['Featured sections', 'Editorial design', 'Rich content']
    }
  ],
  about: [
    {
      id: 'variant1',
      name: 'Story Focus',
      description: 'Narrative-driven layout highlighting restaurant story',
      thumbnail: '📖',
      features: ['Story sections', 'Timeline view', 'Team showcase']
    },
    {
      id: 'variant2',
      name: 'Visual Gallery',
      description: 'Image-heavy layout with photo galleries',
      thumbnail: '🖼️',
      features: ['Photo gallery', 'Visual storytelling', 'Image focus']
    },
    {
      id: 'variant3',
      name: 'Info Cards',
      description: 'Card-based information layout with icons',
      thumbnail: '💳',
      features: ['Info cards', 'Icon-based', 'Quick facts']
    }
  ],
  header: [
    {
      id: 'variant1',
      name: 'Sticky Navigation',
      description: 'Modern sticky header with transparent background',
      thumbnail: '📍',
      features: ['Sticky position', 'Transparent bg', 'Smooth scroll']
    },
    {
      id: 'variant2',
      name: 'Classic Top Bar',
      description: 'Traditional top navigation bar with solid background',
      thumbnail: '📏',
      features: ['Fixed position', 'Solid background', 'Classic style']
    },
    {
      id: 'variant3',
      name: 'Mega Menu',
      description: 'Large dropdown menu with categories and previews',
      thumbnail: '📋',
      features: ['Mega dropdown', 'Category preview', 'Rich content']
    }
  ],
  footer: [
    {
      id: 'variant1',
      name: 'Multi-Column',
      description: 'Modern multi-column footer with social links',
      thumbnail: '📊',
      features: ['Multiple columns', 'Social media', 'Newsletter signup']
    },
    {
      id: 'variant2',
      name: 'Minimal Simple',
      description: 'Simple centered footer with essential links',
      thumbnail: '➖',
      features: ['Centered layout', 'Minimal design', 'Essential links']
    },
    {
      id: 'variant3',
      name: 'Rich Content',
      description: 'Detailed footer with maps, hours, and contact info',
      thumbnail: '🗺️',
      features: ['Location map', 'Opening hours', 'Contact details']
    }
  ],
  cart: [
    {
      id: 'variant1',
      name: 'Side Panel',
      description: 'Modern slide-in panel from right side',
      thumbnail: '📱',
      features: ['Slide animation', 'Quick checkout', 'Item preview']
    },
    {
      id: 'variant2',
      name: 'Modal Overlay',
      description: 'Centered modal with detailed item view',
      thumbnail: '🔲',
      features: ['Center modal', 'Detailed view', 'Easy editing']
    },
    {
      id: 'variant3',
      name: 'Full Page',
      description: 'Dedicated full page cart experience',
      thumbnail: '📄',
      features: ['Full page', 'Spacious layout', 'Rich details']
    }
  ],
  checkout: [
    {
      id: 'variant1',
      name: 'Single Step',
      description: 'All checkout info on one scrollable page',
      thumbnail: '1️⃣',
      features: ['Single page', 'Easy scroll', 'Quick checkout']
    },
    {
      id: 'variant2',
      name: 'Multi-Step Wizard',
      description: 'Step-by-step checkout process with progress',
      thumbnail: '🎯',
      features: ['Step wizard', 'Progress bar', 'Guided flow']
    },
    {
      id: 'variant3',
      name: 'Split View',
      description: 'Two-column layout with cart summary sidebar',
      thumbnail: '📑',
      features: ['Two columns', 'Cart summary', 'Visual balance']
    }
  ]
};

const pageIcons: Record<PageType, React.ReactNode> = {
  home: <Home className="w-5 h-5" />,
  menu: <MenuIcon className="w-5 h-5" />,
  about: <Info className="w-5 h-5" />,
  header: <Navigation className="w-5 h-5" />,
  footer: <Footprints className="w-5 h-5" />,
  cart: <ShoppingCart className="w-5 h-5" />,
  checkout: <CreditCard className="w-5 h-5" />
};

const pageNames: Record<PageType, string> = {
  home: 'Home Page',
  menu: 'Menu Page',
  about: 'About Page',
  header: 'Header',
  footer: 'Footer',
  cart: 'Shopping Cart',
  checkout: 'Checkout'
};

export function ThemeLayoutSettings({ onClose }: ThemeLayoutSettingsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: restaurantConfig, isLoading } = useRestaurantConfig();
  const updateConfig = useUpdateRestaurantConfig();

  const [isSaving, setIsSaving] = useState(false);
  const [previewPage, setPreviewPage] = useState<PageType | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<PageLayoutVariants>({
    home: 'variant1',
    menu: 'variant1',
    about: 'variant1',
    header: 'variant1',
    footer: 'variant1',
    cart: 'variant1',
    checkout: 'variant1'
  });

  // Color theme state with light/dark mode support
  const [themeColors, setThemeColors] = useState({
    primary: "#8B4513",
    secondary: "#FF8C00",
    accent: "#F5E6D3",
    success: "#16a34a",
    warning: "#ea580c",
    error: "#dc2626",
    background: "#ffffff",
    foreground: "#1f2937"
  });

  // Font selection state
  const [selectedFont, setSelectedFont] = useState({
    heading: "Inter",
    body: "Inter"
  });

  // Popular Google Fonts list
  const googleFonts = [
    "Inter",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Poppins",
    "Raleway",
    "Nunito",
    "Playfair Display",
    "Merriweather",
    "Source Sans Pro",
    "PT Sans",
    "Ubuntu",
    "Noto Sans",
    "Oswald"
  ];

  // Load existing config
  useEffect(() => {
    if (restaurantConfig) {
      const pageLayoutVariants = typeof restaurantConfig.pageLayoutVariants === 'object' && restaurantConfig.pageLayoutVariants !== null
        ? restaurantConfig.pageLayoutVariants as PageLayoutVariants
        : {
            home: 'variant1' as LayoutVariant,
            menu: 'variant1' as LayoutVariant,
            about: 'variant1' as LayoutVariant,
            header: 'variant1' as LayoutVariant,
            footer: 'variant1' as LayoutVariant,
            cart: 'variant1' as LayoutVariant,
            checkout: 'variant1' as LayoutVariant
          };
      
      setSelectedVariants(pageLayoutVariants);

      if (typeof restaurantConfig.theme === 'object' && restaurantConfig.theme !== null) {
        const theme = restaurantConfig.theme as any;
        setThemeColors({
          primary: theme.primary || "#8B4513",
          secondary: theme.secondary || "#FF8C00",
          accent: theme.accent || "#F5E6D3",
          success: theme.success || "#16a34a",
          warning: theme.warning || "#ea580c",
          error: theme.error || "#dc2626",
          background: theme.background || "#ffffff",
          foreground: theme.foreground || "#1f2937"
        });
        
        // Load font settings
        if (theme.fonts) {
          setSelectedFont({
            heading: theme.fonts.heading || "Inter",
            body: theme.fonts.body || "Inter"
          });
        }
      }
    }
  }, [restaurantConfig]);

  const handleVariantSelect = (page: PageType, variant: LayoutVariant) => {
    setSelectedVariants(prev => ({
      ...prev,
      [page]: variant
    }));
  };

  const handleSave = async () => {
    if (!restaurantConfig) return;

    setIsSaving(true);
    try {
      // Get existing theme to preserve all properties
      const existingTheme = typeof restaurantConfig.theme === 'object' && restaurantConfig.theme !== null
        ? restaurantConfig.theme as any
        : {};

      // Build updated theme preserving existing light/dark mode properties
      const updatedTheme = {
        ...existingTheme,
        // Update base colors
        primary: themeColors.primary,
        secondary: themeColors.secondary,
        accent: themeColors.accent,
        success: themeColors.success,
        warning: themeColors.warning,
        error: themeColors.error,
        background: themeColors.background,
        foreground: themeColors.foreground,
        fonts: selectedFont,
        // Preserve existing light mode colors but update the base colors
        light: {
          ...(existingTheme.light || {}),
          primary: themeColors.primary,
          secondary: existingTheme.light?.secondary || themeColors.accent,
          accent: existingTheme.light?.accent || themeColors.accent,
          success: themeColors.success,
          warning: themeColors.warning,
          error: themeColors.error,
          background: themeColors.background,
          foreground: themeColors.foreground,
        },
        // Preserve existing dark mode colors but update the primary
        dark: {
          ...(existingTheme.dark || {}),
          primary: existingTheme.dark?.primary || themeColors.primary,
          success: themeColors.success,
          warning: themeColors.warning,
          error: themeColors.error,
        }
      };

      await updateConfig.mutateAsync({
        id: restaurantConfig.id,
        pageLayoutVariants: selectedVariants,
        theme: updatedTheme,
        isActive: true // Ensure config stays active after update
      });

      toast({
        title: "Settings Saved",
        description: "Theme and layout settings have been updated successfully",
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Palette className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Theme & Layout Settings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Customize your website's appearance and page layouts</p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="layouts" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="layouts" className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Page Layouts
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Color Theme
          </TabsTrigger>
        </TabsList>

        {/* Page Layouts Tab */}
        <TabsContent value="layouts" className="space-y-6">
          {(Object.keys(pageNames) as PageType[]).map((page) => (
            <Card key={page} className="border-2 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                      {pageIcons[page]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pageNames[page]}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred layout style</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedVariants[page]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {layoutOptions[page].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleVariantSelect(page, option.id)}
                      className={`
                        relative p-4 rounded-xl border-2 text-left transition-all
                        ${selectedVariants[page] === option.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg scale-105'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:shadow-md'
                        }
                      `}
                    >
                      {/* Selection Indicator */}
                      {selectedVariants[page] === option.id && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}

                      {/* Thumbnail */}
                      <div className="text-4xl mb-3 text-center">{option.thumbnail}</div>
                      
                      {/* Name & Description */}
                      <h4 className="font-bold text-gray-900 dark:text-white mb-1">{option.name}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{option.description}</p>
                      
                      {/* Features */}
                      <div className="space-y-1">
                        {option.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                            {feature}
                          </div>
                        ))}
                      </div>

                      {/* Preview Button */}
                      <div
                        className="w-full mt-3 flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPage(page);
                        }}
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Color Theme Tab */}
        <TabsContent value="colors" className="space-y-6">
          {/* Font Selection Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5" />
                Typography & Fonts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="heading-font">Heading Font</Label>
                  <select
                    id="heading-font"
                    value={selectedFont.heading}
                    onChange={(e) => setSelectedFont(prev => ({ ...prev, heading: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {googleFonts.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Used for headings, titles, and hero text
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body-font">Body Font</Label>
                  <select
                    id="body-font"
                    value={selectedFont.body}
                    onChange={(e) => setSelectedFont(prev => ({ ...prev, body: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {googleFonts.map(font => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Used for body text, descriptions, and paragraphs
                  </p>
                </div>
              </div>

              {/* Font Preview */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <div className="space-y-4">
                  <div>
                    <h3 
                      className="text-3xl font-bold mb-2" 
                      style={{ fontFamily: selectedFont.heading }}
                    >
                      This is a Heading
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Font: {selectedFont.heading}</p>
                  </div>
                  <div>
                    <p 
                      className="text-base leading-relaxed" 
                      style={{ fontFamily: selectedFont.body }}
                    >
                      This is body text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                      Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Font: {selectedFont.body}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Color Palette Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Color Palette
              </CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Customize your website colors. These colors work in both light and dark modes.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(themeColors).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize flex items-center gap-2">
                      <div 
                        className="w-6 h-6 rounded border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: value }}
                      />
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={value}
                        onChange={(e) => setThemeColors(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-16 h-10 cursor-pointer p-1"
                      />
                      <Input
                        type="text"
                        value={value}
                        onChange={(e) => setThemeColors(prev => ({ ...prev, [key]: e.target.value }))}
                        className="flex-1 font-mono text-sm"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Color Preview - Light & Dark Mode */}
              <div className="mt-8 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Light Mode Preview */}
                  <div className="p-6 rounded-xl bg-white border-2 border-gray-200">
                    <h5 className="text-xs font-medium text-gray-600 mb-4 flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Light Mode
                    </h5>
                    <div className="space-y-2">
                      <div 
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium text-center shadow-md transition-transform hover:scale-105"
                        style={{ backgroundColor: themeColors.primary }}
                      >
                        Primary Button
                      </div>
                      <div 
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium text-center shadow-md transition-transform hover:scale-105"
                        style={{ backgroundColor: themeColors.secondary }}
                      >
                        Secondary Button
                      </div>
                      <div className="flex gap-2">
                        <div 
                          className="flex-1 px-3 py-1 rounded text-white text-xs font-medium text-center"
                          style={{ backgroundColor: themeColors.success }}
                        >
                          Success
                        </div>
                        <div 
                          className="flex-1 px-3 py-1 rounded text-white text-xs font-medium text-center"
                          style={{ backgroundColor: themeColors.warning }}
                        >
                          Warning
                        </div>
                        <div 
                          className="flex-1 px-3 py-1 rounded text-white text-xs font-medium text-center"
                          style={{ backgroundColor: themeColors.error }}
                        >
                          Error
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dark Mode Preview */}
                  <div className="p-6 rounded-xl bg-gray-900 border-2 border-gray-700">
                    <h5 className="text-xs font-medium text-gray-300 mb-4 flex items-center gap-2">
                      <Moon className="w-4 h-4" />
                      Dark Mode
                    </h5>
                    <div className="space-y-2">
                      <div 
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium text-center shadow-md transition-transform hover:scale-105"
                        style={{ backgroundColor: themeColors.primary }}
                      >
                        Primary Button
                      </div>
                      <div 
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium text-center shadow-md transition-transform hover:scale-105"
                        style={{ backgroundColor: themeColors.secondary }}
                      >
                        Secondary Button
                      </div>
                      <div className="flex gap-2">
                        <div 
                          className="flex-1 px-3 py-1 rounded text-white text-xs font-medium text-center"
                          style={{ backgroundColor: themeColors.success }}
                        >
                          Success
                        </div>
                        <div 
                          className="flex-1 px-3 py-1 rounded text-white text-xs font-medium text-center"
                          style={{ backgroundColor: themeColors.warning }}
                        >
                          Warning
                        </div>
                        <div 
                          className="flex-1 px-3 py-1 rounded text-white text-xs font-medium text-center"
                          style={{ backgroundColor: themeColors.error }}
                        >
                          Error
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewPage} onOpenChange={(open) => !open && setPreviewPage(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Preview: {previewPage && pageNames[previewPage]}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-8 min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  {previewPage && layoutOptions[previewPage].find(o => o.id === selectedVariants[previewPage])?.thumbnail}
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {previewPage && layoutOptions[previewPage].find(o => o.id === selectedVariants[previewPage])?.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {previewPage && layoutOptions[previewPage].find(o => o.id === selectedVariants[previewPage])?.description}
                </p>
                <Badge variant="outline">
                  {previewPage && selectedVariants[previewPage]}
                </Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



