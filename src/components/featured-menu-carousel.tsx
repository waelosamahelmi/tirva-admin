import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useCart } from "@/lib/cart-context";
import { useMenuItems } from "@/hooks/use-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function FeaturedMenuCarousel() {
  const { language, t } = useLanguage();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { data: menuItems } = useMenuItems();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Featured items (first 6 items from different categories)
  const featuredItems = menuItems?.slice(0, 6) || [];

  useEffect(() => {
    if (featuredItems.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % Math.max(featuredItems.length - 2, 1));
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [featuredItems.length]);

  const handleAddToCart = (menuItem: any) => {
    addItem(menuItem);
    toast({
      title: t("Tuote lisätty koriin!", "Item added to cart!"),
      description: `${language === "fi" ? menuItem.name : menuItem.nameEn}`,
    });
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(featuredItems.length - 2, 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(featuredItems.length - 2, 1)) % Math.max(featuredItems.length - 2, 1));
  };

  if (!featuredItems.length) return null;

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Star className="w-6 h-6 text-yellow-400 fill-current" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {t("Suosituimmat Ruoat", "Featured Dishes")}
            </h2>
            <Star className="w-6 h-6 text-yellow-400 fill-current" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            {t(
              "Asiakkaiden suosikkeja ja keittiömme parhaita herkkuja",
              "Customer favorites and our kitchen's finest delicacies"
            )}
          </p>
        </div>

        <div className="relative">
          {/* Navigation Buttons */}
          <div className="absolute inset-y-0 left-0 flex items-center z-10">
            <Button
              onClick={prevSlide}
              variant="outline"
              size="sm"
              className="rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center z-10">
            <Button
              onClick={nextSlide}
              variant="outline"
              size="sm"
              className="rounded-full bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Carousel */}
          <div className="overflow-hidden mx-12">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * (100 / 3)}%)` }}
            >
              {featuredItems.map((item, index) => (
                <div key={item.id} className="w-1/3 flex-shrink-0 px-3">
                  <Card className="overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 bg-white dark:bg-gray-800">
                    {item.imageUrl && (
                      <div className="relative">
                        <img
                          src={item.imageUrl}
                          alt={language === "fi" ? item.name : item.nameEn}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-red-600 text-white">
                            {t("Suosittu", "Popular")}
                          </Badge>
                        </div>
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {language === "fi" ? item.name : item.nameEn}
                        </h3>
                        <div className="flex gap-1 ml-2">
                          {item.isVegetarian && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              V
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                        {language === "fi" ? item.description : item.descriptionEn}
                      </p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-red-600">
                          €{parseFloat(item.price).toFixed(2)}
                        </span>
                        <Button
                          onClick={() => handleAddToCart(item)}
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2"
                          disabled={!item.isAvailable}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t("Lisää", "Add")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-8">
            {Array.from({ length: Math.max(featuredItems.length - 2, 1) }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  currentIndex === index 
                    ? "bg-red-600" 
                    : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


