import { useLanguage } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  Car,
  Truck,
  Coffee
} from "lucide-react";

export function ServiceHoursSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t("Palveluajat", "Service Hours")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {t("Tarkista milloin palvelumme ovat käytettävissä", "Check when our services are available")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pickup Service */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("Noutopalvelu", "Pickup Service")}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("Maanantai - Perjantai", "Monday - Friday")}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    10:00 - 20:00
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("Lauantai - Sunnuntai", "Saturday - Sunday")}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    10:00 - 20:00
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Service */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                  <Truck className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("Toimituspalvelu", "Delivery Service")}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("Maanantai - Torstai", "Monday - Thursday")}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    10:00 - 19:30
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("Perjantai - Sunnuntai", "Friday - Sunday")}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    10:00 - 19:30
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lunch Buffet */}
          <Card className="hover:shadow-lg transition-shadow md:col-span-2 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t("Lounasbuffet", "Lunch Buffet")}
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("Arkisin", "Weekdays")}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    10:00 - 14:30
                  </span>
                </div>
                <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-700 dark:text-purple-300 text-center">
                    {t("Sisältää kahvin ja jälkiruoan", "Includes coffee and dessert")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Status */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-4 py-2 rounded-full">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-medium">
              {t("Tällä hetkellä avoinna", "Currently open")}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {t("pizzeria: 06:00 - 20:00", "Restaurant: 06:00 - 20:00")}
          </p>
        </div>
      </div>
    </section>
  );
}


