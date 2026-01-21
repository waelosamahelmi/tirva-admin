import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { useSupabaseAuth } from "@/lib/supabase-auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LoginModal } from "@/components/login-modal";
import { Logo } from "@/components/logo";
import { 
  Menu, 
  Home, 
  UtensilsCrossed, 
  ShoppingCart, 
  User, 
  Phone,
  MapPin,
  Clock,
  Globe,
  Sun,
  Moon,
  LogOut,
  X,
  Info,
  MessageCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTheme } from "@/lib/theme-context";

export function MobileNav() {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useSupabaseAuth();
  const { totalItems } = useCart();
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setIsNavOpen(false);
  };

  const closeNav = () => setIsNavOpen(false);

  const navItems = [
    {
      href: "/",
      label: t("Etusivu", "Home"),
      icon: Home,
      active: location === "/"
    },
    {
      href: "/about",
      label: t("Meistä", "About"),
      icon: Info,
      active: location === "/about"
    },
    {
      href: "/contact",
      label: t("Yhteystiedot", "Contact"),
      icon: MessageCircle,
      active: location === "/contact"
    },
    {
      href: "/menu",
      label: t("Menu", "Menu"),
      icon: UtensilsCrossed,
      active: location === "/menu"
    }
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" onClick={closeNav}>
              <Logo className="h-12" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant={item.active ? "default" : "ghost"} 
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-1">
              {/* Language Toggle */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLanguage(language === "fi" ? "en" : "fi")}
                className="hidden sm:flex"
              >
                <Globe className="w-4 h-4" />
                <span className="ml-1 hidden md:inline text-xs">{language.toUpperCase()}</span>
              </Button>

              {/* Theme Toggle */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleTheme}
                className="hidden sm:flex"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>

              {/* Cart Button */}
              <Link href="/menu">
                <Button variant="ghost" size="sm" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {totalItems > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500">
                      {totalItems}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* User/Login Button */}
              {user ? (
                <div className="hidden md:flex items-center space-x-1">
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      <User className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowLoginModal(true)}
                  className="hidden md:flex"
                >
                  <User className="w-4 h-4" />
                  <span className="ml-1 hidden lg:inline">{t("Kirjaudu", "Login")}</span>
                </Button>
              )}

              {/* Mobile Menu Trigger */}
              <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      Tirvan Kahvila
                    </SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-4">
                    {/* User Section */}
                    {user ? (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t("Kirjautunut sisään", "Logged in as")}
                        </p>
                        <p className="font-semibold">{user.email}</p>
                        <div className="mt-3 space-y-2">
                          <Link href="/admin" onClick={closeNav}>
                            <Button variant="outline" size="sm" className="w-full">
                              <User className="w-4 h-4 mr-2" />
                              {t("Hallintapaneeli", "Admin Panel")}
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full">
                            <LogOut className="w-4 h-4 mr-2" />
                            {t("Kirjaudu ulos", "Logout")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Button 
                          onClick={() => {
                            setShowLoginModal(true);
                            closeNav();
                          }} 
                          className="w-full"
                        >
                          <User className="w-4 h-4 mr-2" />
                          {t("Kirjaudu sisään", "Login")}
                        </Button>
                      </div>
                    )}

                    {/* Navigation Links */}
                    <nav className="space-y-2">
                      {navItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={closeNav}>
                          <Button 
                            variant={item.active ? "default" : "ghost"} 
                            className="w-full justify-start"
                          >
                            <item.icon className="w-4 h-4 mr-3" />
                            {item.label}
                          </Button>
                        </Link>
                      ))}
                    </nav>

                    {/* Contact Info */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                      <h4 className="font-semibold text-sm">
                        {t("Yhteystiedot", "Contact Info")}
                      </h4>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-green-600" />
                          <a href="tel:+35835899089" className="text-green-600">
                            +358-3589-9089
                          </a>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p>Rauhankatu 19 c</p>
                            <p>15110 Lahti</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div>
                            <p>{t("Ma-Pe: 11:00-22:00", "Mon-Fri: 11:00-22:00")}</p>
                            <p>{t("La-Su: 12:00-23:00", "Sat-Sun: 12:00-23:00")}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                      <h4 className="font-semibold text-sm">
                        {t("Asetukset", "Settings")}
                      </h4>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("Kieli", "Language")}</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLanguage(language === "fi" ? "en" : "fi")}
                        >
                          <Globe className="w-4 h-4 mr-1" />
                          {language.toUpperCase()}
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{t("Teema", "Theme")}</span>
                        <Button variant="outline" size="sm" onClick={toggleTheme}>
                          {theme === "light" ? (
                            <>
                              <Moon className="w-4 h-4 mr-1" />
                              {t("Tumma", "Dark")}
                            </>
                          ) : (
                            <>
                              <Sun className="w-4 h-4 mr-1" />
                              {t("Vaalea", "Light")}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => setShowLoginModal(false)}
      />
    </>
  );
}


