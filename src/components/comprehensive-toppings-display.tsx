import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Plus, DollarSign } from "lucide-react";

interface ToppingsDisplayProps {
  onEdit: (topping: any) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
}

export function ComprehensiveToppingsDisplay({ onEdit, onDelete, onCreate }: ToppingsDisplayProps) {
  const { t } = useLanguage();
  const [filterCategory, setFilterCategory] = useState("all");

  const { data: toppings, isLoading } = useQuery({
    queryKey: ["/api/toppings"],
    queryFn: async () => {
      const response = await fetch("/api/toppings");
      if (!response.ok) throw new Error("Failed to fetch toppings");
      return response.json();
    },
  });

  // Group toppings by category
  const groupedToppings = toppings?.reduce((acc: any, topping: any) => {
    const category = topping.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(topping);
    return acc;
  }, {}) || {};

  const categories = [
    { value: "all", label: t("Kaikki", "All") },
    { value: "pizza", label: t("Pizza", "Pizza") },
    { value: "kebab", label: t("Kebab", "Kebab") },
    { value: "chicken", label: t("Kana", "Chicken") },
    { value: "hotwings", label: t("Hot Wings", "Hot Wings") },
    { value: "burger", label: t("Hampurilaiset", "Burgers") },
    { value: "drinks", label: t("Juomat", "Drinks") },
  ];

  const filteredToppings = filterCategory === "all" 
    ? toppings 
    : toppings?.filter((t: any) => t.category === filterCategory);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      pizza: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      kebab: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      chicken: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      hotwings: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      burger: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      drinks: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };
    return colors[category] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const getPriceColor = (price: string) => {
    if (price === "0.00") return "text-green-600 dark:text-green-400";
    return "text-blue-600 dark:text-blue-400";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            {t("Ladataan täytteitä...", "Loading toppings...")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <Label htmlFor="category-filter">{t("Suodata kategoria:", "Filter by category:")}</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />
          {t("Uusi täyte", "New Topping")}
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredToppings && filteredToppings.length > 0 ? (
          filteredToppings.map((topping: any) => (
            <Card key={topping.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col space-y-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {topping.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {topping.nameEn}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge className={getCategoryColor(topping.category)}>
                        {topping.category}
                      </Badge>
                      <Badge variant={topping.isActive ? "default" : "secondary"}>
                        {topping.isActive ? t("Aktiivinen", "Active") : t("Ei aktiivinen", "Inactive")}
                      </Badge>
                      {topping.isRequired && (
                        <Badge variant="destructive">
                          {t("Pakollinen", "Required")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center space-x-1 font-semibold ${getPriceColor(topping.price)}`}>
                    <DollarSign className="w-4 h-4" />
                    <span>
                      {topping.price === "0.00" 
                        ? t("Ilmainen", "Free")
                        : `€${topping.price}`
                      }
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(topping)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onDelete(topping.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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
            <CardContent className="py-8">
              <div className="text-center text-gray-500 dark:text-gray-400">
                {t("Ei täytteitä saatavilla", "No toppings available")}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


