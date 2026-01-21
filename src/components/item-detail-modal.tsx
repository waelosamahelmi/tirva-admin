import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X, Leaf, Heart, Wheat, ShoppingCart } from "lucide-react";
import type { Topping } from "@shared/schema";

interface ItemDetailModalProps {
  item: any;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: any, quantity: number, size?: string, toppings?: Topping[], specialInstructions?: string) => void;
}

export function ItemDetailModal({ item, isOpen, onClose, onAddToCart }: ItemDetailModalProps) {
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("normal");
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Fetch toppings from API
  const { data: allToppings = [] } = useQuery({
    queryKey: ['/api/toppings'],
    enabled: isOpen
  });

  // Category detection
  const isPizza = item?.categoryId === 6 || (item && item.name && item.name.toLowerCase().includes('pizza'));
  const isKebab = item && item.name && (item.name.toLowerCase().includes('kebab') || item.name.toLowerCase().includes('iskender'));
  const isChicken = item && item.name && (item.name.toLowerCase().includes('kana') || item.name.toLowerCase().includes('chicken') || item.name.toLowerCase().includes('wing'));
  const isBurger = item && item.name && (item.name.toLowerCase().includes('burger') || item.name.toLowerCase().includes('hampurilainen'));
  const isSalad = item && item.name && (item.name.toLowerCase().includes('salaatti') || item.name.toLowerCase().includes('salad'));
  const isChild = item && item.name && (item.name.toLowerCase().includes('lapsi') || item.name.toLowerCase().includes('child'));
  const isDrink = item && item.name && (item.name.toLowerCase().includes('coca') || item.name.toLowerCase().includes('fanta') || item.name.toLowerCase().includes('juoma'));

  // State for radio selections
  const [selectedSauce, setSelectedSauce] = useState("");
  const [selectedDrink, setSelectedDrink] = useState("");
  const [selectedMealSize, setSelectedMealSize] = useState("");
  const basePrice = parseFloat(item?.offerPrice || item?.price || "0");
  const familySizeUpcharge = 8.00; // Family size costs 8€ more
  
  // Filter toppings by category based on product type
  const getFilteredToppings = () => {
    if (!Array.isArray(allToppings)) return { toppings: [], sauces: [], extras: [], spices: [] };
    
    if (isPizza) {
      // Pizza toppings - only show pizza category items
      const toppings = allToppings.filter((t: any) => t.category === 'pizza' && t.type === 'topping');
      const extras = allToppings.filter((t: any) => t.category === 'pizza' && t.type === 'extra');
      const spices = allToppings.filter((t: any) => t.category === 'pizza' && t.type === 'spice');
      return { toppings, sauces: [], extras, spices };
    }
    
    if (isKebab) {
      // Kebab options - sauces and limited extras
      const sauces = allToppings.filter((t: any) => t.category === 'kebab' && t.type === 'sauce');
      const extras = allToppings.filter((t: any) => t.category === 'kebab' && t.type === 'extra');
      return { toppings: [], sauces, extras, spices: [] };
    }
    
    if (isChicken) {
      // Chicken options - for wings show sauces, for regular chicken show extras
      const sauces = allToppings.filter((t: any) => t.category === 'hotwings' && t.type === 'sauce');
      const extras = allToppings.filter((t: any) => t.category === 'chicken' && t.type === 'extra');
      return { toppings: [], sauces, extras, spices: [] };
    }
    
    if (isBurger) {
      // Burger options - extras only
      const extras = allToppings.filter((t: any) => t.category === 'burger' && t.type === 'extra');
      return { toppings: [], sauces: [], extras, spices: [] };
    }
    
    if (isDrink) {
      // Drink sizes
      const sizes = allToppings.filter((t: any) => t.category === 'drink' && t.type === 'size');
      return { toppings: [], sauces: [], extras: [], spices: [], sizes };
    }
    
    return { toppings: [], sauces: [], extras: [], spices: [] };
  };

  const { toppings, sauces, extras, spices } = getFilteredToppings();

  // Calculate total price
  const sizePrice = selectedSize === "perhe" ? familySizeUpcharge : 0;
  const drinkPrice = isDrink && selectedSize === "0.5L" ? 0.60 : 
                   isDrink && selectedSize === "1.5L" ? 2.10 : 0;
  
  // Conditional pricing support: check if item has conditional pricing enabled
  const hasConditionalPricing = item?.hasConditionalPricing || false;
  const includedToppingsCount = item?.includedToppingsCount || 0;
  
  const toppingsPrice = selectedToppings.reduce((total, topping, index) => {
    const toppingData = Array.isArray(allToppings) ? allToppings.find((t: any) => t.id === topping.id) : null;
    if (!toppingData) return total;
    
    // Conditional pricing: if enabled, first N toppings are free
    if (hasConditionalPricing && index < includedToppingsCount) {
      return total; // This topping is included in base price
    }
    
    let toppingPrice = parseFloat(toppingData.price);
    
    // Special rule: if pizza size is "perhe" (family), all toppings are double-priced
    if (selectedSize === "perhe") {
      toppingPrice *= 2;
    }
    
    // Special rule: if pizza size is "large", toppings that cost €1.00 become €2.00
    if (selectedSize === "large" && Math.abs(toppingPrice - 1.00) < 0.01) {
      toppingPrice = 2.00;
    }
    
    return total + toppingPrice;
  }, 0);
  
  const totalPrice = (basePrice + sizePrice + drinkPrice + toppingsPrice) * quantity;

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedSize(isDrink ? "0.33L" : "normal");
      setSelectedToppings([]);
      setSpecialInstructions("");
      setSelectedSauce("");
      setSelectedDrink("");
      setSelectedMealSize("");
    }
  }, [isOpen, item, isDrink]);

  if (!item) return null;

  const handleToppingChange = (topping: Topping, checked: boolean) => {
    if (checked) {
      setSelectedToppings(prev => [...prev, topping]);
    } else {
      setSelectedToppings(prev => prev.filter(t => t.id !== topping.id));
    }
  };

  const handleAddToCart = () => {
    // Build special instructions with radio selections
    let instructions = specialInstructions || "";
    
    if (selectedSauce) {
      instructions = instructions ? `${instructions}, Kastike: ${selectedSauce}` : `Kastike: ${selectedSauce}`;
    }
    
    if (selectedDrink) {
      instructions = instructions ? `${instructions}, Juoma: ${selectedDrink}` : `Juoma: ${selectedDrink}`;
    }
    
    if (selectedMealSize) {
      instructions = instructions ? `${instructions}, ${selectedMealSize}` : selectedMealSize;
    }
    
    // Handle drink sizes for pricing
    const finalSize = isDrink ? selectedSize : (isPizza ? selectedSize : undefined);
    
    onAddToCart(
      item,
      quantity,
      finalSize,
      selectedToppings.length > 0 ? selectedToppings : undefined,
      instructions || undefined
    );
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} €`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl font-bold pr-8">
              {item.name}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute right-4 top-4"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <img
              src={item.imageUrl || "/placeholder-food.jpg"}
              alt={item.name}
              className="w-full h-full object-cover"
            />
            {item.offerPercentage && (
              <Badge className="absolute top-4 right-4 bg-red-500 text-white text-lg px-3 py-1">
                -{item.offerPercentage}%
              </Badge>
            )}
          </div>

          {/* Item Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              {item.isVegetarian && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Leaf className="w-3 h-3 mr-1" />
                  {t("Kasvisruoka", "Vegetarian")}
                </Badge>
              )}
              {item.isVegan && (
                <Badge variant="outline" className="text-green-700 border-green-700">
                  <Heart className="w-3 h-3 mr-1" />
                  {t("Vegaaninen", "Vegan")}
                </Badge>
              )}
              {item.isGlutenFree && (
                <Badge variant="outline" className="text-amber-600 border-amber-600">
                  <Wheat className="w-3 h-3 mr-1" />
                  {t("Gluteeniton", "Gluten-free")}
                </Badge>
              )}
            </div>

            {item.description && (
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.description}
              </p>
            )}

            <div className="flex items-center space-x-3">
              {item.offerPrice ? (
                <>
                  <span className="text-2xl font-bold text-red-600">
                    {formatPrice(parseFloat(item.offerPrice))}
                  </span>
                  <span className="text-lg text-gray-500 line-through">
                    {formatPrice(parseFloat(item.price))}
                  </span>
                  <Badge className="bg-red-100 text-red-800 border-red-200">
                    {t("Tarjous", "Offer")}
                  </Badge>
                </>
              ) : (
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(basePrice)}
                </span>
              )}
            </div>
          </div>

          {/* Pizza Size Selection */}
          {isPizza && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {t("Valitse koko", "Choose Size")}
                </h3>
                <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="normal" id="normal" />
                      <Label htmlFor="normal" className="font-medium">
                        {t("Normaali (Ø 30cm)", "Normal (Ø 30cm)")}
                      </Label>
                    </div>
                    <span className="text-sm text-gray-600">
                      {formatPrice(basePrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="perhe" id="perhe" />
                      <Label htmlFor="perhe" className="font-medium">
                        {t("Perhekoko (Ø 42cm)", "Family Size (Ø 42cm)")}
                      </Label>
                    </div>
                    <span className="text-sm text-gray-600">
                      +{formatPrice(familySizeUpcharge)}
                    </span>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Category-specific options */}
          {isDrink && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {t("Koko", "Size")} <span className="text-red-500">*</span>
                </h3>
                <RadioGroup value={selectedSize} onValueChange={setSelectedSize}>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="0.33L" id="033l" />
                        <Label htmlFor="033l" className="font-medium">0,33L</Label>
                      </div>
                    </div>
                    {!item?.name?.toLowerCase().includes('fanta') && (
                      <>
                        <div className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="0.5L" id="05l" />
                            <Label htmlFor="05l" className="font-medium">0,5L</Label>
                          </div>
                          <span className="text-sm text-gray-600">+€0,60</span>
                        </div>
                        {item?.name?.toLowerCase().includes('coca') && (
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <RadioGroupItem value="1.5L" id="15l" />
                              <Label htmlFor="15l" className="font-medium">1,5L</Label>
                            </div>
                            <span className="text-sm text-gray-600">+€2,10</span>
                          </div>
                        )}
                      </>
                    )}
                    {item?.name?.toLowerCase().includes('fanta') && (
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="0.5L" id="05l" />
                          <Label htmlFor="05l" className="font-medium">0,5L</Label>
                        </div>
                        <span className="text-sm text-gray-600">+€0,60</span>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Kebab sauce options */}
          {isKebab && sauces.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {t("Kastikevaihtoehto", "Sauce Option")} <span className="text-red-500">*</span>
                </h3>
                <RadioGroup value={selectedSauce} onValueChange={setSelectedSauce}>
                  <div className="grid grid-cols-1 gap-3">
                    {sauces.map((sauce: any) => (
                      <div key={sauce.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={sauce.name} id={sauce.id.toString()} />
                          <Label htmlFor={sauce.id.toString()} className="font-medium">{sauce.name}</Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Hot wings sauce */}
          {isChicken && item?.name?.toLowerCase().includes('wing') && sauces.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {t("Kastike", "Sauce")} <span className="text-red-500">*</span>
                </h3>
                <RadioGroup value={selectedSauce} onValueChange={setSelectedSauce}>
                  <div className="grid grid-cols-1 gap-3">
                    {sauces.map((sauce: any) => (
                      <div key={sauce.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={sauce.name} id={sauce.id.toString()} />
                          <Label htmlFor={sauce.id.toString()} className="font-medium">{sauce.name}</Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Burger meal and drink options */}
          {isBurger && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {t("Koko", "Size")} <span className="text-red-500">*</span>
                </h3>
                <RadioGroup value={selectedMealSize} onValueChange={setSelectedMealSize}>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="ateria" id="ateria" />
                        <Label htmlFor="ateria" className="font-medium">Ateria (Ranskalaiset + 0,33L)</Label>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>
              
              {selectedMealSize === "ateria" && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    {t("Juoma", "Drink")} <span className="text-red-500">*</span>
                  </h3>
                  <RadioGroup value={selectedDrink} onValueChange={setSelectedDrink}>
                    <div className="grid grid-cols-1 gap-3">
                      {["Coca Cola 0,33l", "Coca Cola Zero 0,33l", "Fanta 0,33l"].map((drink) => (
                        <div key={drink} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value={drink} id={drink} />
                            <Label htmlFor={drink} className="font-medium">{drink}</Label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              )}
            </div>
          )}

          {/* Pizza toppings */}
          {isPizza && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {t("Lisätäytteet", "Pizza Toppings")}
                  {(hasConditionalPricing && includedToppingsCount > 0) && (
                    <span className="text-sm font-normal text-green-600 ml-2">
                      {t(
                        `(${includedToppingsCount} ensimmäistä ilmaista)`, 
                        `(First ${includedToppingsCount} free)`
                      )}
                    </span>
                  )}
                </h3>
                
                {/* Conditional pricing info banner */}
                {hasConditionalPricing && includedToppingsCount > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <span className="font-semibold">🎉 {t("Erikoistarjous!", "Special offer!")}</span>{" "}
                      {t(
                        `Valitse ${includedToppingsCount} ensimmäistä lisätäytettä ilmaiseksi! Lisätäytteet sen jälkeen normaalihintaan.`,
                        `Choose your first ${includedToppingsCount} toppings for free! Additional toppings after that at regular price.`
                      )}
                    </p>
                    {selectedToppings.length > 0 && (
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {t(
                          `Valittu: ${selectedToppings.length} lisätäytettä (${Math.max(0, includedToppingsCount - selectedToppings.length)} ilmaista jäljellä)`,
                          `Selected: ${selectedToppings.length} toppings (${Math.max(0, includedToppingsCount - selectedToppings.length)} free remaining)`
                        )}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {toppings.map((topping: any, index: number) => {
                    const toppingIndex = selectedToppings.findIndex(t => t.id === topping.id);
                    const isFree = hasConditionalPricing && toppingIndex !== -1 && toppingIndex < includedToppingsCount;
                    
                    return (
                      <div key={topping.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={topping.id.toString()}
                            checked={selectedToppings.some(t => t.id === topping.id)}
                            onCheckedChange={(checked) => handleToppingChange(topping, !!checked)}
                          />
                          <Label htmlFor={topping.id.toString()} className="font-medium cursor-pointer">
                            {topping.name}
                          </Label>
                        </div>
                        <span className="text-sm text-gray-600">
                          {isFree ? (
                            <span className="text-green-600 font-medium">
                              {t("Ilmainen", "Free")}
                            </span>
                          ) : (
                            `+${formatPrice(parseFloat(topping.price))}`
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pizza extras */}
              {extras.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    {t("Extrat", "Extras")}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {extras.map((extra: any) => (
                      <div key={extra.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={extra.id.toString()}
                            checked={selectedToppings.some(t => t.id === extra.id)}
                            onCheckedChange={(checked) => handleToppingChange(extra, !!checked)}
                          />
                          <Label htmlFor={extra.id.toString()} className="font-medium cursor-pointer">
                            {extra.name}
                          </Label>
                        </div>
                        <span className="text-sm text-gray-600">
                          +{formatPrice(parseFloat(extra.price))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pizza spices */}
              {spices.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    {t("Mausteet", "Spices")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {spices.map((spice: any) => (
                      <div key={spice.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={spice.id.toString()}
                            checked={selectedToppings.some(t => t.id === spice.id)}
                            onCheckedChange={(checked) => handleToppingChange(spice, !!checked)}
                          />
                          <Label htmlFor={spice.id.toString()} className="font-medium cursor-pointer">
                            {spice.name}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Extras for kebab, chicken, burgers */}
          {(isKebab || isChicken || isBurger) && extras.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  {t("Extrat", "Extras")}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {extras.filter((extra: any) => {
                    // Show relevant extras for each category
                    if (isKebab || isChicken) return ["Tuplaliha", "Aurajuusto", "Salaattijuusto", "Ananas", "Jalapeno"].includes(extra.name);
                    if (isBurger) return ["aurajuusto", "feta", "ananas", "jalapeno", "kananmuna"].includes(extra.name.toLowerCase());
                    return false;
                  }).map((extra: any) => (
                    <div key={extra.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={extra.id.toString()}
                          checked={selectedToppings.some(t => t.id === extra.id)}
                          onCheckedChange={(checked) => handleToppingChange(extra, !!checked)}
                        />
                        <Label htmlFor={extra.id.toString()} className="font-medium cursor-pointer">
                          {extra.name}
                        </Label>
                      </div>
                      <span className="text-sm text-gray-600">
                        +{formatPrice(parseFloat(extra.price))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-4">
            <Separator />
            <div>
              <Label htmlFor="instructions" className="font-semibold text-lg mb-3 block">
                {t("Erityistoiveet", "Special Instructions")}
              </Label>
              <Textarea
                id="instructions"
                placeholder={t("Esim. ilman sipulia, extra mausteita...", "e.g. no onions, extra spices...")}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Quantity and Add to Cart */}
          <div className="space-y-4">
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="font-semibold">{t("Määrä", "Quantity")}:</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-semibold">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t("Yhteensä", "Total")}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(totalPrice)}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleAddToCart}
              className="w-full text-lg py-6"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {t("Lisää ostoskoriin", "Add to Cart")} - {formatPrice(totalPrice)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


