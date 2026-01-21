import { useLanguage } from "@/lib/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  Heart,
  ChefHat,
  Truck,
  Coffee,
  Facebook
} from "lucide-react";

export function AboutSection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 bg-white dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main About Content */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            {t("Meistä Tirvan Kahvila Lahti", "About Tirvan Kahvila Lahti")}
          </h2>
          <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-700 dark:text-gray-300">
            <p>
              {t(
                "Tervetuloa Tirvan Kahvilaan, jossa valmistamme annoksemme aina tuoreista ja laadukkaista raaka-aineista. Olemme ylpeitä perinteisistä valmistusmenetelmistämme, jotka takaavat aidon makuelämyksen jokaisella kerralla.",
                "Welcome to Tirvan Kahvila, where we prepare our dishes always from fresh and quality ingredients. We are proud of our traditional preparation methods, which guarantee an authentic taste experience every time."
              )}
            </p>
            <p className="text-xl font-semibold text-red-600">
              {t("Nopea ja luotettava toimituspalvelu!", "Fast and reliable delivery service!")}
            </p>
            <p>
              {t(
                "Nauti herkullisista annoksistamme suoraan kotiovellasi nopean ja luotettavan toimituspalvelumme avulla.",
                "Enjoy our delicious dishes directly at your doorstep with our fast and reliable delivery service."
              )}
            </p>
          </div>
        </div>

        {/* Our Specialties */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChefHat className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-2">
                {t("Perinteinen taikina", "Traditional Dough")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  "Käytämme perinteistä klassista taikinaa, joka on täydellisen rapea ja maukas",
                  "We use traditional classic dough that is perfectly crispy and tasty"
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">
                {t("Tuoreet raaka-aineet", "Fresh Ingredients")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  "Pizzamme täytetään aina tuoreilla ja huolella valituilla raaka-aineilla",
                  "Our pizzas are always filled with fresh and carefully selected ingredients"
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-semibold mb-2">
                {t("Mehevät kebabit", "Juicy Kebabs")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  "Kebabimme ovat meheviä ja täynnä makua, tarjoten sinulle todellisen makunautinnon",
                  "Our kebabs are juicy and full of flavor, offering you a real taste experience"
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">
                {t("Raikkaita salaatteja", "Fresh Salads")}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  "Raikkaat ja monipuoliset salaatit, jotka valmistetaan päivittäin tuoreista aineksista",
                  "Fresh and versatile salads prepared daily from fresh ingredients"
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-lg p-8 mb-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {t("Tavoitteemme", "Our Goal")}
            </h3>
            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              {t(
                "Tavoitteenamme on tarjota Lahden alueelle uudenlainen ja monipuolinen klassisen ruoan konsepti, joka ilahduttaa jokaista vierailijaa.",
                "Our goal is to offer the Lahti area a new and versatile classic food concept that delights every visitor."
              )}
            </p>
            <div className="mt-6">
              <Badge variant="outline" className="text-lg px-6 py-2">
                {t("Pizza, Hampurilaiset, Kebab ja paljon muuta", "Pizza, Burgers, Kebab and much more")}
              </Badge>
            </div>
          </div>
        </div>

        {/* Delivery Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Truck className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-xl font-semibold">
                  {t("Ruoka toimitus Lahti", "Food Delivery Lahti")}
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t(
                  "Etsitkö ruokatoimitusta lähistöltäsi? Kaikilla ei ole taitoa tai aikaa valmistaa maukasta ruokaa.",
                  "Looking for food delivery nearby? Not everyone has the skill or time to prepare delicious food."
                )}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t(
                  "Kun haluat kuninkaallista kohtelua, on Tirvan Kahvila täydellinen vaihtoehto.",
                  "When you want royal treatment, Tirvan Kahvila is the perfect choice."
                )}
              </p>
              <p className="font-medium text-gray-800 dark:text-gray-200">
                {t(
                  'Valitse vain "Toimitus" kassalla, ja ruoka toimitetaan kotiovellesi.',
                  'Just select "Delivery" at checkout, and food will be delivered to your door.'
                )}
              </p>
              
              <div className="mt-6 space-y-2">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {t("Toimituskulut", "Delivery Fees")}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t("Kuljetusalue 0 - 10km", "Delivery area 0 - 10km")}</span>
                    <span className="font-medium">3,00 €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("Kuljetusalue yli 10km", "Delivery area over 10km")}</span>
                    <span className="font-medium">8,00 € ({t("Min. 20,00 €", "Min. €20.00")})</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <MapPin className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-xl font-semibold">
                  {t("Yhteydenotto", "Contact Information")}
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <p className="font-medium">Rauhankatu 19 c</p>
                    <p className="text-gray-600 dark:text-gray-400">15110 Rauhankatu 19 c, 15110</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <a href="tel:+35835899089" className="font-medium text-blue-600 hover:underline">
                    +358-3589-9089
                  </a>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Facebook className="w-5 h-5 text-gray-500" />
                  <a 
                    href="https://fi-fi.facebook.com/tirvankahvila/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Facebook - Tirvan Kahvila
                  </a>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {t("Aukioloajat", "Opening Hours")}
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>{t("Maanantai - Perjantai", "Monday - Friday")}</span>
                    <span>06:00 - 20:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("Lauantai - Sunnuntai", "Saturday - Sunday")}</span>
                    <span>06:00 - 20:00</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}


