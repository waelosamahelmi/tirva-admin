import { useLanguage } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Facebook,
  Mail,
  Navigation,
  Car,
  Truck,
  UtensilsCrossed
} from "lucide-react";

export function ContactSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Contact Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            {t("Ota yhteytt‰", "Get in Touch")}
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {t(
              "Olemme t‰‰ll‰ auttamassa sinua. Ota yhteytt‰ tai tule k‰ym‰‰n meill‰ Utissa.",
              "We're here to help you. Get in touch or visit us in Lahti."
            )}
          </p>
        </div>

        {/* Contact Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Contact Details */}
          <Card className="h-fit">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t("Yhteystiedot", "Contact Information")}
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {t("Osoite", "Address")}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300">
                      Pasintie 2<br />
                      45410 Pasintie 2, 45410 Utti
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {t("Puhelin", "Phone")}
                    </h4>
                    <a 
                      href="tel:+35835899089" 
                      className="text-blue-600 hover:underline text-lg font-medium"
                    >
                      +358 41 3152619
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Facebook className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {t("Facebook", "Facebook")}
                    </h4>
                    <a 
                      href="https://fi-fi.facebook.com/tirvankahvila/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      Facebook - Tirvan Kahvila
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Opening Hours */}
          <Card className="h-fit">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {t("Aukioloajat", "Opening Hours")}
              </h3>
              
              <div className="space-y-6">
                {/* Restaurant Hours */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {t("pizzeria", "Restaurant")}
                    </h4>
                  </div>
                  <div className="ml-8 space-y-1 text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>{t("Maanantai - Sunnuntai", "Monday - Sunday")}</span>
                      <span className="font-medium">06:00 - 20:00</span>
                    </div>
                  </div>
                </div>

                {/* Pickup Service */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <Car className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {t("Noutopalvelu", "Pickup Service")}
                    </h4>
                  </div>
                  <div className="ml-8 space-y-1 text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>{t("Maanantai - Perjantai", "Monday - Friday")}</span>
                      <span className="font-medium">10:00 - 20:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("Lauantai - Sunnuntai", "Saturday - Sunday")}</span>
                      <span className="font-medium">10:00 - 20:00</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Service */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <Truck className="w-5 h-5 text-orange-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {t("Toimituspalvelu", "Delivery Service")}
                    </h4>
                  </div>
                  <div className="ml-8 space-y-1 text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>{t("Maanantai - Torstai", "Monday - Thursday")}</span>
                      <span className="font-medium">10:00 - 19:30</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t("Perjantai - Sunnuntai", "Friday - Sunday")}</span>
                      <span className="font-medium">10:00 - 19:30</span>
                    </div>
                  </div>
                </div>

                {/* Lunch Buffet */}
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <UtensilsCrossed className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {t("Lounasbuffet", "Lunch Buffet")}
                    </h4>
                  </div>
                  <div className="ml-8 space-y-1 text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>{t("Arkisin", "Weekdays")}</span>
                      <span className="font-medium">10:00 - 14:30</span>
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">
                      {t("Sis‰lt‰‰ kahvin ja j‰lkiruoan", "Includes coffee and dessert")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Information */}
        <Card className="mb-12">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t("Toimitustiedot", "Delivery Information")}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {t("Toimituskulut", "Delivery Fees")}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span>{t("Kuljetusalue 0 - 10km", "Delivery area 0 - 10km")}</span>
                    <span className="font-bold text-green-600">3,00 Ä</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span>{t("Kuljetusalue yli 10km", "Delivery area over 10km")}</span>
                    <span className="font-bold text-orange-600">8,00 Ä</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("* Yli 10km toimituksissa minimitilaus 20,00 Ä", "* For deliveries over 10km, minimum order Ä20.00")}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {t("Toimitusalueet", "Delivery Areas")}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {t(
                    "Toimitamme ruokaa Utin ja l‰hialueiden koteihin ja tyˆpaikoille. Tarkista toimitusmahdollisuus soittamalla meille.",
                    "We deliver food to homes and workplaces in Lahti and surrounding areas. Check delivery availability by calling us."
                  )}
                </p>
                <Button className="w-full md:w-auto">
                  <Phone className="w-4 h-4 mr-2" />
                  {t("Soita ja tilaa", "Call and Order")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map Placeholder */}
        <Card>
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t("Sijainti", "Location")}
            </h3>
            
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t("Kartta tulossa pian", "Map coming soon")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Pasintie 2, 45410 Utti
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

