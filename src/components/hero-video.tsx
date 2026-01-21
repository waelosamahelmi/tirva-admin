import { useLanguage } from "@/lib/language-context";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Play, Phone } from "lucide-react";
import { Link } from "wouter";

export function HeroVideo() {
  const { t } = useLanguage();

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
          poster="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
        >
          <source
            src="https://videos.pexels.com/video-files/4008533/4008533-hd_1366_720_50fps.mp4"
            type="video/mp4"
          />
          {/* Fallback for browsers that don't support video */}
        </video>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          {t("Tirvan Kahvila", "Tirvan Kahvila")}
        </h1>
        
        <p className="text-xl md:text-2xl lg:text-3xl mb-4 opacity-90 font-light">
          {t("Aitoja makuja Suomen sydämestä", "Authentic flavors from the heart of Finland")}
        </p>
        
        <p className="text-lg md:text-xl mb-8 opacity-80 max-w-2xl mx-auto">
          {t(
            "Nautiskele perinteisistä suomalaisista mauista ja tuoreista raaka-aineista valmistetusta ruoasta",
            "Enjoy traditional Finnish flavors and food made from fresh ingredients"
          )}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/menu">
            <Button size="lg" className="text-lg px-8 py-6 bg-red-600 hover:bg-red-700 border-none">
              <UtensilsCrossed className="w-6 h-6 mr-3" />
              {t("Selaa menua", "Browse Menu")}
            </Button>
          </Link>
          
          <Button 
            size="lg" 
            variant="outline" 
            className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20"
            asChild
          >
            <a href="tel:+35835899089">
              <Phone className="w-6 h-6 mr-3" />
              {t("Soita meille", "Call Us")}
            </a>
          </Button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Features Strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-white text-sm">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{t("Tuoreet raaka-aineet", "Fresh Ingredients")}</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{t("Nopea toimitus", "Fast Delivery")}</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>{t("Yli 25 vuotta kokemusta", "25+ Years Experience")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}