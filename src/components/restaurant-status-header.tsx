import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/language-context";
import { Clock, Store } from "lucide-react";

export function RestaurantStatusHeader() {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Simple restaurant status check
  const isRestaurantOpen = () => {
    const hour = currentTime.getHours();
    return hour >= 6 && hour < 20; // 06:00 - 20:00
  };

  const restaurantOpen = isRestaurantOpen();

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-b">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Store className="w-5 h-5 text-red-600" />
            <div className={`w-2 h-2 rounded-full ${restaurantOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {restaurantOpen 
                ? t("Avoinna 06:00-20:00", "Open 06:00-20:00")
                : t("Suljettu - Avautuu 06:00", "Closed - Opens 06:00")
              }
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              {currentTime.toLocaleTimeString('fi-FI', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'Europe/Helsinki'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


