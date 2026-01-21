import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Phone } from "lucide-react";

export function Hero() {
  const { t } = useLanguage();

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  };

  // Check if restaurant is currently open (simplified logic)
  const isOpen = () => {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 11 && hour < 21;
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1920&h=1080')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      />

      <div className="relative z-10 text-center text-white max-w-5xl mx-auto px-4">
        <div className="animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {t("Tirvan Kahvila", "Tirvan Kahvila")}
          </h1>
          <p className="text-2xl md:text-3xl mb-4 font-light">
            {t("Tervetuloa!", "Welcome!")}
          </p>
        </div>
        
        <p className="text-xl md:text-2xl mb-8 text-gray-200 animate-slide-up max-w-3xl mx-auto">
          {t(
            "Tuoreista raaka-aineista valmistetut herkut Utin sydämessä - pizza, kebab ja paljon muuta",
            "Delicacies made from fresh ingredients in the heart of Lahti - pizza, kebab and much more"
          )}
        </p>

        {/* Restaurant Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5" />
              <div className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${isOpen() ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium">
                  {isOpen() 
                    ? t("Avoinna", "Open") 
                    : t("Suljettu", "Closed")
                  }
                </span>
                <p className="text-xs text-gray-300">06:00 - 20:00</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
            <div className="flex items-center justify-center space-x-2">
              <MapPin className="w-5 h-5" />
              <div className="text-center">
                <span className="text-sm font-medium block">Pasintie 2</span>
                <p className="text-xs text-gray-300">45410 Utti</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
            <div className="flex items-center justify-center space-x-2">
              <Phone className="w-5 h-5" />
              <div className="text-center">
                <span className="text-sm font-medium block">+358 41 3152619</span>
                <p className="text-xs text-gray-300">{t("Puhelin", "Phone")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-bounce-subtle">
          <Button
            onClick={scrollToMenu}
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-8 transform hover:scale-105 transition-all shadow-2xl"
          >
            {t("?? Tilaa verkossa", "?? Order Online")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={scrollToMenu}
            className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 font-semibold py-4 px-8 transition-all shadow-lg"
          >
            {t("?? Katso menu", "?? View Menu")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={scrollToContact}
            className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white hover:text-gray-900 font-semibold py-4 px-8 transition-all"
          >
            {t("?? Yhteystiedot", "?? Contact")}
          </Button>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
