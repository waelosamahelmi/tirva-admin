import { useState, useMemo } from "react";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import { useCategories, useMenuItems } from "@/hooks/use-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ItemDetailModal } from "@/components/item-detail-modal";

export function MenuSection() {
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isItemDetailOpen, setIsItemDetailOpen] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: allMenuItems, isLoading: menuItemsLoading } = useMenuItems();

  // Filter and search logic
  const filteredMenuItems = useMemo(() => {
    if (!allMenuItems) return [];

    let filtered = allMenuItems;

    // Filter by category
    if (activeCategory) {
      filtered = filtered.filter(item => item.categoryId === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.nameEn.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.descriptionEn && item.descriptionEn.toLowerCase().includes(query))
      );
    }

    // Filter by dietary preferences
    if (dietaryFilter.length > 0) {
      filtered = filtered.filter(item => {
        return dietaryFilter.every(filter => {
          switch (filter) {
            case 'vegetarian': return item.isVegetarian;
            case 'vegan': return item.isVegan;
            case 'glutenFree': return item.isGlutenFree;
            default: return true;
          }
        });
      });
    }

    return filtered;
  }, [allMenuItems, activeCategory, searchQuery, dietaryFilter]);

  // Set default category when categories load
  if (categories && categories.length > 0 && activeCategory === null) {
    setActiveCategory(categories[0].id);
  }

  const handleItemClick = (menuItem: any) => {
    setSelectedItem(menuItem);
    setIsItemDetailOpen(true);
  };

  const handleAddToCart = (item: any, quantity: number, size?: string, toppings?: string[], specialInstructions?: string) => {
    addItem(item, quantity, size, toppings, specialInstructions);
    toast({
      title: t("Tuote lisätty koriin!", "Item added to cart!"),
      description: `${language === "fi" ? item.name : item.nameEn}`,
    });
    setIsItemDetailOpen(false);
  };

  const toggleDietaryFilter = (filter: string) => {
    setDietaryFilter(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setDietaryFilter([]);
    setActiveCategory(categories?.[0]?.id || null);
  };

  if (categoriesLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-2/3 mx-auto" />
          </div>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="menu" className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("Herkullinen Menuumme", "Our Delicious Menu")}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            {t(
              "Tuoreet ainekset ja perinteiset reseptit yhdistyvät unohtumattomiksi makuelämyksiksi",
              "Fresh ingredients and traditional recipes combined for unforgettable flavors"
            )}
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-8 space-y-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder={t("Etsi ruokia...", "Search dishes...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Dietary Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant={dietaryFilter.includes('vegetarian') ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDietaryFilter('vegetarian')}
              className="text-xs"
            >
              🌱 {t("Kasvisruoka", "Vegetarian")}
            </Button>
            <Button
              variant={dietaryFilter.includes('vegan') ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDietaryFilter('vegan')}
              className="text-xs"
            >
              🌿 {t("Vegaani", "Vegan")}
            </Button>
            <Button
              variant={dietaryFilter.includes('glutenFree') ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDietaryFilter('glutenFree')}
              className="text-xs"
            >
              🌾 {t("Gluteeniton", "Gluten Free")}
            </Button>
            {(searchQuery || dietaryFilter.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-700"
              >
                <X className="w-3 h-3 mr-1" />
                {t("Tyhjennä", "Clear")}
              </Button>
            )}
          </div>
        </div>

        {/* Menu Categories */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Button
            onClick={() => setActiveCategory(null)}
            variant={activeCategory === null ? "default" : "outline"}
            className={`px-6 py-2 font-medium transition-all ${
              activeCategory === null
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border"
            }`}
          >
            {t("Kaikki", "All")}
          </Button>
          {categories?.map((category) => (
            <Button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              variant={activeCategory === category.id ? "default" : "outline"}
              className={`px-6 py-2 font-medium transition-all ${
                activeCategory === category.id
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border"
              }`}
            >
              {language === "fi" ? category.name : category.nameEn}
            </Button>
          ))}
        </div>

        {/* Results Count */}
        <div className="text-center mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            {t(`${filteredMenuItems.length} ruokaa löytyi`, `${filteredMenuItems.length} dishes found`)}
          </p>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItemsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-48" />
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredMenuItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t("Ei hakutuloksia", "No results found")}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t("Kokeile erilaisia hakutermejä tai poista suodattimet", "Try different search terms or remove filters")}
              </p>
              <Button onClick={clearAllFilters} variant="outline">
                {t("Näytä kaikki ruoat", "Show all dishes")}
              </Button>
            </div>
          ) : (
            filteredMenuItems?.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-xl transition-all transform hover:scale-105"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={language === "fi" ? item.name : item.nameEn}
                    className="w-full h-48 object-cover"
                  />
                )}
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {language === "fi" ? item.name : item.nameEn}
                    </h3>
                    <div className="flex gap-1 ml-2">
                      {item.isVegetarian && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          V
                        </Badge>
                      )}
                      {item.isVegan && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          VE
                        </Badge>
                      )}
                      {item.isGlutenFree && (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          GF
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {language === "fi" ? item.description : item.descriptionEn}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-red-600">
                      €{parseFloat(item.price).toFixed(2)}
                    </span>
                    <Button
                      onClick={() => handleItemClick(item)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                      disabled={!item.isAvailable}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("Lisää", "Add")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          isOpen={isItemDetailOpen}
          onClose={() => setIsItemDetailOpen(false)}
          onAddToCart={handleAddToCart}
        />
      )}
    </section>
  );
}



