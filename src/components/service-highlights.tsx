import { useLanguage } from "@/lib/language-context";
import { Bike, ShoppingBag, UtensilsCrossed } from "lucide-react";

export function ServiceHighlights() {
  const { t } = useLanguage();

  const services = [
    {
      icon: Bike,
      title: t("Kotiinkuljetus", "Delivery"),
      description: t("Nopea ja luotettava toimitus suoraan ovellesi", "Fast and reliable delivery to your door"),
      color: "text-red-600 bg-red-50",
    },
    {
      icon: ShoppingBag,
      title: t("Nouto", "Pickup"),
      description: t("Tilaa etukäteen ja nouda sopivana aikana", "Order ahead and pickup at your convenience"),
      color: "text-amber-600 bg-amber-50",
    },
    {
      icon: UtensilsCrossed,
      title: t("pizzeriassa", "Dine-in"),
      description: t("Nauti ateriastasi viihtyisässä ympäristössämme", "Enjoy your meal in our cozy atmosphere"),
      color: "text-green-600 bg-green-50",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 ${service.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}



